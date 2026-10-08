export function StarRating({ rating }: { rating: number }) {
  const full = Math.floor(rating)
  const half = rating - full >= 0.5
  return (
    <span className="flex items-center gap-0.5" aria-label={`${rating} out of 5 stars`}>
      {Array.from({ length: 5 }, (_, i) => {
        if (i < full) return <span key={i} className="text-amber-400 text-sm">★</span>
        if (i === full && half) return <span key={i} className="text-amber-400 text-sm">½</span>
        return <span key={i} className="text-zinc-300 dark:text-zinc-600 text-sm">★</span>
      })}
      <span className="ml-1 text-xs text-zinc-500">{rating.toFixed(1)}</span>
    </span>
  )
}

export function SourceBadge({ source }: { source: string }) {
  const label = source.charAt(0).toUpperCase() + source.slice(1)
  return (
    <span className="inline-flex items-center rounded-full bg-zinc-100 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-300 px-2 py-0.5 text-xs font-medium">
      {label}
    </span>
  )
}

export function BCorpBadge() {
  return (
    <span className="shrink-0 inline-flex items-center gap-1 rounded-full bg-emerald-50 dark:bg-emerald-950 px-2.5 py-1 text-xs font-semibold text-emerald-700 dark:text-emerald-300">
      <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20" aria-hidden="true">
        <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.857-9.809a.75.75 0 00-1.214-.882l-3.483 4.79-1.88-1.88a.75.75 0 10-1.06 1.061l2.5 2.5a.75.75 0 001.137-.089l4-5.5z" clipRule="evenodd" />
      </svg>
      B Corp
    </span>
  )
}
