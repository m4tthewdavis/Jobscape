import { createServiceClient } from '@/lib/supabase-admin'
import { PROVIDERS } from '@/lib/ats/providers.mjs'
import { ScrapedJob } from '@/types'
import { Scraper } from './index'

const CONCURRENCY = 8

/**
 * Pulls jobs from the public job boards (Greenhouse, Workable, Recruitee, SmartRecruiters) of
 * certified B Corps, as detected by scripts/detect-ats.mjs.
 */
export class AtsScraper implements Scraper {
  name = 'ats'
  /** B Lab record ids whose board was fetched completely in the last run */
  coveredBcorpIds = new Set<string>()
  failedBoards = 0

  async scrape(query?: string): Promise<ScrapedJob[]> {
    const { data: companies, error } = await createServiceClient()
      .from('bcorps')
      .select('company_id, name, website, country, city, industry, ats_provider, ats_slug')
      .eq('status', 'certified')
      .not('ats_provider', 'is', null)
      .limit(5000)
    if (error) throw new Error(`bcorps lookup failed: ${error.message}`)

    this.coveredBcorpIds = new Set()
    this.failedBoards = 0
    const q = query?.toLowerCase()
    const jobs: ScrapedJob[] = []
    const queue = [...(companies ?? [])]

    await Promise.all(
      Array.from({ length: CONCURRENCY }, async () => {
        for (let c = queue.shift(); c; c = queue.shift()) {
          try {
            const provider = PROVIDERS[c.ats_provider]
            if (!provider) throw new Error(`unknown provider ${c.ats_provider}`)
            const boardJobs = await provider.fetchJobs(c.ats_slug)
            this.coveredBcorpIds.add(c.company_id)
            for (const j of boardJobs) {
              if (!j.title || !j.url || (q && !j.title.toLowerCase().includes(q))) continue
              jobs.push({
                title: j.title,
                company_name: c.name,
                company_bcorp_id: c.company_id,
                company_website: c.website ? `https://${c.website.replace(/^https?:\/\//, '')}` : undefined,
                company_country: c.country ?? undefined,
                company_city: c.city ?? undefined,
                company_industry: c.industry ?? undefined,
                location: j.location,
                url: j.url,
                description: j.description,
                posted_at: j.postedAt,
                source: c.ats_provider,
              })
            }
          } catch (err) {
            this.failedBoards++
            console.error(`${c.ats_provider} board "${c.ats_slug}" failed:`, err)
          }
        }
      })
    )
    return jobs
  }
}
