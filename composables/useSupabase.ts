import { createClient as _createClient } from '@supabase/supabase-js'
import type { Database } from '~/lib/supabase/types'

export const useSupabase = () => {
  const { supabaseUrl, supabasePublishableKey } = useRuntimeConfig().public
  if (!supabaseUrl || !supabasePublishableKey) {
    throw new Error('Missing Supabase environment variables')
  }
  return _createClient<Database>(supabaseUrl, supabasePublishableKey)
}
