import { createHash, timingSafeEqual } from 'node:crypto'
import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase-admin'
import { runAllScrapers } from '@/lib/scrapers'
import { verifyCompany } from '@/lib/verification'
import { ScrapedJob } from '@/types'

const sha256 = (s: string) => createHash('sha256').update(s).digest()

function isAuthorized(req: NextRequest): boolean {
  const expected = process.env.SCRAPE_SECRET
  const provided = req.headers.get('x-scrape-secret')
  if (!expected || !provided) return false
  return timingSafeEqual(sha256(provided), sha256(expected))
}

const chunk = <T,>(xs: T[], n: number): T[][] =>
  Array.from({ length: Math.ceil(xs.length / n) }, (_, i) => xs.slice(i * n, i * n + n))

/**
 * POST /api/scrape
 * Triggers a full scrape → verify → persist cycle.
 * Protected by a shared secret (SCRAPE_SECRET env var).
 *
 * Body (optional): { query: string } — only keep jobs whose title contains it
 */
export async function POST(req: NextRequest) {
  if (!isAuthorized(req)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const body = await req.json().catch(() => ({}))
  const query: string | undefined = body.query || undefined

  const supabaseAdmin = createServiceClient()

  const { data: run, error: runError } = await supabaseAdmin
    .from('scrape_runs')
    .insert({ source: 'all', status: 'running' })
    .select()
    .single()

  if (runError) {
    return NextResponse.json({ error: runError.message }, { status: 500 })
  }

  try {
    const { jobs: scraped, coveredBcorpIds, failedBoards } = await runAllScrapers(query)
    let inserted = 0

    // One verification + one company upsert per company per run; a failure only skips that company
    const companies = new Map<string, Promise<string | null>>()
    const resolveCompany = (job: ScrapedJob): Promise<string | null> => {
      const key = job.company_bcorp_id ?? job.company_name
      let id = companies.get(key)
      if (!id) {
        id = (async () => {
          try {
            const verification = await verifyCompany(job.company_name, job.company_bcorp_id)
            if (!verification.passes) return null
            const { data: company, error } = await supabaseAdmin
              .from('companies')
              .upsert(
                {
                  name: job.company_name,
                  website: job.company_website ?? null,
                  bcorp_id: verification.bcorp_id,
                  country: job.company_country ?? null,
                  city: job.company_city ?? null,
                  industry: job.company_industry ?? null,
                  bcorp_status: verification.bcorp_status,
                  bcorp_verified_at: verification.bcorp_verified_at,
                  rating: verification.rating,
                  rating_source: verification.rating_source,
                  rating_verified_at: verification.rating_verified_at,
                },
                { onConflict: 'name' }
              )
              .select('id')
              .single()
            if (error) throw new Error(error.message)
            return company.id as string
          } catch (err) {
            console.error(`Skipping company "${job.company_name}":`, err)
            return null
          }
        })()
        companies.set(key, id)
      }
      return id
    }

    for (const job of scraped) {
      const companyId = await resolveCompany(job)
      if (!companyId) continue

      const { error: jobError } = await supabaseAdmin
        .from('job_postings')
        .upsert(
          {
            company_id: companyId,
            title: job.title,
            description: job.description ?? null,
            location: job.location ?? null,
            url: job.url,
            source: job.source,
            posted_at: job.posted_at ?? null,
            is_active: true,
          },
          { onConflict: 'url' }
        )

      if (jobError) console.error(`Job upsert failed for ${job.url}:`, jobError.message)
      else inserted++
    }

    // Deactivate postings that disappeared from a fully-fetched feed. Skipped for
    // filtered runs, which only return a subset of each feed.
    let deactivated = 0
    if (!query && coveredBcorpIds.size) {
      const scrapedUrls = new Set(scraped.map((j) => j.url))
      for (const ids of chunk([...coveredBcorpIds], 100)) {
        const { data: rows } = await supabaseAdmin.from('companies').select('id').in('bcorp_id', ids)
        for (const { id: companyId } of rows ?? []) {
          const stale: string[] = []
          for (let from = 0; ; from += 1000) {
            const { data: active } = await supabaseAdmin
              .from('job_postings')
              .select('id, url')
              .eq('company_id', companyId)
              .eq('is_active', true)
              .order('id')
              .range(from, from + 999)
            stale.push(...(active ?? []).filter((j) => !scrapedUrls.has(j.url)).map((j) => j.id))
            if ((active?.length ?? 0) < 1000) break
          }
          for (const group of chunk(stale, 100)) {
            await supabaseAdmin.from('job_postings').update({ is_active: false }).in('id', group)
            deactivated += group.length
          }
        }
      }
    }

    // Hide companies that are no longer certified in the imported B Lab data
    const { data: decertified } = await supabaseAdmin.rpc('sync_company_certification')

    await supabaseAdmin
      .from('scrape_runs')
      .update({
        status: 'completed',
        jobs_found: scraped.length,
        jobs_inserted: inserted,
        error: failedBoards ? `${failedBoards} job board(s) could not be fetched` : null,
        completed_at: new Date().toISOString(),
      })
      .eq('id', run.id)

    return NextResponse.json({
      message: 'Scrape complete',
      jobs_found: scraped.length,
      jobs_inserted: inserted,
      jobs_deactivated: deactivated,
      companies_decertified: decertified ?? 0,
      boards_failed: failedBoards,
    })
  } catch (err) {
    await supabaseAdmin
      .from('scrape_runs')
      .update({
        status: 'failed',
        error: String(err),
        completed_at: new Date().toISOString(),
      })
      .eq('id', run.id)

    return NextResponse.json({ error: String(err) }, { status: 500 })
  }
}
