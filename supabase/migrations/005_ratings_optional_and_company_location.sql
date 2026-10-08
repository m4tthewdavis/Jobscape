DROP POLICY "Public can read verified companies" ON companies;
CREATE POLICY "Public can read certified companies"
  ON companies FOR SELECT TO anon, authenticated
  USING (bcorp_status = true);

ALTER TABLE companies
  ADD COLUMN country  TEXT,
  ADD COLUMN city     TEXT,
  ADD COLUMN industry TEXT;

CREATE INDEX idx_companies_country  ON companies(country);
CREATE INDEX idx_companies_industry ON companies(industry);
