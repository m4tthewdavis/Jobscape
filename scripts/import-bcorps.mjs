// Usage: node --env-file=.env.local scripts/import-bcorps.mjs [path/to/bcorp-impact-data.csv]
import { readFileSync } from 'node:fs'
import { parse } from 'csv-parse/sync'
import { createClient } from '@supabase/supabase-js'
import { normalizeName, extractDomain } from '../lib/verification/normalize.mjs'

const file = process.argv[2] ?? 'data/bcorp-impact-data.csv'
const rows = parse(readFileSync(file, 'utf-8').replace(/^﻿/, ''), { columns: true, skip_empty_lines: true })

// One row per certification cycle -> keep the most recent per company
const latest = new Map()
for (const r of rows) {
  const prev = latest.get(r.company_id)
  if (!prev || (r.date_certified ?? '') > (prev.date_certified ?? '')) latest.set(r.company_id, r)
}

const records = [...latest.values()].map((r) => ({
  company_id: r.company_id,
  name: r.company_name,
  normalized_name: normalizeName(r.company_name),
  website: r.website || null,
  domain: extractDomain(r.website),
  status: r.current_status,
  date_first_certified: r.date_first_certified || null,
  date_certified: r.date_certified || null,
  country: r.country || null,
  city: r.city || null,
  industry: r.industry || null,
  profile_url: r.b_corp_profile || null,
}))

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY)
for (let i = 0; i < records.length; i += 500) {
  const { error } = await supabase.from('bcorps').upsert(records.slice(i, i + 500), { onConflict: 'company_id' })
  if (error) throw new Error(error.message)
}
const certified = records.filter((r) => r.status === 'certified').length
console.log(`Imported ${records.length} companies (${certified} certified, ${records.length - certified} de-certified)`)
