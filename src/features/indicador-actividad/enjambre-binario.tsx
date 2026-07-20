'use client';

// Componente React del indicador "Enjambre Binario" (SPEC fase-10). CONTROLADO: el padre pasa
// `state` desde telemetria REAL de la cola (guardrail de honestidad: sin dato -> 'pensar' neutro)
// y `subtitle` con el dato real (se anuncia por aria-live). Toda la logica de los 18 estados vive
// en enjambre-engine.ts (agnostica del renderer); aqui SOLO el renderer Canvas 2D + el bucle.
// SPEC §6: pausa fuera de viewport; prefers-reduced-motion => figura FORMADA estatica (no congelada
// a media transicion) con el subtitulo como fuente de verdad textual.

import { useEffect, useRef } from 'react';
import {
  PALETA as C, GLITCH, DIM, LABEL, TARGET,
  type EstadoAgente, type ModoProgreso,
} from './enjambre-engine';

interface Particula { x: number; y: number; c: string; f: number; s: number; }

interface Props {
  state: EstadoAgente;
  /** Telemetria real ("grafo-a2a · 3 de 7 fuentes"). La animacion jamas afirma lo que este texto no diga. */
  subtitle?: string;
  progress?: number;        // 0..1
  progressMode?: ModoProgreso;
  className?: string;
}

export function EnjambreBinario({ state, subtitle, progress = 0, progressMode = 'off', className }: Props) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const stateRef = useRef<EstadoAgente>(state);
  const progRef = useRef<number>(progress);
  const modeRef = useRef<ModoProgreso>(progressMode);

  // El bucle rAF de abajo monta UNA vez ([]): estos refs son la forma en que lee
  // valores frescos de state/progress/progressMode sin reiniciar el loop en cada cambio.
  useEffect(() => {
    stateRef.current = state;
    progRef.current = progress;
    modeRef.current = progressMode;
  }, [state, progress, progressMode]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const { W, H, CX, CY, STRIP_Y, N } = DIM;
    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const CYCLE: ModoProgreso[] = ['bar', 'pct', 'counter'];

    const parts: Particula[] = [];
    for (let i = 0; i < N; i++) {
      parts.push({
        x: Math.random() * W, y: Math.random() * (STRIP_Y - 10),
        c: Math.random() < 0.5 ? '0' : '1', f: (Math.random() * 160) | 0, s: 0.06 + Math.random() * 0.06,
      });
    }
    let t = 0, cycT = 0, cycI = 0, raf = 0;
    let running = false, inView = true, lastStatic: EstadoAgente | null = null;
    // suavizado de cambio de estado (espejo del v3): al cambiar, la persecucion arranca lenta y sube en ~0.7s
    const TRANS_FRAMES = 42; let transT = TRANS_FRAMES; let prevState: EstadoAgente = stateRef.current;

    const drawStrip = () => {
      const prog = progRef.current;
      const m: ModoProgreso = modeRef.current === 'cycle' ? CYCLE[cycI] : modeRef.current;
      if (m === 'off') return;
      ctx.save();
      ctx.textBaseline = 'middle';
      const cy = STRIP_Y + 16;
      if (m === 'bar') {
        const sl = 44, x0 = CX - (sl * 6.2) / 2, fl = Math.round(prog * sl);
        ctx.textAlign = 'center'; ctx.font = '11px "JetBrains Mono",monospace';
        for (let k = 0; k < sl; k++) {
          const on = k < fl; ctx.globalAlpha = on ? 1 : 0.25; ctx.fillStyle = on ? C.base : C.dim;
          ctx.fillText(on ? (k % 2 ? '1' : '0') : '0', x0 + k * 6.2 + 3, cy);
        }
        ctx.globalAlpha = 1; ctx.fillStyle = C.hot; ctx.textAlign = 'left';
        ctx.fillText(`${Math.round(prog * 100)}%`, x0 + sl * 6.2 + 10, cy);
      } else if (m === 'pct') {
        ctx.textAlign = 'center'; ctx.fillStyle = C.base; ctx.font = '700 26px "Space Grotesk",sans-serif';
        ctx.fillText(`${Math.round(prog * 100)}%`, CX, cy);
      } else {
        const tot = 7, n = Math.round(prog * tot);
        ctx.textAlign = 'center'; ctx.font = '700 20px "JetBrains Mono",monospace'; ctx.fillStyle = C.base;
        ctx.fillText(`${n} / ${tot}`, CX, cy);
      }
      ctx.restore();
    };

    const paint = (animated: boolean, chaseMul = 1) => {
      const st = stateRef.current;
      ctx.clearRect(0, 0, W, H);
      ctx.font = '11px "JetBrains Mono",monospace'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      const fn = TARGET[st];
      for (let i = 0; i < N; i++) {
        const p = parts[i], g = fn(i, t);
        p.x += (g.x - p.x) * p.s * chaseMul; p.y += (g.y - p.y) * p.s * chaseMul;
        if (--p.f < 0) { p.f = 40 + ((Math.random() * 150) | 0); p.c = g.dirty ? GLITCH[(Math.random() * GLITCH.length) | 0] : (Math.random() < 0.5 ? '0' : '1'); }
        if (g.dirty && '01'.includes(p.c)) p.c = GLITCH[(Math.random() * GLITCH.length) | 0];
        if (!g.dirty && !'01'.includes(p.c)) p.c = Math.random() < 0.5 ? '0' : '1';
        const jx = (g.dirty && animated) ? (Math.random() - 0.5) * 2.4 : 0;
        const jy = (g.dirty && animated) ? (Math.random() - 0.5) * 2.4 : 0;
        const br = g.a > 0.85;
        ctx.globalAlpha = g.a * (animated ? (0.78 + 0.22 * Math.sin(t * 0.05 + i)) : 0.9);
        ctx.shadowBlur = br ? 8 : 0; ctx.shadowColor = br ? g.col : 'transparent';
        ctx.fillStyle = g.col; ctx.fillText(p.c, p.x + jx, p.y + jy);
      }
      ctx.shadowBlur = 0; ctx.globalAlpha = 1;
      const st2 = stateRef.current;
      if (st2 === 'leer' || st2 === 'verificar') {
        const sp = st2 === 'leer' ? 2.2 : 1.9, cols = 36, sx = CX - cols * 3.5 + ((t * sp) % (cols * 7));
        ctx.strokeStyle = 'rgba(236,72,153,.5)'; ctx.lineWidth = 1.4;
        ctx.beginPath(); ctx.moveTo(sx, CY - 58); ctx.lineTo(sx, CY + 56); ctx.stroke();
      }
      drawStrip();
    };

    const frame = () => {
      t++;
      if (modeRef.current === 'cycle' && ++cycT > 360) { cycT = 0; cycI = (cycI + 1) % 3; }  // showcase ~6s (formato estable, cambio ocasional)
      if (stateRef.current !== prevState) { prevState = stateRef.current; transT = 0; }
      if (transT < TRANS_FRAMES) transT++;
      const k = transT / TRANS_FRAMES;
      const chaseMul = 0.28 + 0.72 * (k < 0.5 ? 2 * k * k : 1 - ((-2 * k + 2) ** 2) / 2);
      paint(true, chaseMul);
      raf = requestAnimationFrame(frame);
    };

    // reduced-motion (SPEC §6): asentar las particulas en la FIGURA formada y pintar UNA vez.
    const paintStatic = () => {
      lastStatic = stateRef.current;
      for (let k = 0; k < 160; k++) { t++; const fn = TARGET[stateRef.current];
        for (let i = 0; i < N; i++) { const p = parts[i], g = fn(i, t); p.x += (g.x - p.x) * 0.2; p.y += (g.y - p.y) * 0.2; } }
      paint(false);
    };

    const start = () => { if (running || reduce || !inView || document.hidden) return; running = true; raf = requestAnimationFrame(frame); };
    const stop = () => { if (!running) return; running = false; cancelAnimationFrame(raf); };

    // pausa fuera de viewport (SPEC §6) + pestana oculta
    const io = new IntersectionObserver((es) => { inView = es[0]?.isIntersecting ?? true; if (inView) start(); else stop(); });
    io.observe(canvas);
    const onVis = () => { if (document.hidden) stop(); else start(); };
    document.addEventListener('visibilitychange', onVis);

    if (reduce) {
      paintStatic();
      // repintar la figura formada cuando cambie el estado (poll ligero, sin rAF continuo)
      const iv = window.setInterval(() => { if (stateRef.current !== lastStatic) paintStatic(); }, 500);
      return () => { window.clearInterval(iv); io.disconnect(); document.removeEventListener('visibilitychange', onVis); };
    }
    start();
    return () => { stop(); io.disconnect(); document.removeEventListener('visibilitychange', onVis); };
  }, []);

  return (
    <div className={className}>
      <canvas
        ref={canvasRef}
        width={DIM.W}
        height={DIM.H}
        style={{ width: '100%', display: 'block' }}
        role="img"
        aria-label={`Agente: ${LABEL[state][0]}${subtitle ? ` · ${subtitle}` : ''}`}
      />
      {/* fuente de verdad textual (guardrail honestidad + aria-live, SPEC §2.5/§6) */}
      <span aria-live="polite" style={{ position: 'absolute', width: 1, height: 1, overflow: 'hidden', clip: 'rect(0 0 0 0)', whiteSpace: 'nowrap' }}>
        {LABEL[state][0]}{subtitle ? ` · ${subtitle}` : ''}
      </span>
    </div>
  );
}
