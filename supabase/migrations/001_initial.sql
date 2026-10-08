-- Companies: stores verified employer data
CREATE TABLE companies (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name          TEXT NOT NULL,
  website       TEXT,
  -- B Corp verification
  bcorp_status  BOOLEAN NOT NULL DEFAULT FALSE,
  bcorp_verified_at TIMESTAMPTZ,
  -- Glassdoor / Indeed rating (0.0 – 5.0)
  rating        NUMERIC(3,1),
  rating_source TEXT,                  -- 'glassdoor' | 'indeed'
  rating_verified_at TIMESTAMPTZ,
  -- Housekeeping
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Job postings: cached from scrapers
CREATE TABLE job_postings (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id    UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  title         TEXT NOT NULL,
  description   TEXT,
  location      TEXT,
  url           TEXT NOT NULL UNIQUE,
  source        TEXT NOT NULL,          -- 'linkedin' | 'indeed' | 'greenhouse' etc.
  posted_at     TIMESTAMPTZ,
  scraped_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  is_active     BOOLEAN NOT NULL DEFAULT TRUE
);

-- Scrape runs: audit trail for each scraper execution
CREATE TABLE scrape_runs (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  source        TEXT NOT NULL,
  status        TEXT NOT NULL DEFAULT 'running',  -- 'running' | 'completed' | 'failed'
  jobs_found    INTEGER DEFAULT 0,
  jobs_inserted INTEGER DEFAULT 0,
  error         TEXT,
  started_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  completed_at  TIMESTAMPTZ
);

-- Indexes
CREATE INDEX idx_job_postings_company_id ON job_postings(company_id);
CREATE INDEX idx_job_postings_source     ON job_postings(source);
CREATE INDEX idx_job_postings_is_active  ON job_postings(is_active);
CREATE INDEX idx_companies_bcorp_status  ON companies(bcorp_status);
CREATE INDEX idx_companies_rating        ON companies(rating);

-- Auto-update updated_at on companies
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER companies_updated_at
  BEFORE UPDATE ON companies
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();
