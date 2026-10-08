import Link from 'next/link'

const field =
  'rounded-lg border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-900 px-3 py-2 text-sm text-zinc-900 dark:text-zinc-50 placeholder:text-zinc-400 focus:outline-none focus:ring-2 focus:ring-zinc-900 dark:focus:ring-zinc-50'

interface FiltersProps {
  values: { q: string; location: string; country: string; industry: string }
  countries: string[]
  industries: string[]
  hasFilters: boolean
}

export function Filters({ values, countries, industries, hasFilters }: FiltersProps) {
  return (
    <form method="GET" className="flex flex-wrap gap-2">
      <input name="q" defaultValue={values.q} placeholder="Search job titles…" aria-label="Search" className={`${field} flex-1 min-w-48`} />
      <input name="location" defaultValue={values.location} placeholder="Location…" aria-label="Location" className={`${field} w-40`} />
      <select name="country" defaultValue={values.country} aria-label="Company country" className={`${field} max-w-44`}>
        <option value="">All countries</option>
        {countries.map((c) => <option key={c} value={c}>{c}</option>)}
      </select>
      <select name="industry" defaultValue={values.industry} aria-label="Industry" className={`${field} max-w-52`}>
        <option value="">All industries</option>
        {industries.map((i) => <option key={i} value={i}>{i}</option>)}
      </select>
      <button
        type="submit"
        className="rounded-lg bg-zinc-900 dark:bg-zinc-50 px-4 py-2 text-sm font-semibold text-white dark:text-zinc-900 hover:bg-zinc-700 dark:hover:bg-zinc-200 transition-colors"
      >
        Search
      </button>
      {hasFilters && (
        <Link
          href="/"
          className="rounded-lg border border-zinc-300 dark:border-zinc-700 px-4 py-2 text-sm text-zinc-600 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors"
        >
          Clear
        </Link>
      )}
    </form>
  )
}
