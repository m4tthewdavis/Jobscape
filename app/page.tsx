import { getFacets, queryJobs } from '@/lib/jobs'
import { JobCard } from '@/components/JobCard'
import { Filters } from '@/components/Filters'
import { Pagination } from '@/components/Pagination'
import { SiteHeader, SiteFooter } from '@/components/SiteChrome'

export const instant = false

function EmptyState({ hasFilters }: { hasFilters: boolean }) {
  return (
    <div className="col-span-full flex flex-col items-center justify-center py-24 text-center gap-4">
      <div className="text-5xl">🌱</div>
      <h2 className="text-xl font-semibold text-zinc-800 dark:text-zinc-200">
        {hasFilters ? 'No jobs match your search' : 'No jobs yet'}
      </h2>
      <p className="max-w-sm text-sm text-zinc-500 dark:text-zinc-400">
        {hasFilters
          ? 'Try different keywords or clear your filters.'
          : 'Trigger a scrape to pull the latest openings from certified B Corporations.'}
      </p>
    </div>
  )
}

const first = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v) ?? ''

export default async function Home({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const raw = await searchParams
  const filters = {
    q: first(raw.q),
    location: first(raw.location),
    country: first(raw.country),
    industry: first(raw.industry),
  }
  const page = Number(first(raw.page)) || 1
  const hasFilters = Object.values(filters).some(Boolean)

  const [{ jobs, total, pageCount, page: current }, facets] = await Promise.all([
    queryJobs({ ...filters, page }),
    getFacets(),
  ])

  const activeParams = Object.fromEntries(Object.entries(filters).filter(([, v]) => v))

  return (
    <div className="min-h-screen bg-zinc-50 dark:bg-zinc-950">
      <SiteHeader />
      <main className="mx-auto max-w-5xl px-4 py-8 space-y-6">
        <Filters values={filters} countries={facets.countries} industries={facets.industries} hasFilters={hasFilters} />

        {total > 0 && (
          <p className="text-sm text-zinc-500 dark:text-zinc-400">
            {total} {total === 1 ? 'job' : 'jobs'} found
          </p>
        )}

        <div className="grid gap-4 sm:grid-cols-2">
          {jobs.length > 0 ? jobs.map((job) => <JobCard key={job.id} job={job} />) : <EmptyState hasFilters={hasFilters} />}
        </div>

        <Pagination page={current} pageCount={pageCount} params={activeParams} />
        <SiteFooter />
      </main>
    </div>
  )
}
