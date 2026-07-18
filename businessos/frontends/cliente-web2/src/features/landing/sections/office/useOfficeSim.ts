'use client';
import { useEffect, useRef, useState, type RefObject } from 'react';
import { AGENTS } from '../../agents';
import { SEATS, WALK_OFFSETS, ZONE_POINTS } from './layout';
import type { AgentState, OfficeState, Zone } from './types';

const TICK_MS = 900;

// --- PRNG sembrado (usado SOLO dentro del efecto post-mount) ---
function hash(s: string): number {
  let h = 2166136261 >>> 0;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}
function mulberry32(seed: number): () => number {
  let a = seed >>> 0;
  return function () {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Estado inicial 100% PURO y determinista (SSR === primer paint cliente). */
function initialState(): OfficeState {
  const map: OfficeState = {};
  for (const a of AGENTS) {
    const seat = SEATS[a.id];
    map[a.id] = { id: a.id, state: 'working', x: seat.x, y: seat.y, lineIdx: 0 };
  }
  return map;
}

interface SimCell {
  id: string;
  state: AgentState;
  x: number;
  y: number;
  lineIdx: number;
  walkTicks: number;
  idleTicks: number;
}

export interface OfficeSim {
  state: OfficeState;
  /** Contador de ticks del motor. Cambia en cada re-render del sim y decide el
   *  frame del sprite (frame = tick % 2). Se pausa con las 3 pausas existentes. */
  tick: number;
  sceneRef: RefObject<HTMLDivElement | null>;
}

export function useOfficeSim(externalPaused: boolean): OfficeSim {
  const [state, setState] = useState<OfficeState>(initialState);
  const [tick, setTick] = useState(0);
  const sceneRef = useRef<HTMLDivElement | null>(null);

  const pausedRef = useRef(externalPaused);
  const syncRef = useRef<(() => void) | null>(null);

  // Sincroniza la pausa (modal abierto) SIN reconstruir el motor ni resetear
  // posiciones: el efecto de montaje es dueño del intervalo; este solo lo
  // arranca/detiene.
  useEffect(() => {
    pausedRef.current = externalPaused;
    syncRef.current?.();
  }, [externalPaused]);

  // UN solo efecto dueño del motor (deps vacías → monta una vez).
  useEffect(() => {
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)');

    // Estado mutable interno del motor (no provoca render por sí mismo).
    const sim: Record<string, SimCell> = {};
    const rngs: Record<string, () => number> = {};
    for (const a of AGENTS) {
      const seat = SEATS[a.id];
      sim[a.id] = {
        id: a.id,
        state: 'working',
        x: seat.x,
        y: seat.y,
        lineIdx: 0,
        walkTicks: 0,
        idleTicks: 0,
      };
      rngs[a.id] = mulberry32(hash(a.id));
    }

    const visibleRef = { current: true };
    const reducedRef = { current: mq.matches };
    let interval: ReturnType<typeof setInterval> | null = null;

    function snapshot(): OfficeState {
      const out: OfficeState = {};
      for (const id in sim) {
        const c = sim[id];
        out[id] = { id: c.id, state: c.state, x: c.x, y: c.y, lineIdx: c.lineIdx };
      }
      return out;
    }

    function tick() {
      for (const a of AGENTS) {
        const c = sim[a.id];
        const rng = rngs[a.id];
        const seat = SEATS[a.id];
        const demo = a.demo;

        // Avanza la línea demo (cíclico).
        c.lineIdx = (c.lineIdx + 1) % demo.length;
        const kind = demo[c.lineIdx].k;

        if (c.walkTicks > 0) {
          c.walkTicks--;
          if (c.walkTicks === 0) {
            c.state = 'working';
            c.x = seat.x;
            c.y = seat.y;
          } else {
            c.state = 'walking';
          }
          continue;
        }
        if (c.idleTicks > 0) {
          c.idleTicks--;
          c.state = c.idleTicks === 0 ? 'working' : 'idle';
          continue;
        }

        // Cierre / KPI → celebra ese tick (en su silla).
        if (kind === 'ok' || kind === 'kpi') {
          c.state = 'celebrating';
          c.x = seat.x;
          c.y = seat.y;
          continue;
        }

        const r = rng();
        if (r < 0.16) {
          // working → walking (sala de reuniones o zona café por 2–4 ticks)
          const zone: Zone = rng() < 0.5 ? 'meeting' : 'cafe';
          const pt = ZONE_POINTS[zone];
          const off = WALK_OFFSETS[a.id];
          c.x = pt.x + off.x;
          c.y = pt.y + off.y;
          c.walkTicks = 2 + Math.floor(rng() * 3); // 2–4
          c.state = 'walking';
        } else if (r < 0.285) {
          // ~1 de cada 8 ticks entra idle 1–2 ticks
          c.idleTicks = 1 + Math.floor(rng() * 2); // 1–2
          c.state = 'idle';
        } else {
          c.state = 'working';
          c.x = seat.x;
          c.y = seat.y;
        }
      }
      setState(snapshot());
      // Un solo re-render por tick (React 19 agrupa ambos setState del callback).
      // El sprite lee `tick` para alternar frames; se congela con el intervalo.
      setTick((t) => t + 1);
    }

    function start() {
      if (!interval) interval = setInterval(tick, TICK_MS);
    }
    function stop() {
      if (interval) {
        clearInterval(interval);
        interval = null;
      }
    }
    function update() {
      const run = visibleRef.current && !pausedRef.current && !reducedRef.current;
      if (run) start();
      else stop();
    }
    syncRef.current = update;

    // Pausa (1): IntersectionObserver — fuera de viewport → clearInterval.
    const observer = new IntersectionObserver(
      ([e]) => {
        visibleRef.current = e.isIntersecting;
        update();
      },
      { threshold: 0 },
    );
    if (sceneRef.current) observer.observe(sceneRef.current);

    // Pausa (3): reduced motion — el motor nunca arranca (o se detiene).
    const onMq = (e: MediaQueryListEvent) => {
      reducedRef.current = e.matches;
      update();
    };
    mq.addEventListener('change', onMq);

    update();

    // Cleanup COMPLETO e idempotente (StrictMode doble-invoca).
    return () => {
      stop();
      observer.disconnect();
      mq.removeEventListener('change', onMq);
      syncRef.current = null;
    };
  }, []);

  return { state, tick, sceneRef };
}
