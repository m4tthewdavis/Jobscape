CREATE OR REPLACE FUNCTION public.sync_company_certification() RETURNS integer
LANGUAGE sql SET search_path = '' AS $$
  -- Greenhouse postings of companies whose board is no longer tracked (e.g. detection was tightened)
  WITH orphaned AS (
    UPDATE public.job_postings j SET is_active = false
    FROM public.companies c
    WHERE j.company_id = c.id AND j.source = 'greenhouse' AND j.is_active
      AND c.bcorp_id IS NOT NULL
      AND NOT EXISTS (
        SELECT 1 FROM public.bcorps b
        WHERE b.company_id = c.bcorp_id AND b.ats_provider = 'greenhouse')
    RETURNING 1
  ), updated AS (
    UPDATE public.companies c SET bcorp_status = false
    WHERE c.bcorp_status
      AND (c.bcorp_id IS NULL OR NOT EXISTS (
        SELECT 1 FROM public.bcorps b WHERE b.company_id = c.bcorp_id AND b.status = 'certified'))
    RETURNING 1
  )
  SELECT count(*)::int FROM updated
$$;
REVOKE EXECUTE ON FUNCTION public.sync_company_certification() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.sync_company_certification() TO service_role;
