/**
 * Freedraw rendering — variable-width stroke from pressure-sensitive points.
 */
import type { FreedrawElement, HighlighterElement } from '../../elements/types'

export interface RenderFreedrawOpts {
  ctx: CanvasRenderingContext2D
}

export function renderFreedraw(el: FreedrawElement, opts: RenderFreedrawOpts): void {
  const { ctx } = opts
  if (el.points.length < 2) return
  ctx.save()
  ctx.lineCap = 'round'
  ctx.lineJoin = 'round'
  ctx.strokeStyle = el.strokeColor
  ctx.globalAlpha = alphaValue(el.strokeOpacity ?? el.opacity ?? 1)

  drawPressureWorldPath(ctx, el.x, el.y, el.points, {
    baseWidth: el.strokeWidth,
    thinning: el.thinning ?? 0.85,
    minFactor: 0.22,
  })
  ctx.restore()
}

export function renderHighlighter(el: HighlighterElement, opts: { ctx: CanvasRenderingContext2D }): void {
  const { ctx } = opts
  if (el.points.length < 2) return
  ctx.save()
  ctx.lineCap = 'round'
  ctx.lineJoin = 'round'
  ctx.strokeStyle = el.color
  ctx.globalAlpha = alphaValue(el.strokeOpacity ?? 0.3)
  drawPressureWorldPath(ctx, el.x, el.y, el.points, {
    baseWidth: el.strokeWidth,
    thinning: el.thinning ?? 0.55,
    minFactor: 0.42,
  })
  ctx.restore()
}

export function strokeWidthFromPressure(
  baseWidth: number,
  pressure: number | undefined,
  thinning: number,
  minFactor = 0.22,
): number {
  const safeBase = Math.max(0.5, Number.isFinite(baseWidth) ? baseWidth : 1)
  const safeThinning = clamp01(thinning)
  const safeMin = clamp(minFactor, 0.05, 0.95)
  const p = pressureValue(pressure)
  const eased = Math.pow(p, 0.65)
  const pressureFactor = safeMin + (1 - safeMin) * eased
  const factor = 1 - safeThinning + safeThinning * pressureFactor
  return Math.max(0.5, safeBase * factor)
}

function alphaValue(value: number): number {
  return Math.max(0, Math.min(1, Number.isFinite(value) ? value : 1))
}

function drawPressureWorldPath(
  ctx: CanvasRenderingContext2D,
  offsetX: number,
  offsetY: number,
  points: Array<{ x: number; y: number; pressure?: number }>,
  opts: { baseWidth: number; thinning: number; minFactor: number },
) {
  for (let i = 1; i < points.length; i++) {
    const prev = points[Math.max(0, i - 2)]
    const a = points[i - 1]
    const b = points[i]
    const ax = i === 1 ? offsetX + a.x : offsetX + (prev.x + a.x) / 2
    const ay = i === 1 ? offsetY + a.y : offsetY + (prev.y + a.y) / 2
    const isLast = i === points.length - 1
    const bx = isLast ? offsetX + b.x : offsetX + (a.x + b.x) / 2
    const by = isLast ? offsetY + b.y : offsetY + (a.y + b.y) / 2
    const pressure = (pressureValue(a.pressure) + pressureValue(b.pressure)) / 2
    ctx.lineWidth = strokeWidthFromPressure(opts.baseWidth, pressure, opts.thinning, opts.minFactor)
    ctx.beginPath()
    ctx.moveTo(ax, ay)
    ctx.quadraticCurveTo(offsetX + a.x, offsetY + a.y, bx, by)
    ctx.stroke()
  }
}

function pressureValue(value: number | undefined): number {
  return clamp01(typeof value === 'number' && Number.isFinite(value) ? value : 0.5)
}

function clamp01(value: number): number {
  return clamp(value, 0, 1)
}

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, Number.isFinite(value) ? value : min))
}
