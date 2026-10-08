CREATE OR REPLACE FUNCTION public.sync_company_certification() RETURNS integer
LANGUAGE sql SET search_path = '' AS $$
  -- Postings whose source is no longer the company's tracked hiring platform
  WITH orphaned AS (
    UPDATE public.job_postings j SET is_active = false
    FROM public.companies c
    WHERE j.company_id = c.id AND j.is_active
      AND c.bcorp_id IS NOT NULL
      AND NOT EXISTS (
        SELECT 1 FROM public.bcorps b
        WHERE b.company_id = c.bcorp_id AND b.ats_provider = j.source)
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
