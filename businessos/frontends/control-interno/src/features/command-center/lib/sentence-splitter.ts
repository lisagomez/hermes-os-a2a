/**
 * Detector incremental de oraciones para TTS por oración (clave de la latencia).
 *
 * Recibe deltas de texto del stream y emite oraciones COMPLETAS en cuanto cierran,
 * para disparar el TTS de cada una sin esperar la respuesta entera.
 *
 * Modo ávido (eager): mientras NO se haya emitido el primer chunk, también corta en
 * coma/clausula tras ≥40 chars — así el PRIMER audio sale antes (baja time-to-first-audio).
 * Después del primer chunk, vuelve a cortes de oración normales (TTS no entrecortado).
 *
 * También limpia markdown/markup del texto que se lee en voz alta.
 */

export interface SplitResult {
  sentences: string[]
}

const SENTENCE_END = /([.!?…]+|\n{2,})/
const EAGER_END = /([.!?…,;:]+|\n{2,})/ // incluye cláusulas para el primer chunk

export class SentenceSplitter {
  private buffer = ''
  private firstEmitted = false

  static clean(text: string): string {
    return text
      .replace(/```[\s\S]*?```/g, ' ')
      .replace(/`([^`]+)`/g, '$1')
      .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1')
      .replace(/[*_#>]{1,3}/g, '')
      .replace(/\s+/g, ' ')
      .trim()
  }

  push(delta: string): SplitResult {
    this.buffer += delta
    const sentences: string[] = []

    // Estrategia: una vez emitido el primer chunk, cortamos por ORACIÓN completa.
    // Para el PRIMER chunk (latencia), aceptamos:
    //   - fin de oración (.!?…) con ≥6 chars  → "Vamos al punto." sale YA
    //   - o cláusula (,;:) con ≥22 chars       → evita cortar "$1,214" pero arranca rápido
    while (true) {
      if (!this.firstEmitted) {
        const s = SENTENCE_END.exec(this.buffer)
        if (s && s.index + s[0].length >= 6) {
          const end = s.index + s[0].length
          this.emit(this.buffer.slice(0, end), sentences)
          this.buffer = this.buffer.slice(end)
          continue
        }
        const c = EAGER_END.exec(this.buffer)
        if (c && c.index + c[0].length >= 22) {
          const end = c.index + c[0].length
          this.emit(this.buffer.slice(0, end), sentences)
          this.buffer = this.buffer.slice(end)
          continue
        }
        break
      }
      const match = SENTENCE_END.exec(this.buffer)
      if (!match) break
      const end = match.index + match[0].length
      this.emit(this.buffer.slice(0, end), sentences)
      this.buffer = this.buffer.slice(end)
    }
    return { sentences }
  }

  private emit(raw: string, out: string[]): void {
    const cleaned = SentenceSplitter.clean(raw)
    if (cleaned.length >= 2 && /[a-zA-ZáéíóúñÁÉÍÓÚÑ0-9]/.test(cleaned)) {
      out.push(cleaned)
      this.firstEmitted = true
    }
  }

  flush(): string | null {
    const cleaned = SentenceSplitter.clean(this.buffer)
    this.buffer = ''
    return cleaned.length >= 2 ? cleaned : null
  }

  reset(): void {
    this.buffer = ''
    this.firstEmitted = false
  }
}
