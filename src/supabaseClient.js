import { createClient } from '@supabase/supabase-js'

// as chaves vem do arquivo .env, nunca cola chave direto aqui no codigo
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY

// se ainda nao colou as chaves reais no .env, nem tenta criar o client
// (senao a tela quebra toda em branco sem explicar nada)
export const supabaseConfigurado = Boolean(
  supabaseUrl && supabaseKey && supabaseUrl.startsWith('http'),
)

export const supabase = supabaseConfigurado
  ? createClient(supabaseUrl, supabaseKey)
  : null
