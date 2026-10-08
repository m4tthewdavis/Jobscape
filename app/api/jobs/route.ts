import { NextRequest, NextResponse } from 'next/server'
import { queryJobs } from '@/lib/jobs'

/**
 * GET /api/jobs
 * Returns active job postings at B Corp certified companies, 20 per page.
 *
 * Query params:
 *   q          – search term (title / description)
 *   location   – filter by job location string
 *   source     – filter by source (e.g. greenhouse)
 *   country    – company country
 *   industry   – company industry
 *   min_rating – only companies with a real rating >= this value
 *   page       – 1-based page number (default 1)
 */
export async function GET(req: NextRequest) {
  const p = req.nextUrl.searchParams
  const minRating = p.get('min_rating')

  try {
    const result = await queryJobs({
      q: p.get('q') ?? undefined,
      location: p.get('location') ?? undefined,
      source: p.get('source') ?? undefined,
      country: p.get('country') ?? undefined,
      industry: p.get('industry') ?? undefined,
      minRating: minRating && !Number.isNaN(Number(minRating)) ? Number(minRating) : undefined,
      page: Number(p.get('page') ?? 1),
    })
    return NextResponse.json(result)
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 })
  }
}
