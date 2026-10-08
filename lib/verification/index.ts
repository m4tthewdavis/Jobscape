import { checkBCorpStatus } from './bcorp'
import { getCompanyRating } from './ratings'
import { Company } from '@/types'

export interface VerificationResult {
  passes: boolean
  bcorp_id: string | null
  bcorp_status: boolean
  bcorp_verified_at: string | null
  rating: number | null
  rating_source: string | null
  rating_verified_at: string | null
}

/**
 * Run B Corp + rating checks for a company.
 * A company passes if it is B Corp certified. The rating is informational:
 * stored when a real provider returns one, null otherwise.
 */
export async function verifyCompany(
  companyName: string,
  bcorpId?: string
): Promise<VerificationResult> {
  const [bcorp, ratingResult] = await Promise.all([
    checkBCorpStatus(companyName, bcorpId),
    getCompanyRating(companyName),
  ])

  return {
    passes: bcorp.isCertified,
    bcorp_id: bcorp.bcorpId,
    bcorp_status: bcorp.isCertified,
    bcorp_verified_at: bcorp.verifiedAt,
    rating: ratingResult.rating,
    rating_source: ratingResult.source,
    rating_verified_at: ratingResult.verifiedAt,
  }
}

/** Returns true if cached company data still passes the filter */
export function companyPassesFilter(company: Company): boolean {
  return company.bcorp_status
}
