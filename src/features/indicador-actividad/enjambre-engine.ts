// Motor del indicador "Enjambre Binario": la logica de los 18 estados, AGNOSTICA del renderer.
// El renderer (hoy Canvas 2D en enjambre-binario.tsx) consume estos objetivos; se puede cambiar a
// WebGL / React Three Fiber / WebGPU sin tocar este archivo. Es el seam de "no nos limitamos".
// Espejo del bloque MOTOR en enjambre-binario.v3.html (prototipo verificable).

export type EstadoAgente =
  | 'pensar' | 'leer' | 'recolectar' | 'escribir' | 'construir' | 'limpiar'
  | 'negociar' | 'esperar' | 'bloqueado' | 'confirmado'
  | 'buscar' | 'planear' | 'herramienta' | 'verificar' | 'reintentar'
  | 'enrutar' | 'streaming' | 'desplegar';

export type ModoProgreso = 'cycle' | 'bar' | 'pct' | 'counter' | 'off';

export interface ObjetivoParticula { x: number; y: number; col: string; a: number; dirty?: boolean; }

// Cambia la PALETA aqui para otra identidad (p. ej. cian) sin tocar la logica.
export const PALETA = {
  base: '#7C3AED', hot: '#EC4899', alt: '#38BDF8', ok: '#5DCAA5', bad: '#E24B4A',
  warn: '#FBBF24', blue: '#60A5FA', bone: '#EAE6D8', dim: '#6d5bc9',
} as const; // ok/bad/dim alineados al SPEC fase-10 (teal verificado, rojo corrupcion, violeta neutro)
export const GLITCH = '#%?!§~¬';
export const DIM = { W: 620, H: 280, CX: 310, CY: 118, STRIP_Y: 236, N: 200 } as const;

const { W, CX, CY, STRIP_Y, N } = DIM;
const C = PALETA;

const ease = (t: number): number => (t < 0.5 ? 2 * t * t : 1 - ((-2 * t + 2) ** 2) / 2);
const lerp = (a: number, b: number, t: number): number => a + (b - a) * t;

type Punto = { x: number; y: number };

const WRITE_SLOTS: Punto[] = (() => {
  const s: Punto[] = []; const lens = [32, 27, 30, 19, 28, 22, 25, 13], ox = CX - 112, oy = CY - 54, cw = 7, ch = 15;
  for (let r = 0; r < lens.length; r++) for (let c = 0; c < lens[r]; c++) s.push({ x: ox + c * cw, y: oy + r * ch });
  return s;
})();
const BUILD_SLOTS: Punto[] = (() => {
  const s: Punto[] = []; const tw = [3, 5, 4, 6, 5, 7, 4, 6, 3], bw = 3, cw = 6, gx = 2, ch = 13, baseY = CY + 64, mH = 7;
  const totalW = tw.length * (bw + gx) * cw - gx * cw, ox = CX - totalW / 2;
  for (let l = 0; l < mH; l++) for (let ti = 0; ti < tw.length; ti++) if (l < tw[ti]) {
    const bx = ox + ti * (bw + gx) * cw; for (let k = 0; k < bw; k++) s.push({ x: bx + k * cw, y: baseY - l * ch });
  }
  return s;
})();
const ORIGINS: Punto[] = [{ x: 60, y: 40 }, { x: W - 60, y: 40 }, { x: 70, y: DIM.H - 90 }, { x: W - 70, y: DIM.H - 90 }, { x: CX, y: 26 }];
const PLAN_NODES: Punto[] = (() => { const s: Punto[] = []; for (let i = 0; i < 12; i++) s.push({ x: CX - 150 + i * 27, y: CY }); return s; })();

export const STATES: EstadoAgente[] = [
  'pensar', 'leer', 'recolectar', 'escribir', 'construir', 'limpiar', 'negociar', 'esperar', 'bloqueado', 'confirmado',
  'buscar', 'planear', 'herramienta', 'verificar', 'reintentar', 'enrutar', 'streaming', 'desplegar',
];

export const LABEL: Record<EstadoAgente, [string, string]> = {
  pensar: ['Pensando', 'esperando telemetria'], leer: ['Leyendo documentos', 'BUSINESS_LOGIC.md · pag 4'],
  recolectar: ['Recolectando', 'grafo-a2a · 3 de 7 fuentes'], escribir: ['Escribiendo entregable', 'PRP-cliente.md'],
  construir: ['Construyendo', 'ensamblando 5 modulos'], limpiar: ['Limpiando datos', 'purgando corrupcion'],
  negociar: ['Negociando A2A', 'ejecutor / supervisor'], esperar: ['Esperando gate', 'revision humana pendiente'],
  bloqueado: ['Bloqueado', 'dependencia sin resolver'], confirmado: ['Confirmado on-chain', 'txHash 0x7f3a...c21e'],
  buscar: ['Buscando en la web', '3 dominios consultados'], planear: ['Planeando', 'armando DAG de 6 pasos'],
  herramienta: ['Llamando herramienta', 'run: read_file()'], verificar: ['Verificando', 'corriendo 24 tests'],
  reintentar: ['Reintentando', 'intento 2 de 3'], enrutar: ['Enrutando', 'eligiendo modelo/rama'],
  streaming: ['Transmitiendo', 'streaming de salida'], desplegar: ['Desplegando', 'push a produccion'],
};

// Cada funcion: (i, t) -> objetivo de la particula i en el frame t. Sin estado externo (salvo Math.random para parpadeo/jitter).
export const TARGET: Record<EstadoAgente, (i: number, t: number) => ObjetivoParticula> = {
  pensar(i, tt) { const b = .5 + .5 * Math.sin(tt * .045), ang = i * 2.399 + Math.sin(tt * .02 + i) * .8, r = (38 + (i % 5) * 14) * (.55 + b * .85), sp = Math.sin(i * 7.3 + tt * .06) > .985; return { x: CX + Math.cos(ang) * r * 1.5, y: CY + Math.sin(ang) * r * .8, col: sp ? C.hot : C.base, a: .45 + .3 * b }; },
  esperar(i, tt) { const a = i / N * 6.283, r = 66, d = Math.sin(tt * .012 + i) * 1.2, b = .5 + .5 * Math.sin(tt * .03); return { x: CX + Math.cos(a) * r * 1.55 + d, y: CY + Math.sin(a) * r * .72 + d, col: C.warn, a: .24 + .34 * b }; },
  leer(i, tt) { const cols = 36, gx = CX - cols * 3.5 + (i % cols) * 7, gy = CY - 52 + Math.floor(i / cols) * 15, scan = CX - cols * 3.5 + ((tt * 2.2) % (cols * 7)), h = Math.abs(gx - scan) < 11; return { x: gx, y: gy, col: h ? C.hot : C.base, a: h ? 1 : .7 }; },
  recolectar(i, tt) { const o = ORIGINS[i % 5], ph = ((tt * .9 + i * 11) % 210) / 210, e = ease(ph); return { x: lerp(o.x, CX + (i % 7 - 3) * 7, e), y: lerp(o.y, CY + ((i % 5) - 2) * 7, e), col: e > .8 ? C.hot : C.base, a: .4 + .6 * e }; },
  escribir(i, tt) { const S = WRITE_SLOTS, cur = (tt * 1.1) % (S.length + 46); if (i < S.length && i < cur) { const hd = i >= cur - 1.6; return { x: S[i].x, y: S[i].y, col: hd ? C.hot : C.base, a: hd ? 1 : .85 }; } return { x: CX + Math.sin(i * 12.9 + tt * .02) * 140, y: CY - 98, col: C.base, a: .26 }; },
  construir(i, tt) { const S = BUILD_SLOTS, bt = (tt * .4) % (S.length + 64); if (i < S.length && i < bt) { const fr = i >= bt - 4; return { x: S[i].x, y: S[i].y, col: fr ? C.hot : C.base, a: 1 }; } const s = i % 2 ? 1 : -1; return { x: CX + s * (150 + Math.sin(i * 3.1 + tt * .05) * 40), y: CY - 70 + Math.cos(i * 2.3 + tt * .04) * 34, col: C.base, a: .5 }; },
  limpiar(i, tt) { const cp = (tt * .5) % (N + 50); if (i < cp) { const k = i % 140, gx = CX - 119 + (k % 20) * 12, gy = CY - 30 + Math.floor(k / 20) * 15; return { x: gx, y: gy, col: C.ok, a: 1 }; } const hx = 50 + (i * 89) % (W - 100), hy = 30 + (i * 53) % (STRIP_Y - 70); return { x: hx, y: hy, col: C.bad, a: .7, dirty: true }; },
  negociar(i, tt) { const L = i % 2 === 0, hub = { x: CX + (L ? -120 : 120), y: CY }; if (i % 7 === 0) { const ph = ((tt * .9 + i * 17) % 170) / 170, e = ease(ph), f = L ? -120 : 120; return { x: CX + f + (-2 * f) * e, y: CY - Math.sin(ph * Math.PI) * 44, col: C.hot, a: 1 }; } const a = i / N * 6.283 + tt * .01; return { x: hub.x + Math.cos(a) * 40, y: hub.y + Math.sin(a) * 40, col: L ? C.base : C.alt, a: .8 }; },
  bloqueado(i) { const p = i / N, d = p < .5 ? p / .5 : (p - .5) / .5, jx = (Math.random() - .5) * 2.6, jy = (Math.random() - .5) * 2.6; return { x: CX - 66 + d * 132 + jx, y: CY - 52 + (p < .5 ? d : 1 - d) * 104 + jy, col: C.bad, a: .92 }; },
  confirmado(i) { const p = i / N; let x: number, y: number; if (p < .4) { x = CX - 58 + p / .4 * 40; y = CY - 4 + p / .4 * 38; } else { x = CX - 18 + (p - .4) / .6 * 80; y = CY + 34 - (p - .4) / .6 * 70; } return { x: x + (i % 3 - 1) * 3, y: y + ((Math.floor(i / 3)) % 3 - 1) * 3, col: C.ok, a: 1 }; },
  buscar(i, tt) { const ph = ((tt * .85 + i * 3) % 130) / 130, ang = i * 2.399 + tt * .01, r = ph * 128, mk = i % 9 === 0; return { x: CX + Math.cos(ang) * r * 1.5, y: CY + Math.sin(ang) * r * .75, col: mk && ph > .7 ? C.hot : C.blue, a: (1 - ph) * .9 }; },
  planear(i, tt) { const al = .5 + .5 * Math.sin(tt * .02), nd = PLAN_NODES[i % 12], sx = CX + Math.sin(i * 9.1) * 160, sy = CY + Math.cos(i * 5.3) * 70, lit = Math.floor((tt * .06) % 12) === (i % 12); return { x: lerp(sx, nd.x, al), y: lerp(sy, nd.y, al), col: lit ? C.hot : C.base, a: .55 + .4 * al }; },
  herramienta(i, tt) { const a = i * 2.399 + tt * .14, r = 22 + (i % 3) * 7; return { x: CX + Math.cos(a) * r, y: CY + Math.sin(a) * r, col: C.alt, a: .8 + .2 * Math.sin(tt * .1 + i) }; },
  verificar(i, tt) { const cols = 36, rows = 6, rowH = 15, gx = CX - cols * 3.5 + (i % cols) * 7, gy = CY - 52 + Math.floor(i / cols) * rowH, scanY = CY - 52 + ((tt * 0.7) % (rows * rowH)), done = gy < scanY, at = Math.abs(gy - scanY) < 7.5; return { x: gx, y: gy, col: at ? C.warn : (done ? C.ok : C.base), a: at ? 1 : (done ? .85 : .5) }; },
  reintentar(i, tt) { const c = (1 - Math.cos(tt * .07)) / 2, r = (18 + (i % 6) * 10) * (.15 + c * .95), a = i / N * 6.283 + tt * .02; return { x: CX + Math.cos(a) * r * 1.4, y: CY + Math.sin(a) * r * .75, col: c > .85 ? C.ok : C.warn, a: .5 + .4 * c }; },
  enrutar(i, tt) { const g = i % 3, cx = CX + (g - 1) * 95, win = Math.floor((tt * .02) % 3), a = i * 2.399 + tt * .03, r = 30; return { x: cx + Math.cos(a) * r, y: CY + Math.sin(a) * r, col: C.hot, a: g === win ? 1 : .28 }; },
  streaming(i, tt) { const ph = ((tt * 1.4 + i * 6) % 180) / 180; return { x: lerp(CX - 60, CX + 180, ph), y: CY + ((i % 5) - 2) * 4, col: C.bone, a: (1 - ph) * .9 + .1 }; },
  desplegar(i, tt) { const ph = ((tt * 1.1 + i * 4) % 150) / 150; if (ph < .7) { const e = ph / .7; return { x: CX + ((i % 7) - 3) * 5, y: lerp(STRIP_Y - 20, CY - 70, e * e * e), col: C.base, a: .5 + e * .5 }; } const e = (ph - .7) / .3, ang = i * 2.399; return { x: CX + Math.cos(ang) * e * 130, y: (CY - 70) - Math.abs(Math.sin(ang)) * e * 36, col: C.ok, a: 1 - e }; },
};
