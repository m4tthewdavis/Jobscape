// Finds each certified B Corp's public job board on supported hiring platforms
// (see lib/ats/providers.mjs). Resumable: only checks platforms not yet checked for a company.
// Usage: node --env-file=.env.local scripts/detect-ats.mjs [--limit N] [--recheck]
import { createClient } from '@supabase/supabase-js'
import { PROVIDERS, PROVIDER_NAMES, RateLimitError, candidateSlugs, boardMatches } from '../lib/ats/providers.mjs'

const limit = Number(process.argv[process.argv.indexOf('--limit') + 1]) || Infinity
const recheck = process.argv.includes('--recheck')
const CONCURRENCY = 6
// Short or non-unique names can't be trusted to identify one company
const MIN_NAME_LENGTH = 4

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY)

// Platforms that told us to slow down are skipped for the rest of the run; companies stay
// unchecked for them so a later run picks them up. Other errors leave the company unchecked.
const disabled = new Map()

async function detect(row, providers) {
  const slugs = candidateSlugs(row)
  const completed = []
  for (const provider of providers) {
    if (disabled.has(provider)) continue
    try {
      for (const slug of slugs) {
        if (boardMatches(await PROVIDERS[provider].boardName(slug), row.normalized_name)) {
          return { hit: { provider, slug }, completed: [...completed, provider] }
        }
      }
      completed.push(provider)
    } catch (err) {
      if (!(err instanceof RateLimitError)) throw err
      if (!disabled.has(provider)) {
        disabled.set(provider, err.retryAfter)
        const hours = err.retryAfter ? ` for ~${Math.round(err.retryAfter / 3600)}h` : ''
        console.error(`${provider} is rate limiting us${hours}: skipping it for this run`)
      }
    }
  }
  return { hit: null, completed }
}

async function ambiguousNames() {
  const counts = new Map()
  for (let from = 0; ; from += 1000) {
    const { data, error } = await supabase.from('bcorps').select('normalized_name').eq('status', 'certified').order('company_id').range(from, from + 999)
    if (error) throw new Error(error.message)
    for (const r of data) counts.set(r.normalized_name, (counts.get(r.normalized_name) ?? 0) + 1)
    if (data.length < 1000) break
  }
  return new Set([...counts].filter(([, n]) => n > 1).map(([name]) => name))
}

const ambiguous = await ambiguousNames()
const stats = { done: 0, found: 0, errors: 0 }
const foundByProvider = {}

// returns true if the row was updated; false if nothing could be checked or it hit an error
async function processRow(row) {
  const checked = recheck ? [] : row.ats_checked_providers ?? []
  const toCheck = PROVIDER_NAMES.filter((p) => !checked.includes(p))
  let result = { hit: null, completed: [] }
  if (row.normalized_name.length >= MIN_NAME_LENGTH && !ambiguous.has(row.normalized_name)) {
    try {
      result = await detect(row, toCheck)
    } catch (err) {
      stats.errors++
      console.error(`${row.normalized_name}: ${err.message}`)
      return false
    }
  } else {
    result.completed = toCheck // can never match: nothing to retry later
  }
  const { hit, completed } = result
  if (!hit && !completed.length) return false

  const update = {
    ats_checked_providers: [...new Set([...checked, ...completed])],
    ats_checked_at: new Date().toISOString(),
  }
  if (hit) Object.assign(update, { ats_provider: hit.provider, ats_slug: hit.slug })
  else if (recheck && completed.length === PROVIDER_NAMES.length) Object.assign(update, { ats_provider: null, ats_slug: null })
  const { error } = await supabase.from('bcorps').update(update).eq('company_id', row.company_id)
  if (error) throw new Error(error.message)
  if (hit) {
    stats.found++
    foundByProvider[hit.provider] = (foundByProvider[hit.provider] ?? 0) + 1
  }
  return true
}

// Keyset pagination: companies skipped (rate-limited platform) stay selectable but are only visited once per run
let lastId = ''
while (stats.done + stats.errors < limit) {
  let q = supabase.from('bcorps').select('company_id,normalized_name,domain,ats_checked_providers').eq('status', 'certified').gt('company_id', lastId).order('company_id')
  if (!recheck) q = q.is('ats_provider', null).not('ats_checked_providers', 'cs', `{${PROVIDER_NAMES.join(',')}}`)
  const { data: rows, error } = await q.limit(Math.min(1000, limit - stats.done - stats.errors))
  if (error) throw new Error(error.message)
  if (!rows.length) break
  lastId = rows[rows.length - 1].company_id

  const queue = [...rows]
  await Promise.all(
    Array.from({ length: CONCURRENCY }, async () => {
      while (queue.length) {
        if (await processRow(queue.shift()) && ++stats.done % 200 === 0) {
          console.log(`${stats.done} processed, ${stats.found} boards found`)
        }
      }
    })
  )
}

console.log(`Done: ${stats.done} processed, ${stats.found} new boards found`, foundByProvider, `${stats.errors} errors (will retry)`)
if (disabled.size) console.log('Skipped (rate limited):', [...disabled.keys()].join(', '), '- re-run later to check them')
