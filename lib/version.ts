// Numero de versao do app: MAIOR.menor
// - Mudanca pequena (ajuste, correcao pontual): incrementa o "menor" (2.0 -> 2.01 -> 2.02...).
// - Mudanca grande (nova funcionalidade, redesign de tela): incrementa o "maior" e zera o menor (2.34 -> 3.0).
// Atualizar aqui a cada deploy com mudanca de codigo.
export const APP_VERSION = '3.31'

export function formatVersionComDataHora(): string {
  const iso = process.env.NEXT_PUBLIC_BUILD_TIME
  if (!iso) return `v${APP_VERSION}`
  const data = new Date(iso)
  const dataFormatada = data.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' })
  const horaFormatada = data.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit', timeZone: 'America/Sao_Paulo' })
  return `v${APP_VERSION} · ${dataFormatada} ${horaFormatada}`
}
