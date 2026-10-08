ALTER TABLE bcorps ADD COLUMN ats_checked_providers TEXT[] NOT NULL DEFAULT '{}';
-- everything checked so far was Greenhouse-only
UPDATE bcorps SET ats_checked_providers = ARRAY['greenhouse'] WHERE ats_checked_at IS NOT NULL;
