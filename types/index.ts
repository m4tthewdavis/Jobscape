export interface Company {
  id: string
  name: string
  website: string | null
  bcorp_id: string | null
  country: string | null
  city: string | null
  industry: string | null
  bcorp_status: boolean
  bcorp_verified_at: string | null
  rating: number | null
  rating_source: string | null
  rating_verified_at: string | null
  created_at: string
  updated_at: string
}

export interface JobPosting {
  id: string
  company_id: string
  title: string
  description: string | null
  location: string | null
  url: string
  source: string
  posted_at: string | null
  scraped_at: string
  is_active: boolean
  // Joined from companies
  company?: Company
}

export interface ScrapeRun {
  id: string
  source: string
  status: 'running' | 'completed' | 'failed'
  jobs_found: number
  jobs_inserted: number
  error: string | null
  started_at: string
  completed_at: string | null
}

export interface ScrapedJob {
  title: string
  company_name: string
  company_website?: string
  company_bcorp_id?: string
  company_country?: string
  company_city?: string
  company_industry?: string
  location?: string
  url: string
  description?: string
  posted_at?: string
  source: string
}
