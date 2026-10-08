import { ScrapedJob } from '@/types'

export interface Scraper {
  name: string
  scrape(query?: string): Promise<ScrapedJob[]>
}

export { AtsScraper } from './ats'

export interface ScrapeResult {
  jobs: ScrapedJob[]
  /** B Lab record ids whose job feed was fetched completely (safe to treat missing postings as removed) */
  coveredBcorpIds: Set<string>
  failedBoards: number
}

export async function runAllScrapers(query?: string): Promise<ScrapeResult> {
  const { AtsScraper } = await import('./ats')

  const ats = new AtsScraper()
  const scrapers: Scraper[] = [ats]

  const results = await Promise.allSettled(
    scrapers.map((s) => s.scrape(query))
  )

  const jobs: ScrapedJob[] = []
  for (const result of results) {
    if (result.status === 'fulfilled') {
      jobs.push(...result.value)
    } else {
      console.error('Scraper failed:', result.reason)
    }
  }

  return { jobs, coveredBcorpIds: ats.coveredBcorpIds, failedBoards: ats.failedBoards }
}
