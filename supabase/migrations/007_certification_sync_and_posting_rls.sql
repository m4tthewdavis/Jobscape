ALTER TABLE companies ADD COLUMN bcorp_id TEXT;  -- bcorps.company_id of the matched B Lab record

DROP POLICY "Public can read active postings" ON job_postings;
CREATE POLICY "Public can read active postings of certified companies"
  ON job_postings FOR SELECT TO anon, authenticated
  USING (
    is_active = true
    AND EXISTS (
      SELECT 1 FROM companies c
      WHERE c.id = job_postings.company_id AND c.bcorp_status = true
    )
  );

-- Flip companies that are no longer certified in the imported B Lab data (or were never matched by id)
CREATE FUNCTION public.sync_company_certification() RETURNS integer
LANGUAGE sql SET search_path = '' AS $$
  WITH updated AS (
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
