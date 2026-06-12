import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Variáveis do Supabase não encontradas.')
}

export const supabase = createClient(
  supabaseUrl,
  supabaseAnonKey,
  {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
    },

    realtime: {
      params: {
        eventsPerSecond: 10,
      },
    },

    global: {
      fetch: (url, options) =>
        fetch(url, {
          ...options,
          cache: 'no-store',
        }),
    },
  }
)