// Capacidades del navegador que necesita la grabadora (MediaRecorder) y la
// transcripción en vivo (Web Speech).
//
// Por qué un módulo y no un `typeof window !== 'undefined'` en el render: esa
// comprobación vale `false` en el servidor y `true` en el cliente, así que el
// HTML servido y el primer render del cliente pintan cosas distintas y React
// tira toda la vista con "Hydration failed". La regla: el primer render es
// igual en ambos lados (constante optimista) y la medición real ocurre YA
// montado, dentro de un efecto.
import { useSyncExternalStore } from 'react'

export interface Capacidades {
  /** `MediaRecorder` + `navigator.mediaDevices`: sin esto no hay grabación en-app. */
  grabacion: boolean
  /** Web Speech API: transcripción en vivo del modo asesor. */
  micVivo: boolean
}

/** Forma mínima del `window` que se inspecciona. Explicitarla permite probar la
 *  detección sin navegador — el gate de tests corre en entorno `node`. */
export interface VentanaCapaz {
  MediaRecorder?: unknown
  SpeechRecognition?: unknown
  webkitSpeechRecognition?: unknown
  navigator?: { mediaDevices?: unknown }
}

/** Lo que se pinta antes de saber: se asume soporte (el caso de casi todos los
 *  navegadores) para no servir la tarjeta de error ni un hueco en la página. */
export const CAPACIDADES_INICIALES: Capacidades = { grabacion: true, micVivo: true }

/** Medición honesta: sin ventana (servidor) no hay ninguna capacidad. */
export function detectarCapacidades(ventana: VentanaCapaz | undefined): Capacidades {
  if (!ventana) return { grabacion: false, micVivo: false }
  return {
    grabacion: typeof ventana.MediaRecorder !== 'undefined' && !!ventana.navigator?.mediaDevices,
    micVivo: (ventana.SpeechRecognition ?? ventana.webkitSpeechRecognition ?? null) !== null,
  }
}

// Las capacidades no cambian durante la vida de la página: se miden una vez y
// se cachean. `useSyncExternalStore` exige una referencia estable — recalcular
// un objeto nuevo en cada lectura haría re-renderizar sin fin.
let medidas: Capacidades | null = null

function capacidadesDelCliente(): Capacidades {
  if (!medidas) medidas = detectarCapacidades(typeof window === 'undefined' ? undefined : window)
  return medidas
}

function capacidadesDelServidor(): Capacidades {
  return CAPACIDADES_INICIALES
}

/** Nada a lo que suscribirse: el valor es fijo tras la primera medición. */
const sinSuscripcion = () => () => {}

/** Capacidades reales una vez hidratado; `CAPACIDADES_INICIALES` en el HTML del
 *  servidor Y en el render de hidratación (React usa el snapshot de servidor
 *  para ambos) → los dos árboles coinciden y no hay mismatch. */
export function useCapacidades(): Capacidades {
  return useSyncExternalStore(sinSuscripcion, capacidadesDelCliente, capacidadesDelServidor)
}
