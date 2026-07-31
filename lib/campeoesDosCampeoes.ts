// Os 10 campeonatos "Campeao dos Campeoes/Campea das Campeas/Grande
// Campeonato Jovem da Raca" (5 tipos x MB/MP) juntam animais de VARIAS
// categorias (os campeoes de cada categoria voltam a pista - Art. 73-76 do
// regulamento), com a lista montada manualmente pelo admin (aba Campeoes)
// na tabela nm_campeoes_dos_campeoes. Pra aparecerem em Campeonatos, no
// Calendario e serem selecionaveis como "categoria em pista" no admin sem
// duplicar toda a logica de categoria+marcha do resto do site, cada um
// ganha um nome de "categoria virtual" fixo aqui - o resto do app trata
// esse nome como se fosse uma categoria de verdade (usado no ?categoria=
// da Home, no <select> da aba Categoria etc.), e so quando precisa dos
// ANIMAIS de verdade e que troca a fonte de dado pra
// nm_campeoes_dos_campeoes_listar em vez de nm_animais.
export type TipoCampeaoDosCampeoes = 'macho' | 'femea' | 'castrado' | 'grande_jovem_macho' | 'grande_jovem_femea'

export const CAMPEOES_ESPECIAIS: { categoria: string; tipo: TipoCampeaoDosCampeoes }[] = [
  { categoria: 'Campeão dos Campeões', tipo: 'macho' },
  { categoria: 'Campeã das Campeãs', tipo: 'femea' },
  { categoria: 'Campeão dos Campeões Castrado', tipo: 'castrado' },
  { categoria: 'Grande Campeonato Jovem da Raça - Machos', tipo: 'grande_jovem_macho' },
  { categoria: 'Grande Campeonato Jovem da Raça - Fêmeas', tipo: 'grande_jovem_femea' },
]

export function tipoDaCategoriaEspecial(categoria: string): TipoCampeaoDosCampeoes | null {
  return CAMPEOES_ESPECIAIS.find(c => c.categoria === categoria)?.tipo ?? null
}

export function categoriasEspeciais(): string[] {
  return CAMPEOES_ESPECIAIS.map(c => c.categoria)
}

// Usado pro link do Calendario: os eventos de lá não têm acento e usam
// abreviações próprias ("Grande Campeonato Jovem da Raca Machos (MB)",
// "Campeao dos Campeoes Castrado (MP)", "Campea das Campeas (MB)") -
// compara a forma normalizada (sem acento, sem o sufixo de marcha) contra
// esse mapa fixo.
const EVENTO_CALENDARIO_NORMALIZADO: { assunto: string; categoria: string }[] = [
  { assunto: 'grande campeonato jovem da raca machos', categoria: 'Grande Campeonato Jovem da Raça - Machos' },
  { assunto: 'grande campeonato jovem da raca femeas', categoria: 'Grande Campeonato Jovem da Raça - Fêmeas' },
  { assunto: 'campeao dos campeoes castrado', categoria: 'Campeão dos Campeões Castrado' },
  { assunto: 'campeao dos campeoes', categoria: 'Campeão dos Campeões' },
  { assunto: 'campea das campeas', categoria: 'Campeã das Campeãs' },
]

function normalizarSimples(s: string): string {
  return s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().trim()
}

// Recebe o texto cru do evento do calendario (ex: "Campeao dos Campeoes
// Castrado (MP)") e devolve a categoria virtual + marcha, ou null se o
// evento nao for um desses 10 campeonatos.
export function categoriaEspecialDoEvento(evt: string): { categoria: string; tipoMarcha: 'MB' | 'MP' } | null {
  const marchaMatch = evt.match(/\((MB|MP)\)\s*$/)
  if (!marchaMatch) return null
  const semMarcha = normalizarSimples(evt.replace(/\s*\((MB|MP)\)\s*$/, ''))
  const encontrado = EVENTO_CALENDARIO_NORMALIZADO.find(e => semMarcha === e.assunto)
  if (!encontrado) return null
  return { categoria: encontrado.categoria, tipoMarcha: marchaMatch[1] as 'MB' | 'MP' }
}
