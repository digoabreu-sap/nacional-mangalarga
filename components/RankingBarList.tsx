'use client'

type Item = { label: string; sublabel?: string; valor: number; href?: string }

const ACCENT = 'var(--accent)'

// Leaderboard simples: barra horizontal proporcional ao maior valor da
// lista, valor sempre visivel (lista curta, poucos itens - nao e um
// grafico denso onde rotular tudo poluiria).
export default function RankingBarList({ items, unidade }: { items: Item[]; unidade: string }) {
  if (items.length === 0) {
    return <p className="text-xs text-[var(--text-muted)] text-center py-4">Ainda sem dados suficientes</p>
  }
  const max = Math.max(...items.map(i => i.valor), 1)

  return (
    <div className="space-y-2.5">
      {items.map((item, i) => {
        const pct = Math.max((item.valor / max) * 100, 4)
        const conteudo = (
          <>
            <div className="flex items-baseline justify-between gap-2 mb-1">
              <div className="min-w-0 flex items-baseline gap-1.5">
                <span className="text-[10px] font-bold text-[var(--text-muted)] flex-shrink-0">{i + 1}º</span>
                <span className="text-xs font-semibold truncate">{item.label}</span>
                {item.sublabel && <span className="text-[10px] text-[var(--text-muted)] truncate flex-shrink-0">{item.sublabel}</span>}
              </div>
              <span className="text-xs font-bold text-[var(--accent)] flex-shrink-0">
                {item.valor.toLocaleString('pt-BR')} <span className="font-normal text-[var(--text-muted)]">{unidade}</span>
              </span>
            </div>
            <div className="h-1.5 rounded-full bg-black/5 overflow-hidden">
              <div className="h-full rounded-full" style={{ width: `${pct}%`, background: ACCENT }} />
            </div>
          </>
        )
        return item.href ? (
          <a key={item.label + i} href={item.href} className="block rounded-lg -mx-1 px-1 py-0.5 hover:bg-black/5 transition-colors">
            {conteudo}
          </a>
        ) : (
          <div key={item.label + i}>{conteudo}</div>
        )
      })}
    </div>
  )
}
