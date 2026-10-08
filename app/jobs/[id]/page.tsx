import Link from 'next/link'
import { notFound } from 'next/navigation'
import { getJob } from '@/lib/jobs'
import { BCorpBadge, SourceBadge, StarRating } from '@/components/badges'
import { SiteHeader, SiteFooter } from '@/components/SiteChrome'

export const instant = false

export default async function JobPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const job = await getJob(id)
  if (!job) notFound()

  const company = job.company
  const posted = job.posted_at ? new Date(job.posted_at).toLocaleDateString('en-US', { dateStyle: 'medium' }) : null
  const certified = company?.bcorp_verified_at
    ? new Date(company.bcorp_verified_at).toLocaleDateString('en-US', { year: 'numeric', month: 'short' })
    : null
  const place = [company?.city, company?.country].filter(Boolean).join(', ')

  return (
    <div className="min-h-screen bg-zinc-50 dark:bg-zinc-950">
      <SiteHeader />
      <main className="mx-auto max-w-5xl px-4 py-8 space-y-6">
        <Link href="/" className="text-sm text-zinc-500 dark:text-zinc-400 hover:underline">← All jobs</Link>

        <div className="grid gap-6 md:grid-cols-[1fr_280px]">
          <article className="space-y-4 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-6">
            <h1 className="text-2xl font-bold tracking-tight text-zinc-900 dark:text-zinc-50">{job.title}</h1>
            <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-zinc-500 dark:text-zinc-400">
              <span className="font-medium text-zinc-700 dark:text-zinc-200">{company?.name}</span>
              {job.location && <span>{job.location}</span>}
              {posted && <span>Posted {posted}</span>}
              <SourceBadge source={job.source} />
            </div>
            <a
              href={job.url}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-block rounded-lg bg-zinc-900 dark:bg-zinc-50 px-4 py-2 text-sm font-semibold text-white dark:text-zinc-900 hover:bg-zinc-700 dark:hover:bg-zinc-200 transition-colors"
            >
              Apply on {job.source.charAt(0).toUpperCase() + job.source.slice(1)} →
            </a>
            {job.description && (
              <p className="whitespace-pre-line pt-2 text-sm leading-7 text-zinc-700 dark:text-zinc-300">{job.description}</p>
            )}
          </article>

          <aside className="h-fit space-y-3 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-5 text-sm">
            <BCorpBadge />
            <h2 className="text-base font-semibold text-zinc-900 dark:text-zinc-50">{company?.name}</h2>
            <dl className="space-y-2 text-zinc-600 dark:text-zinc-400">
              {company?.industry && <div><dt className="text-xs uppercase tracking-wide text-zinc-400">Industry</dt><dd>{company.industry}</dd></div>}
              {place && <div><dt className="text-xs uppercase tracking-wide text-zinc-400">Headquarters</dt><dd>{place}</dd></div>}
              {certified && <div><dt className="text-xs uppercase tracking-wide text-zinc-400">Certification on record</dt><dd>{certified}</dd></div>}
              {company?.rating != null && <div><dt className="text-xs uppercase tracking-wide text-zinc-400">Rating</dt><dd><StarRating rating={company.rating} /></dd></div>}
            </dl>
            {company?.website && (
              <a href={company.website} target="_blank" rel="noopener noreferrer" className="inline-block text-zinc-900 dark:text-zinc-50 underline">
                Company website
              </a>
            )}
          </aside>
        </div>

        <SiteFooter />
      </main>
    </div>
  )
}
