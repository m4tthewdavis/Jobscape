import 'server-only'
import { createClient } from '@supabase/supabase-js'

// Service role key: bypasses RLS. Importing this from a client component fails the build.
export function createServiceClient() {
  return createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)
}
