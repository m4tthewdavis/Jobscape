import Link from 'next/link'

export function SiteHeader() {
  return (
    <header className="border-b border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900">
      <div className="mx-auto max-w-5xl px-4 py-6 flex items-baseline gap-3">
        <Link href="/" className="text-2xl font-bold tracking-tight text-zinc-900 dark:text-zinc-50">
          Jobscape
        </Link>
        <span className="text-sm text-zinc-500 dark:text-zinc-400">Jobs at certified B Corporations</span>
      </div>
    </header>
  )
}

export function SiteFooter() {
  return (
    <footer className="pt-8 text-xs text-zinc-400 dark:text-zinc-500">
      B Corp certification data from the{' '}
      <a href="https://www.kaggle.com/datasets/thedevastator/b-corporation-impact-data" className="underline">
        B Lab Impact Data
      </a>{' '}
      (B Lab, CC BY-SA 4.0, snapshot from 2023). Jobs from companies&apos; public job boards (Greenhouse, Workable, Recruitee, SmartRecruiters). Not affiliated with B Lab.
    </footer>
  )
}
