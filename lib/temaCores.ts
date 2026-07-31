// Cores configuraveis (pelo admin) das tags/selos e do card do animal no Ao
// Vivo, por status: Excl. Marcha, Entre os 7, 8 a 13, Retirado e Marcha (o
// selo de Campeao de Marcha dos campeonatos de Campeoes). Os valores
// default abaixo reproduzem EXATAMENTE a aparencia hardcoded que o app
// sempre teve (o app nao tem modo escuro de verdade - so umas variantes
// dark: pontuais em 2 tags - entao um hex fixo por campo já cobre tudo);
// se o admin nunca mexer em nada, a tela fica identica a antes dessa
// funcionalidade existir.

export type StatusCor = 'excl_marcha' | 'entre_os_7' | 'oitava_a_treze' | 'retirado' | 'marcha'

export type CorStatus = {
  tagBg: string        // cor solida (hex) - a opacidade de fundo da tag e aplicada por cima via tagBgOpacity
  tagBgOpacity: number // 0-100
  tagFg: string        // cor do texto da tag (hex)
  cardBg: string       // cor de fundo do card quando esse status esta ativo (hex)
  cardBorder: string   // cor do contorno do card quando esse status esta ativo (hex)
  cardOpacity: number  // 0-100 - transparencia do card inteiro quando esse status esta ativo
}

export const STATUS_LABEL: Record<StatusCor, string> = {
  excl_marcha: 'Excl. Marcha',
  entre_os_7: 'Entre os 7',
  oitava_a_treze: '8 a 13',
  retirado: 'Retirado',
  marcha: 'Marcha',
}

export const DEFAULT_CORES: Record<StatusCor, CorStatus> = {
  excl_marcha: { tagBg: '#dc2626', tagBgOpacity: 10, tagFg: '#dc2626', cardBg: '#f7f6f6', cardBorder: '#e6e2e2', cardOpacity: 100 },
  entre_os_7: { tagBg: '#7a1315', tagBgOpacity: 100, tagFg: '#ffffff', cardBg: '#f7f6f6', cardBorder: '#7a1315', cardOpacity: 100 },
  oitava_a_treze: { tagBg: '#d0021b', tagBgOpacity: 100, tagFg: '#ffffff', cardBg: '#f7f6f6', cardBorder: '#d0021b', cardOpacity: 100 },
  retirado: { tagBg: '#000000', tagBgOpacity: 10, tagFg: '#5b5555', cardBg: '#f7f6f6', cardBorder: '#e6e2e2', cardOpacity: 50 },
  marcha: { tagBg: '#2563eb', tagBgOpacity: 10, tagFg: '#2563eb', cardBg: '#f7f6f6', cardBorder: '#e6e2e2', cardOpacity: 100 },
}

export type TemaCoresConfig = Partial<Record<StatusCor, Partial<CorStatus>>>

// Mescla o que veio salvo (pode ser parcial - o admin so mexeu em alguns
// campos de alguns status) com o default, campo a campo.
export function corEfetiva(status: StatusCor, config: TemaCoresConfig | null | undefined): CorStatus {
  return { ...DEFAULT_CORES[status], ...(config?.[status] || {}) }
}

export function hexParaRgba(hex: string, opacityPct: number): string {
  const limpo = hex.replace('#', '')
  const r = parseInt(limpo.slice(0, 2), 16) || 0
  const g = parseInt(limpo.slice(2, 4), 16) || 0
  const b = parseInt(limpo.slice(4, 6), 16) || 0
  return `rgba(${r}, ${g}, ${b}, ${Math.max(0, Math.min(100, opacityPct)) / 100})`
}

// Estilo inline (fundo + texto) de uma tag ativa, pronto pra jogar no
// `style` do span/botao.
export function estiloTag(status: StatusCor, config: TemaCoresConfig | null | undefined): { backgroundColor: string; color: string } {
  const cor = corEfetiva(status, config)
  return { backgroundColor: hexParaRgba(cor.tagBg, cor.tagBgOpacity), color: cor.tagFg }
}

