'use client'

import { useState, useRef, useEffect } from 'react'

// Combobox de categoria: alem de clicar numa opcao da lista, o usuario pode
// digitar pra filtrar - o <select> nativo so pula pra opcao que comeca com a
// letra digitada, o que nao ajuda numa lista de ~50 categorias parecidas
// (Cavalo Castrado, Cavalo Castrado Adulto, Cavalo Castrado Jovem...).
export default function CategoriaCombobox({
  categorias,
  value,
  onChange,
  placeholder = 'Todas as categorias',
  className = '',
}: {
  categorias: string[]
  value: string
  onChange: (v: string) => void
  placeholder?: string
  className?: string
}) {
  const [texto, setTexto] = useState(value === 'Todas' ? '' : value)
  const [aberto, setAberto] = useState(false)
  const wrapperRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    setTexto(value === 'Todas' ? '' : value)
  }, [value])

  useEffect(() => {
    function onClickFora(e: MouseEvent) {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target as Node)) {
        setAberto(false)
        setTexto(value === 'Todas' ? '' : value)
      }
    }
    document.addEventListener('mousedown', onClickFora)
    return () => document.removeEventListener('mousedown', onClickFora)
  }, [value])

  const filtradas = texto.trim()
    ? categorias.filter(c => c.toLowerCase().includes(texto.trim().toLowerCase()))
    : categorias

  function selecionar(c: string) {
    onChange(c)
    setTexto(c === 'Todas' ? '' : c)
    setAberto(false)
  }

  return (
    <div ref={wrapperRef} className={`relative ${className}`}>
      <input
        type="text"
        role="combobox"
        aria-expanded={aberto}
        aria-autocomplete="list"
        value={texto}
        placeholder={placeholder}
        onFocus={() => setAberto(true)}
        onChange={e => { setTexto(e.target.value); setAberto(true) }}
        onKeyDown={e => {
          if (e.key === 'Enter' && filtradas.length > 0) { selecionar(filtradas[0]); (e.target as HTMLInputElement).blur() }
          if (e.key === 'Escape') { setAberto(false); (e.target as HTMLInputElement).blur() }
        }}
        className="w-full py-2 px-3 bg-[var(--bg-card)] border border-[var(--border)] rounded-lg text-xs text-[var(--text-primary)] focus:outline-none focus:border-[var(--accent)] transition-colors"
      />
      <svg className="w-3.5 h-3.5 absolute right-3 top-1/2 -translate-y-1/2 text-[var(--text-muted)] pointer-events-none" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 9l6 6 6-6" />
      </svg>
      {aberto && (
        <div role="listbox" className="absolute top-full left-0 right-0 mt-1 bg-[var(--bg-card)] border border-[var(--border)] rounded-xl overflow-hidden shadow-2xl z-50 max-h-64 overflow-y-auto">
          <button
            type="button"
            role="option"
            onMouseDown={e => e.preventDefault()}
            onClick={() => selecionar('Todas')}
            aria-selected={value === 'Todas'}
            className={`w-full px-3 py-2 text-left text-xs hover:bg-[var(--bg-card-hover)] transition-colors border-b border-[var(--border)] ${value === 'Todas' ? 'text-[var(--accent)] font-semibold' : ''}`}
          >
            Todas as categorias
          </button>
          {filtradas.length === 0 ? (
            <p className="px-3 py-2 text-xs text-[var(--text-muted)]">Nenhuma categoria encontrada</p>
          ) : (
            filtradas.map(c => (
              <button
                key={c}
                type="button"
                role="option"
                onMouseDown={e => e.preventDefault()}
                onClick={() => selecionar(c)}
                aria-selected={value === c}
                className={`w-full px-3 py-2 text-left text-xs hover:bg-[var(--bg-card-hover)] transition-colors border-b border-[var(--border)] last:border-0 ${value === c ? 'text-[var(--accent)] font-semibold' : ''}`}
              >
                {c}
              </button>
            ))
          )}
        </div>
      )}
    </div>
  )
}
