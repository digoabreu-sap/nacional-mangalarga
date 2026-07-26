'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'

// Acesso a busca de qualquer tela do site (nao so da Home) - fica suspenso
// no canto superior, como pedido: "devo conseguir acessa-lo de qualquer
// sessao do aplicativo pra buscar animais". Na Home some (ela ja tem seu
// proprio icone de busca no cabecalho) e no admin.
export default function BuscaFlutuante() {
  const pathname = usePathname()
  if (pathname === '/' || pathname.startsWith('/admin')) return null

  return (
    <Link
      href="/?busca=1"
      aria-label="Buscar animal"
      // z-[60]: todo cabecalho de pagina e "sticky top-0 z-50" - com z-40
      // o botao ficava atras do cabecalho (invisivel/inclicavel) em toda
      // pagina, por isso "nao funcionava".
      className="fixed top-3 right-3 z-[60] w-10 h-10 flex items-center justify-center bg-[var(--bg-card)] border border-[var(--border)] rounded-full shadow-lg text-[var(--text-secondary)] hover:text-[var(--accent)] active:scale-95 transition-all"
    >
      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
      </svg>
    </Link>
  )
}
