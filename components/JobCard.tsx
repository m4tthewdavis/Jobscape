import Link from 'next/link'
import type { JobPosting } from '@/types'
import { SourceBadge, StarRating, BCorpBadge } from './badges'

export function JobCard({ job }: { job: JobPosting }) {
  const company = job.company
  const posted = job.posted_at
    ? new Date(job.posted_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
    : null

  return (
    <article className="flex flex-col gap-3 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-5 shadow-sm hover:shadow-md transition-shadow">
      <div className="flex items-start justify-between gap-2">
        <div className="flex flex-col gap-1 min-w-0">
          <Link
            href={`/jobs/${job.id}`}
            className="text-base font-semibold text-zinc-900 dark:text-zinc-50 hover:underline line-clamp-2"
          >
            {job.title}
          </Link>
          <span className="text-sm text-zinc-500 dark:text-zinc-400">{company?.name}</span>
        </div>
        <BCorpBadge />
      </div>

      <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-zinc-500 dark:text-zinc-400">
        {job.location && <span>{job.location}</span>}
        {posted && <span>{posted}</span>}
        {company?.industry && <span className="truncate">{company.industry}</span>}
      </div>

      <div className="flex items-center justify-between gap-2 mt-auto pt-1">
        <div className="flex items-center gap-2">
          <SourceBadge source={job.source} />
          {company?.rating != null && <StarRating rating={company.rating} />}
        </div>
        <a
          href={job.url}
          target="_blank"
          rel="noopener noreferrer"
          className="shrink-0 rounded-lg bg-zinc-900 dark:bg-zinc-50 px-3.5 py-1.5 text-xs font-semibold text-white dark:text-zinc-900 hover:bg-zinc-700 dark:hover:bg-zinc-200 transition-colors"
        >
          Apply →
        </a>
      </div>
    </article>
  )
}
