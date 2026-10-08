export interface BoardJob {
  title: string
  url: string
  location?: string
  description?: string
  postedAt?: string
}
export interface Provider {
  boardName(slug: string): Promise<string | null>
  fetchJobs(slug: string): Promise<BoardJob[]>
}
export const PROVIDERS: Record<string, Provider>
export const PROVIDER_NAMES: string[]
export function validSlug(slug: string): boolean
export function candidateSlugs(row: { domain?: string | null; normalized_name: string }): string[]
export function boardMatches(boardName: string | null | undefined, normalizedName: string): boolean
export class RateLimitError extends Error {
  host: string
  retryAfter: number | null
  constructor(url: string, retryAfter: number | null)
}
