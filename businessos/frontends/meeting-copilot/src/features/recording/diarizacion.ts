// Diarización heurística en el navegador (2 hablantes) para la sesión en vivo.
// HONESTIDAD TÉCNICA: no es diarización ML — es clustering online del tono
// fundamental (F0) de la voz, frase por frase: la voz del asesor se calibra
// con la apertura de la llamada y cada frase se asigna al centroide más
// cercano. Voces muy parecidas pueden confundirse → siempre hay corrección de
// un clic y modo manual. El seam para diarización real (pyannote en
// transcripcion-a2a) es el mismo contrato Segmento.hablante.

export type LadoDiarizado = 'interno' | 'cliente' | 'desconocido'

// ─── Detección de pitch (autocorrelación, rango de voz humana) ──────────────

const F0_MIN = 60
const F0_MAX = 400
const UMBRAL_CLARIDAD = 0.5
const UMBRAL_ENERGIA = 0.005

/** F0 en Hz de una ventana de audio, o null si no hay voz clara. */
export function detectarPitch(buf: Float32Array, sampleRate: number): number | null {
  const n = buf.length
  let energia = 0
  for (let i = 0; i < n; i += 1) energia += buf[i] * buf[i]
  energia = Math.sqrt(energia / n)
  if (energia < UMBRAL_ENERGIA) return null

  const lagMin = Math.floor(sampleRate / F0_MAX)
  const lagMax = Math.min(Math.floor(sampleRate / F0_MIN), n - 1)
  let mejorLag = -1
  let mejorCorr = 0
  for (let lag = lagMin; lag <= lagMax; lag += 1) {
    let corr = 0
    for (let i = 0; i < n - lag; i += 1) corr += buf[i] * buf[i + lag]
    corr /= n - lag
    if (corr > mejorCorr) {
      mejorCorr = corr
      mejorLag = lag
    }
  }
  if (mejorLag <= 0) return null
  const claridad = mejorCorr / (energia * energia)
  if (claridad < UMBRAL_CLARIDAD) return null
  return sampleRate / mejorLag
}

// ─── Núcleo puro: clustering online de 2 voces ──────────────────────────────

const EMA = 0.25 // peso de actualización del centroide
const MARGEN_MISMA_VOZ = 0.16 // ±16% del centroide del asesor = misma voz

export class NucleoDiarizador {
  private centroInterno: number | null = null
  private centroCliente: number | null = null

  /** Asigna una frase por la mediana de su F0. La PRIMERA frase con voz
   *  calibra al asesor (quien abre la llamada). */
  asignarFrase(medianaHz: number | null): LadoDiarizado {
    if (medianaHz === null || !Number.isFinite(medianaHz)) return 'desconocido'
    if (this.centroInterno === null) {
      this.centroInterno = medianaHz
      return 'interno'
    }
    if (this.centroCliente === null) {
      const desvio = Math.abs(medianaHz - this.centroInterno) / this.centroInterno
      if (desvio <= MARGEN_MISMA_VOZ) {
        this.centroInterno = this.centroInterno * (1 - EMA) + medianaHz * EMA
        return 'interno'
      }
      this.centroCliente = medianaHz
      return 'cliente'
    }
    const dInterno = Math.abs(medianaHz - this.centroInterno)
    const dCliente = Math.abs(medianaHz - this.centroCliente)
    if (dInterno <= dCliente) {
      this.centroInterno = this.centroInterno * (1 - EMA) + medianaHz * EMA
      return 'interno'
    }
    this.centroCliente = this.centroCliente * (1 - EMA) + medianaHz * EMA
    return 'cliente'
  }

  /** Corrección humana: la frase con esta mediana era del OTRO hablante —
   *  mueve el aprendizaje al centroide correcto. */
  corregir(medianaHz: number | null, ladoCorrecto: 'interno' | 'cliente'): void {
    if (medianaHz === null || !Number.isFinite(medianaHz)) return
    if (ladoCorrecto === 'interno') {
      this.centroInterno = this.centroInterno === null ? medianaHz : this.centroInterno * (1 - EMA) + medianaHz * EMA
    } else {
      this.centroCliente = this.centroCliente === null ? medianaHz : this.centroCliente * (1 - EMA) + medianaHz * EMA
    }
  }

  get calibrado(): boolean {
    return this.centroInterno !== null
  }
}

// ─── Envoltura WebAudio: muestrea pitch del stream del micrófono ────────────

interface MuestraPitch {
  tMs: number
  hz: number | null
}

export class DiarizadorVivo {
  private ctx: AudioContext | null = null
  private analyser: AnalyserNode | null = null
  private timer: ReturnType<typeof setInterval> | null = null
  private muestras: MuestraPitch[] = []
  private inicioMs = 0
  readonly nucleo = new NucleoDiarizador()
  /** mediana usada por segmento (clave: inicioS del segmento) para corregir. */
  private medianas = new Map<number, number | null>()

  iniciar(stream: MediaStream): void {
    this.ctx = new AudioContext()
    const origen = this.ctx.createMediaStreamSource(stream)
    this.analyser = this.ctx.createAnalyser()
    this.analyser.fftSize = 2048
    origen.connect(this.analyser)
    this.inicioMs = Date.now()
    const buf = new Float32Array(this.analyser.fftSize)
    this.timer = setInterval(() => {
      if (!this.analyser || !this.ctx) return
      this.analyser.getFloatTimeDomainData(buf)
      this.muestras.push({ tMs: Date.now() - this.inicioMs, hz: detectarPitch(buf, this.ctx.sampleRate) })
      if (this.muestras.length > 3000) this.muestras.splice(0, 1000)
    }, 120)
  }

  detener(): void {
    if (this.timer) clearInterval(this.timer)
    this.timer = null
    void this.ctx?.close()
    this.ctx = null
    this.analyser = null
  }

  private medianaVentana(desdeS: number, hastaS: number): number | null {
    const voz = this.muestras
      .filter((m) => m.tMs >= desdeS * 1000 && m.tMs <= hastaS * 1000 && m.hz !== null)
      .map((m) => m.hz as number)
      .sort((a, b) => a - b)
    if (voz.length < 3) return null
    return voz[Math.floor(voz.length / 2)]
  }

  /** Lado de la frase [desdeS, hastaS] del reloj de la sesión. */
  asignarVentana(inicioSegmentoS: number, desdeS: number, hastaS: number): LadoDiarizado {
    const mediana = this.medianaVentana(desdeS, hastaS)
    this.medianas.set(inicioSegmentoS, mediana)
    return this.nucleo.asignarFrase(mediana)
  }

  /** Corrección de un clic desde la UI: reaprende con la frase corregida. */
  corregirSegmento(inicioSegmentoS: number, ladoCorrecto: 'interno' | 'cliente'): void {
    this.nucleo.corregir(this.medianas.get(inicioSegmentoS) ?? null, ladoCorrecto)
  }
}
