CREATE TABLE bcorps (
  company_id          TEXT PRIMARY KEY,           -- B Lab's id
  name                TEXT NOT NULL,
  normalized_name     TEXT NOT NULL,
  website             TEXT,
  domain              TEXT,
  status              TEXT NOT NULL,              -- 'certified' | 'de-certified'
  date_first_certified DATE,
  date_certified      TIMESTAMPTZ,
  country             TEXT,
  city                TEXT,
  industry            TEXT,
  profile_url         TEXT,
  -- hiring-platform detection (filled by scripts/detect-ats.mjs)
  ats_provider        TEXT,                       -- 'greenhouse' | null
  ats_slug            TEXT,
  ats_checked_at      TIMESTAMPTZ
);

CREATE INDEX idx_bcorps_normalized_name ON bcorps(normalized_name);
CREATE INDEX idx_bcorps_domain          ON bcorps(domain);
CREATE INDEX idx_bcorps_status          ON bcorps(status);
CREATE INDEX idx_bcorps_ats             ON bcorps(ats_provider) WHERE ats_provider IS NOT NULL;

-- Service role only: no policies for anon/authenticated
ALTER TABLE bcorps ENABLE ROW LEVEL SECURITY;
