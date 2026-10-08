ALTER TABLE companies    ENABLE ROW LEVEL SECURITY;
ALTER TABLE job_postings ENABLE ROW LEVEL SECURITY;
ALTER TABLE scrape_runs  ENABLE ROW LEVEL SECURITY;

-- Public read-only access to verified data; writes only via service role (bypasses RLS)
CREATE POLICY "Public can read verified companies"
  ON companies FOR SELECT TO anon, authenticated
  USING (bcorp_status = true AND rating >= 4.0);

CREATE POLICY "Public can read active postings"
  ON job_postings FOR SELECT TO anon, authenticated
  USING (is_active = true);

-- scrape_runs: no policies => no anon/authenticated access

ALTER FUNCTION public.update_updated_at() SET search_path = '';
