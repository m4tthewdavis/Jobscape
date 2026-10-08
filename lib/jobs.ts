import { supabase } from '@/lib/supabase'
import type { JobPosting } from '@/types'
import { sanitizeSearch } from '@/lib/search.mjs'

export const PAGE_SIZE = 20

export interface JobFilters {
  q?: string
  location?: string
  source?: string
  country?: string
  industry?: string
  minRating?: number
  page?: number
}

export interface JobsPage {
  jobs: JobPosting[]
  total: number
  page: number
  pageCount: number
}

export async function queryJobs(filters: JobFilters): Promise<JobsPage> {
  const page = Math.max(1, Math.floor(filters.page ?? 1) || 1)
  const from = (page - 1) * PAGE_SIZE

  let query = supabase
    .from('job_postings')
    .select('*, company:companies!inner(*)', { count: 'exact' })
    .eq('is_active', true)
    .eq('companies.bcorp_status', true)
    .order('posted_at', { ascending: false, nullsFirst: false })
    .order('id')
    .range(from, from + PAGE_SIZE - 1)

  const q = sanitizeSearch(filters.q)
  const location = sanitizeSearch(filters.location)
  if (q) query = query.or(`title.ilike.%${q}%,description.ilike.%${q}%`)
  if (location) query = query.ilike('location', `%${location}%`)
  if (filters.source) query = query.eq('source', filters.source)
  if (filters.country) query = query.eq('companies.country', filters.country)
  if (filters.industry) query = query.eq('companies.industry', filters.industry)
  if (filters.minRating != null) query = query.gte('companies.rating', filters.minRating)

  const { data, error, count } = await query
  if (error) throw new Error(error.message)

  const total = count ?? 0
  return {
    jobs: (data ?? []) as JobPosting[],
    total,
    page,
    pageCount: Math.max(1, Math.ceil(total / PAGE_SIZE)),
  }
}

export async function getJob(id: string): Promise<JobPosting | null> {
  const { data, error } = await supabase
    .from('job_postings')
    .select('*, company:companies!inner(*)')
    .eq('id', id)
    .eq('is_active', true)
    .eq('companies.bcorp_status', true)
    .maybeSingle()
  if (error) return null // includes malformed ids
  return (data as JobPosting | null) ?? null
}

export async function getFacets(): Promise<{ countries: string[]; industries: string[] }> {
  const { data } = await supabase.from('companies').select('country, industry').eq('bcorp_status', true)
  const uniq = (xs: (string | null | undefined)[]) =>
    [...new Set(xs.filter((x): x is string => Boolean(x)))].sort((a, b) => a.localeCompare(b))
  return {
    countries: uniq((data ?? []).map((r) => r.country)),
    industries: uniq((data ?? []).map((r) => r.industry)),
  }
}
