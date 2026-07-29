import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

export const supabase = createClient(supabaseUrl, supabaseKey)

export type Animal = {
  id: number
  id_catalogo: number
  nome: string
  num_catalogo: string | null
  registro: string
  chip: string
  data_nascimento: string
  idade: string
  campeonato: string
  tipo_campeonato: string
  tipo_marcha: string
  categoria: string
  pai: string
  pai_registro: string
  mae: string
  mae_registro: string
  criador: string
  expositor: string
  haras: string | null
  cidade: string | null
  uf: string | null
  destaque: boolean
  tambem_excl_marcha: boolean
  finalista_marcha: boolean
  retirado: boolean
}

export type Campeonato = {
  id: number
  nome: string
  tipo_campeonato: string
  tipo_marcha: string
  categoria: string
  total_animais: number
}

export type Usuario = {
  id: number
  nome: string
  email: string | null
  telefone: string | null
}

