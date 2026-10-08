/**
 * B Corp verification against the imported B Lab impact dataset (`bcorps` table,
 * loaded by scripts/import-bcorps.mjs). Lookup is by B Lab record id when known
 * (exact), otherwise by normalized name.
 */
import { createServiceClient } from '@/lib/supabase-admin'
import { normalizeName } from './normalize.mjs'

export interface BCorpResult {
  isCertified: boolean
  verifiedAt: string | null
  bcorpId: string | null
}

function mockBCorp(companyName: string): BCorpResult {
  if (process.env.NODE_ENV === 'production') {
    throw new Error('BCORP_PROVIDER=mock is not allowed in production')
  }
  const seed = companyName.split('').reduce((a, c) => a + c.charCodeAt(0), 0)
  return {
    isCertified: seed % 3 !== 0, // ~67% certified
    verifiedAt: new Date().toISOString(),
    bcorpId: null,
  }
}

export async function checkBCorpStatus(companyName: string, bcorpId?: string): Promise<BCorpResult> {
  if (process.env.BCORP_PROVIDER === 'mock') {
    return mockBCorp(companyName)
  }

  let query = createServiceClient().from('bcorps').select('company_id, status, date_certified')
  if (bcorpId) {
    query = query.eq('company_id', bcorpId)
  } else {
    const normalized = normalizeName(companyName)
    if (!normalized) return { isCertified: false, verifiedAt: null, bcorpId: null }
    query = query.eq('normalized_name', normalized)
  }

  const { data, error } = await query
  if (error) throw new Error(`bcorps lookup failed: ${error.message}`)

  const certified = data?.find((r) => r.status === 'certified')
  return {
    isCertified: Boolean(certified),
    verifiedAt: certified?.date_certified ?? null,
    bcorpId: certified?.company_id ?? null,
  }
}
