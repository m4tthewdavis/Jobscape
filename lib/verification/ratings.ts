/**
 * Company rating lookup.
 *
 * Glassdoor and Indeed require API partnerships for programmatic access.
 * This module provides a consistent interface — swap the implementation
 * when you have API credentials.
 *
 * For now it returns null (unknown) so no jobs are silently dropped.
 * Set RATINGS_PROVIDER=mock in .env.local to use seeded mock data for dev.
 */

export interface RatingResult {
  rating: number | null
  source: string | null
  verifiedAt: string | null
}

/** Placeholder — replace with real Glassdoor/Indeed API call */
async function fetchFromProvider(companyName: string): Promise<RatingResult> {
  // TODO: integrate Glassdoor Employer API or Indeed Publisher API
  void companyName
  return { rating: null, source: null, verifiedAt: null }
}

function mockRating(companyName: string): RatingResult {
  // Deterministic fake rating for local development
  const seed = companyName.split('').reduce((a, c) => a + c.charCodeAt(0), 0)
  const rating = Number(((seed % 20) / 10 + 3).toFixed(1)) // 3.0 – 5.0
  return {
    rating,
    source: 'mock',
    verifiedAt: new Date().toISOString(),
  }
}

export async function getCompanyRating(companyName: string): Promise<RatingResult> {
  if (process.env.RATINGS_PROVIDER === 'mock') {
    if (process.env.NODE_ENV === 'production') {
      throw new Error('RATINGS_PROVIDER=mock is not allowed in production')
    }
    return mockRating(companyName)
  }
  return fetchFromProvider(companyName)
}
