import Link from 'next/link'

interface PaginationProps {
  page: number
  pageCount: number
  params: Record<string, string>
}

export function Pagination({ page, pageCount, params }: PaginationProps) {
  if (pageCount <= 1) return null

  const href = (p: number) => {
    const qs = new URLSearchParams(params)
    if (p > 1) qs.set('page', String(p))
    const s = qs.toString()
    return s ? `/?${s}` : '/'
  }
  const link = 'rounded-lg border border-zinc-300 dark:border-zinc-700 px-3 py-1.5 text-sm text-zinc-700 dark:text-zinc-200 hover:bg-zinc-100 dark:hover:bg-zinc-800'
  const disabled = 'rounded-lg border border-zinc-200 dark:border-zinc-800 px-3 py-1.5 text-sm text-zinc-300 dark:text-zinc-600'

  return (
    <nav aria-label="Pagination" className="flex items-center justify-between pt-2">
      {page > 1 ? <Link href={href(page - 1)} className={link}>← Previous</Link> : <span className={disabled}>← Previous</span>}
      <span className="text-sm text-zinc-500 dark:text-zinc-400">Page {page} of {pageCount}</span>
      {page < pageCount ? <Link href={href(page + 1)} className={link}>Next →</Link> : <span className={disabled}>Next →</span>}
    </nav>
  )
}
