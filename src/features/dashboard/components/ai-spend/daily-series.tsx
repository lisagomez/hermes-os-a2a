'use client'

import { useState } from 'react'
import type { GastoDiario } from '../../types'
import { CHROME, SERIE_COLOR } from './colors'

const W = 560
const H = 180
const PAD = { top: 12, right: 12, bottom: 24, left: 44 }

/**
 * Serie diaria de costo (una sola serie: sin leyenda, el título la nombra).
 * Capa hover por defecto: crosshair + tooltip por punto.
 * Recibe datos ya resueltos por el server; no toca red ni secretos.
 */
export function DailySeries({ datos }: { datos: GastoDiario[] }) {
  const [hover, setHover] = useState<number | null>(null)
  if (datos.length === 0) {
    return <p className="text-sm text-slate-500">Sin datos del mes todavía.</p>
  }

  const max = Math.max(...datos.map((d) => d.costo_usd), 0.01)
  const iw = W - PAD.left - PAD.right
  const ih = H - PAD.top - PAD.bottom
  const x = (i: number) => PAD.left + (datos.length === 1 ? iw / 2 : (i / (datos.length - 1)) * iw)
  const y = (v: number) => PAD.top + ih - (v / max) * ih
  const path = datos.map((d, i) => `${i === 0 ? 'M' : 'L'}${x(i)},${y(d.costo_usd)}`).join(' ')
  const ticksY = [0, max / 2, max]

  function onMove(e: React.PointerEvent<SVGSVGElement>) {
    const rect = e.currentTarget.getBoundingClientRect()
    const px = ((e.clientX - rect.left) / rect.width) * W
    const i = Math.round(((px - PAD.left) / iw) * (datos.length - 1))
    setHover(Math.max(0, Math.min(datos.length - 1, i)))
  }

  return (
    <div className="relative">
      <svg
        viewBox={`0 0 ${W} ${H}`}
        className="w-full"
        role="img"
        aria-label="Costo diario del mes en USD"
        onPointerMove={onMove}
        onPointerLeave={() => setHover(null)}
      >
        {ticksY.map((t) => (
          <g key={t}>
            <line x1={PAD.left} x2={W - PAD.right} y1={y(t)} y2={y(t)} stroke={CHROME.grid} strokeWidth={1} />
            <text x={PAD.left - 6} y={y(t) + 4} textAnchor="end" fontSize={10} fill={CHROME.muted}>
              ${t.toFixed(2)}
            </text>
          </g>
        ))}
        <line x1={PAD.left} x2={W - PAD.right} y1={y(0)} y2={y(0)} stroke={CHROME.axis} strokeWidth={1} />
        <path d={path} fill="none" stroke={SERIE_COLOR} strokeWidth={2} strokeLinejoin="round" />
        {hover !== null && (
          <line x1={x(hover)} x2={x(hover)} y1={PAD.top} y2={H - PAD.bottom} stroke={CHROME.muted} strokeWidth={1} strokeDasharray="3 3" />
        )}
        {datos.map((d, i) => (
          <circle
            key={d.fecha}
            cx={x(i)}
            cy={y(d.costo_usd)}
            r={hover === i ? 5 : 3}
            fill={SERIE_COLOR}
            stroke="#0f172a"
            strokeWidth={2}
          />
        ))}
        {/* Ticks X: primero y último (recesivo, sin ruido) */}
        <text x={x(0)} y={H - 8} fontSize={10} fill={CHROME.muted} textAnchor="start">
          {datos[0].fecha.slice(5)}
        </text>
        <text x={x(datos.length - 1)} y={H - 8} fontSize={10} fill={CHROME.muted} textAnchor="end">
          {datos[datos.length - 1].fecha.slice(5)}
        </text>
      </svg>
      {hover !== null && (
        <div
          className="pointer-events-none absolute -top-1 rounded border border-slate-700 bg-slate-800 px-2 py-1 text-xs text-slate-100"
          style={{ left: `${(x(hover) / W) * 100}%`, transform: 'translateX(-50%)' }}
        >
          {datos[hover].fecha} · ${datos[hover].costo_usd.toFixed(4)}
        </div>
      )}
    </div>
  )
}
