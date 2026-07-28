import { supabase } from './supabase'

// O selo "Excl. Marcha" so faz sentido quando, DENTRO da mesma categoria e
// marcha, existem os dois modos (Convencional e Exclusivamente Marcha) - af
// e uma excecao real que vale destacar (ex: a maioria de Cavalo Adulto Maior
// faz Convencional, mas um animal so disputa a marcha).
//
// Categorias que SO existem no modo Exclusivamente Marcha (ex: Cavalo
// Castrado, que por regra nunca disputa morfologia) NAO devem ganhar o selo -
// nao ha nada de excepcional ali, e assim que a categoria inteira funciona.
export function calcularCategoriasMistas(
  campeonatos: { categoria: string; tipo_marcha: string; tipo_campeonato: string }[]
): Set<string> {
  const porCategoriaMarcha = new Map<string, Set<string>>()
  for (const c of campeonatos) {
    const key = `${c.categoria}|${c.tipo_marcha}`
    if (!porCategoriaMarcha.has(key)) porCategoriaMarcha.set(key, new Set())
    porCategoriaMarcha.get(key)!.add(c.tipo_campeonato)
  }
  const mistas = new Set<string>()
  for (const [key, tipos] of porCategoriaMarcha) {
    if (tipos.has('Convencional') && [...tipos].some(t => t !== 'Convencional')) mistas.add(key)
  }
  return mistas
}

export async function getCategoriasMistas(): Promise<Set<string>> {
  const { data } = await supabase.from('nm_campeonatos').select('categoria, tipo_marcha, tipo_campeonato')
  return calcularCategoriasMistas(data || [])
}

export function ehExcecaoMarcha(
  categoria: string | null | undefined,
  tipoMarcha: string | null | undefined,
  tipoCampeonato: string | null | undefined,
  categoriasMistas: Set<string>
): boolean {
  if (!categoria || !tipoMarcha || !tipoCampeonato || tipoCampeonato === 'Convencional') return false
  return categoriasMistas.has(`${categoria}|${tipoMarcha}`)
}
