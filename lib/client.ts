import { createClient as _createClient } from '@supabase/supabase-js'
import type { Database } from './types'

/**
 * Helper function for initializing Supabase
 *
 * @returns Initialized scoped Supabase client
 * @throws Error if missing required variables
 */
export const createClient = () => {
  const supabaseUrl = process.env.NUXT_PUBLIC_SUPABASE_URL
  const supabasePublishableKey = process.env.NUXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY
  if (!supabaseUrl || !supabasePublishableKey) {
    throw new Error('Missing Supabase environment variables')
  }
  return _createClient<Database>(supabaseUrl, supabasePublishableKey)
}

export const supabase = createClient()
