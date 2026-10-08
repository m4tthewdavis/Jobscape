import { normalizeName } from '../verification/normalize.mjs'
import { htmlToText } from './text.mjs'

const UA = 'Jobscape/0.1 (job aggregator for B Corp roles)'

/** Thrown when a platform asks us to slow down; `retryAfter` is in seconds (null if not given) */
export class RateLimitError extends Error {
  constructor(url, retryAfter) {
    super(`HTTP 429 for ${url}${retryAfter ? ` (retry after ${retryAfter}s)` : ''}`)
    this.name = 'RateLimitError'
    this.host = new URL(url).hostname
    this.retryAfter = retryAfter
  }
}

// Minimum spacing between requests per host (suffix match). Workable's limit is strict and answers
// abuse with a ~24h ban, so it is paced slowly.
const MIN_INTERVAL_MS = { 'apply.workable.com': 1100, 'api.smartrecruiters.com': 150, 'recruitee.com': 100 }
const nextSlot = new Map()

async function pace(host) {
  if (process.env.ATS_NO_PACING) return // tests
  const key = Object.keys(MIN_INTERVAL_MS).find((k) => host === k || host.endsWith(`.${k}`))
  if (!key) return
  const now = Date.now()
  const at = Math.max(now, nextSlot.get(key) ?? 0)
  nextSlot.set(key, at + MIN_INTERVAL_MS[key])
  if (at > now) await new Promise((resolve) => setTimeout(resolve, at - now))
}

/** GET json. Returns null on 404; throws RateLimitError on 429 and Error on other failures so callers can retry later. */
async function getJson(url) {
  await pace(new URL(url).hostname)
  const res = await fetch(url, {
    headers: { 'User-Agent': UA, Accept: 'application/json' },
    signal: AbortSignal.timeout(20000),
  })
  if (res.status === 404) return null
  if (res.status === 429) {
    const retryAfter = Number(res.headers?.get?.('retry-after'))
    throw new RateLimitError(url, Number.isFinite(retryAfter) && retryAfter > 0 ? retryAfter : null)
  }
  if (!res.ok) throw new Error(`HTTP ${res.status} for ${url}`)
  return res.json()
}

const joinPlace = (...parts) => parts.filter(Boolean).join(', ') || undefined

/**
 * Each provider exposes:
 *   boardName(slug)  -> the company name the board reports, or null if no such board / name unknown
 *   fetchJobs(slug)  -> [{ title, url, location?, description?, postedAt? }]
 * Only platforms whose public API reveals the company name can be used: it is the only way to
 * confirm a guessed slug belongs to the right company.
 */
export const PROVIDERS = {
  greenhouse: {
    async boardName(slug) {
      return (await getJson(`https://boards-api.greenhouse.io/v1/boards/${slug}`))?.name ?? null
    },
    async fetchJobs(slug) {
      const data = await getJson(`https://boards-api.greenhouse.io/v1/boards/${slug}/jobs?content=true`)
      if (!data) throw new Error(`greenhouse board ${slug} not found`)
      return data.jobs.map((j) => ({
        title: j.title,
        url: j.absolute_url,
        location: j.location?.name || undefined,
        description: htmlToText(j.content, { escaped: true }),
        postedAt: j.first_published ?? j.updated_at,
      }))
    },
  },

  workable: {
    async boardName(slug) {
      return (await getJson(`https://apply.workable.com/api/v1/widget/accounts/${slug}`))?.name ?? null
    },
    async fetchJobs(slug) {
      const data = await getJson(`https://apply.workable.com/api/v1/widget/accounts/${slug}?details=true`)
      if (!data) throw new Error(`workable account ${slug} not found`)
      return (data.jobs ?? []).map((j) => ({
        title: j.title,
        url: j.url ?? j.shortlink ?? j.application_url,
        location: j.telecommuting ? 'Remote' : joinPlace(j.city, j.state, j.country),
        description: htmlToText(j.description),
        postedAt: j.published_on ?? j.created_at,
      }))
    },
  },

  recruitee: {
    // A board with no open offers can't be name-verified
    async boardName(slug) {
      return (await getJson(`https://${slug}.recruitee.com/api/offers/`))?.offers?.[0]?.company_name ?? null
    },
    async fetchJobs(slug) {
      const data = await getJson(`https://${slug}.recruitee.com/api/offers/`)
      if (!data) throw new Error(`recruitee board ${slug} not found`)
      return (data.offers ?? []).map((o) => ({
        title: o.title,
        url: o.careers_url,
        location: o.location || joinPlace(o.city, o.country),
        description: htmlToText(o.description),
        postedAt: o.published_at ?? o.created_at,
      }))
    },
  },

  smartrecruiters: {
    // The API answers 200 with an empty list for unknown companies, so a name is only known if postings exist
    async boardName(slug) {
      const data = await getJson(`https://api.smartrecruiters.com/v1/companies/${slug}/postings?limit=1`)
      return data?.content?.[0]?.company?.name ?? null
    },
    async fetchJobs(slug) {
      const jobs = []
      for (let offset = 0; ; offset += 100) {
        const data = await getJson(`https://api.smartrecruiters.com/v1/companies/${slug}/postings?limit=100&offset=${offset}`)
        if (!data) throw new Error(`smartrecruiters company ${slug} not found`)
        for (const p of data.content ?? []) {
          jobs.push({
            title: p.name,
            url: `https://jobs.smartrecruiters.com/${p.company?.identifier ?? slug}/${p.id}`,
            location: p.location?.fullLocation || joinPlace(p.location?.city, p.location?.country),
            postedAt: p.releasedDate,
          })
        }
        if (offset + 100 >= (data.totalFound ?? 0)) break
      }
      return jobs
    },
  },
}

export const PROVIDER_NAMES = Object.keys(PROVIDERS)

/** Slugs end up in hostnames/URLs, so accept only plain DNS-label characters */
export function validSlug(slug) {
  return /^[a-z0-9]([a-z0-9-]*[a-z0-9])?$/.test(slug) && slug.length >= 2
}

/** Likely board slugs for a company: domain label, name squashed, name hyphenated */
export function candidateSlugs(row) {
  const out = new Set()
  if (row.domain) out.add(row.domain.split('.')[0])
  const words = row.normalized_name.split(' ')
  out.add(words.join(''))
  out.add(words.join('-'))
  return [...out].filter(validSlug)
}

/** A board belongs to a company only if the names match after normalization */
export function boardMatches(boardName, normalizedName) {
  return Boolean(boardName) && normalizeName(boardName) === normalizedName
}
