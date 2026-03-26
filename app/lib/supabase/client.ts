import { createBrowserClient } from '@supabase/ssr'
import type { SupabaseClient } from '@supabase/supabase-js'

let browserClient: SupabaseClient | null | undefined

export function createSupabaseBrowserClient() {
  if (browserClient !== undefined) return browserClient

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

  if (!url || !anon) {
    browserClient = null
    return browserClient
  }

  browserClient = createBrowserClient(url, anon)
  return browserClient
}
