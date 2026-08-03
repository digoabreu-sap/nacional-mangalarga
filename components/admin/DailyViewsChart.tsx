'use client'

import { useState } from 'react'

type Ponto = { dia: string; total: number }

const ACCENT = '#d0021b'
const WIDTH = 600
const HEIGHT = 200
const PAD_LEFT = 40
const PAD_RIGHT = 12
const PAD_TOP = 16
const PAD_BOTTOM = 28

// Arredonda pra um numero "redondo" acima do maximo, pra grade ficar legivel
// (ex: 1157 -> 1200, 47 -> 50).
function niceMax(value: number): number {
  if (value <= 0) return 10
  const magnitude = Math.pow(10, Math.floor(Math.log10(value)))
  const normalized = value / magnitude
  let niced: number
  if (normalized <= 1) niced = 1
  else if (normalized <= 2) niced = 2
  else if (normalized <= 5) niced = 5
  else niced = 10
  return niced * magnitude
}

export default function DailyViewsChart({ dados }: { dados: Ponto[] }) {
  const [hoverIdx, setHoverIdx] = useState<number | null>(null)

  if (dados.length === 0) return null

  const max = niceMax(Math.max(...dados.map(d => d.total), 1))
  const plotW = WIDTH - PAD_LEFT - PAD_RIGHT
  const plotH = HEIGHT - PAD_TOP - PAD_BOTTOM
  const stepX = dados.length > 1 ? plotW / (dados.length - 1) : 0

  const x = (i: number) => PAD_LEFT + i * stepX
  const y = (v: number) => PAD_TOP + plotH - (v / max) * plotH

  const linePath = dados.map((d, i) => `${i === 0 ? 'M' : 'L'} ${x(i)} ${y(d.total)}`).join(' ')
  const areaPath = `${linePath} L ${x(dados.length - 1)} ${PAD_TOP + plotH} L ${x(0)} ${PAD_TOP + plotH} Z`

  const gridSteps = 4
  const gridValues = Array.from({ length: gridSteps + 1 }, (_, i) => (max / gridSteps) * i)

  const formatDia = (iso: string) => {
    const [, m, d] = iso.split('-')
    return `${d}/${m}`
  }

  // Com historico completo (meses de dados) um rotulo por dia fica
  // ilegivel/sobreposto - mostra so uma amostra espacada do eixo X (mantendo
  // todos os pontos/linha, so os textos sao reduzidos).
  const maxRotulos = 12
  const passoRotulo = Math.max(1, Math.ceil(dados.length / maxRotulos))

  return (
    <div className="relative">
      <svg viewBox={`0 0 ${WIDTH} ${HEIGHT}`} className="w-full h-auto" role="img" aria-label="Visitas diárias">
        {/* Gridlines + rotulos do eixo Y */}
        {gridValues.map((v, i) => (
          <g key={i}>
            <line
              x1={PAD_LEFT} x2={WIDTH - PAD_RIGHT}
              y1={y(v)} y2={y(v)}
              stroke="var(--border)" strokeWidth={1}
            />
            <text x={PAD_LEFT - 8} y={y(v)} textAnchor="end" dominantBaseline="middle"
              className="fill-[var(--text-muted)]" style={{ fontSize: 9 }}>
              {Math.round(v).toLocaleString('pt-BR')}
            </text>
          </g>
        ))}

        {/* Area preenchida */}
        <path d={areaPath} fill={ACCENT} opacity={0.1} />
        {/* Linha */}
        <path d={linePath} fill="none" stroke={ACCENT} strokeWidth={2} strokeLinejoin="round" strokeLinecap="round" />

        {/* Pontos + rotulos do eixo X + area de hover */}
        {dados.map((d, i) => (
          <g key={i}>
            <circle cx={x(i)} cy={y(d.total)} r={hoverIdx === i ? 5 : 4} fill={ACCENT} stroke="var(--bg-card)" strokeWidth={2} />
            {(i % passoRotulo === 0 || i === dados.length - 1) && (
              <text x={x(i)} y={HEIGHT - 8} textAnchor="middle" className="fill-[var(--text-muted)]" style={{ fontSize: 9 }}>
                {formatDia(d.dia)}
              </text>
            )}
            {/* alvo de hover maior que o ponto visivel */}
            <rect
              x={x(i) - stepX / 2} y={PAD_TOP} width={stepX || plotW} height={plotH}
              fill="transparent"
              onMouseEnter={() => setHoverIdx(i)}
              onMouseLeave={() => setHoverIdx(null)}
            />
          </g>
        ))}
      </svg>

      {hoverIdx !== null && (
        <div
          className="absolute pointer-events-none bg-[var(--text-primary)] text-[var(--bg-primary)] text-[10px] font-semibold px-2 py-1 rounded-md shadow-lg whitespace-nowrap"
          style={{
            left: `${(x(hoverIdx) / WIDTH) * 100}%`,
            top: `${(y(dados[hoverIdx].total) / HEIGHT) * 100}%`,
            transform: 'translate(-50%, -130%)',
          }}
        >
          {formatDia(dados[hoverIdx].dia)} · {dados[hoverIdx].total.toLocaleString('pt-BR')} visitas
        </div>
      )}
    </div>
  )
}
