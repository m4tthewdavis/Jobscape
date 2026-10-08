import { createClient } from '@supabase/supabase-js'

// Anon key: safe everywhere, subject to Row Level Security.
// The service-role client lives in lib/supabase-admin.ts (server-only).
export const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)
