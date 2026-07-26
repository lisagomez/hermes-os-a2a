'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Circle, Download, Mic, MicOff, Pause, Play, ScanSearch, Send, Sparkles, Square, Trash2 } from 'lucide-react'
import { useTranscripcionStore } from '@/features/transcription/store'
import { useAppStore } from '@/features/domain/store'
import { AUDIO_DEMO, contenidoDesdeSegmentos } from '@/features/domain/fixtures'
import { playbookPorTipo } from '@/features/playbooks/defaults'
import type { Reunion, Transcripcion } from '@/features/domain/types'
import { Card, Chip, SectionHeader } from '@/shared/components/ui'
import { PROVIDER_STT } from '@/shared/lib/config'
import { nuevoId } from '@/shared/lib/format'
import { nombresSesion, useLiveStore } from './live-store'
import { crearFuenteDemo, crearFuenteMicrofono, webSpeechDisponible, type FuenteVivo } from './fuentes-vivo'
import { DiarizadorVivo } from './diarizacion'
import { PrompterPanel } from './PrompterPanel'
import { reunionVivoStub } from './prompter'
import { TranscripcionEnCurso } from './TranscripcionEnCurso'
import { Bitacora } from './Bitacora'
import { useBitacoraStore } from './bitacora-store'

type EstadoGrabacion = 'inactivo' | 'grabando' | 'pausado' | 'listo'

function nombreDefault(): string {
  const d = new Date()
  const p = (n: number) => String(n).padStart(2, '0')
  return `grabacion-${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}-${p(d.getHours())}${p(d.getMinutes())}.webm`
}

function fmtCrono(s: number): string {
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`
}

export function RecorderView() {
  const router = useRouter()
  const agregarArchivos = useTranscripcionStore((s) => s.agregarArchivos)
  const agregarReunion = useAppStore((s) => s.agregarReunion)
  const playbooks = useAppStore((s) => s.playbooks)
  const bitacora = useBitacoraStore()
  const {
    asesorActivo,
    fuente,
    atribucion,
    hablanteActual,
    asesorNombre,
    leadNombre,
    segmentos,
    setAsesor,
    setFuente,
    setAtribucion,
    setHablante,
    setAsesorNombre,
    setLeadNombre,
    agregarSegmento,
    setErrorVivo,
    resetSesion,
  } = useLiveStore()

  const [estado, setEstado] = useState<EstadoGrabacion>('inactivo')
  const [error, setError] = useState<string | null>(null)
  const [segundos, setSegundos] = useState(0)
  const [nombre, setNombre] = useState('')
  const [audioUrl, setAudioUrl] = useState<string | null>(null)

  const recorderRef = useRef<MediaRecorder | null>(null)
  const chunksRef = useRef<Blob[]>([])
  const blobRef = useRef<Blob | null>(null)
  const fuenteRef = useRef<FuenteVivo | null>(null)
  const streamRef = useRef<MediaStream | null>(null)
  const diarizadorRef = useRef<DiarizadorVivo | null>(null)
  const segundosRef = useRef(0)
  const registroRef = useRef<string | null>(null)

  useEffect(() => {
    if (estado !== 'grabando') return
    const id = setInterval(
      () =>
        setSegundos((s) => {
          segundosRef.current = s + 1
          return s + 1
        }),
      1000
    )
    return () => clearInterval(id)
  }, [estado])

  useEffect(() => {
    return () => {
      if (audioUrl) URL.revokeObjectURL(audioUrl)
      fuenteRef.current?.detener()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- limpieza al desmontar
  }, [])

  const soportado = typeof window !== 'undefined' && typeof window.MediaRecorder !== 'undefined' && !!navigator.mediaDevices
  const micVivoDisponible = typeof window !== 'undefined' && webSpeechDisponible()
  const grabandoOPausa = estado === 'grabando' || estado === 'pausado'
  const nombres = nombresSesion({ asesorNombre, leadNombre })
  const contextoCompleto = asesorNombre.trim().length > 0 && leadNombre.trim().length > 0

  const reunionVivo: Reunion = useMemo(
    () =>
      fuente === 'demo'
        ? { ...AUDIO_DEMO.reunionBase, id: 'sesion-demo', titulo: 'Sesión demo en vivo', estado: 'capturada' }
        : reunionVivoStub('sesion-vivo', 'Sesión en vivo', nombres),
    [fuente, nombres.interno, nombres.cliente] // eslint-disable-line react-hooks/exhaustive-deps
  )
  const playbook = playbookPorTipo('discovery', playbooks)

  // Diarización automática por voz: se calibra con la apertura del asesor y
  // aprende de las correcciones. Si no hay voz clara, cae al switch manual.
  const arrancarDiarizador = () => {
    if (!streamRef.current || diarizadorRef.current) return
    diarizadorRef.current = new DiarizadorVivo()
    diarizadorRef.current.iniciar(streamRef.current)
  }

  const atribuirHablante = (desdeS: number, hastaS: number): string => {
    const st = useLiveStore.getState()
    const n = nombresSesion(st)
    if (st.atribucion === 'auto' && diarizadorRef.current) {
      const lado = diarizadorRef.current.asignarVentana(desdeS, desdeS, hastaS)
      if (lado === 'interno') return n.interno
      if (lado === 'cliente') return n.cliente
    }
    return st.hablanteActual === 'Yo' ? n.interno : n.cliente
  }

  const arrancarFuente = () => {
    setErrorVivo(null)
    if (fuente === 'microfono' && atribucion === 'auto') arrancarDiarizador()
    const f = fuente === 'demo' ? crearFuenteDemo(agregarSegmento) : crearFuenteMicrofono(agregarSegmento, atribuirHablante, setErrorVivo)
    fuenteRef.current = f
    f.iniciar()
  }

  // Corrección de un clic desde la transcripción en curso: reasigna el segmento
  // Y re-entrena al diarizador con esa frase.
  const corregirHablante = (idx: number) => {
    const st = useLiveStore.getState()
    const n = nombresSesion(st)
    const seg = st.segmentos[idx]
    if (!seg) return
    const eraInterno = seg.hablante === n.interno
    st.reasignarSegmento(idx, eraInterno ? n.cliente : n.interno)
    diarizadorRef.current?.corregirSegmento(seg.inicioS, eraInterno ? 'cliente' : 'interno')
  }

  const iniciar = async () => {
    setError(null)
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      streamRef.current = stream
      const mime = MediaRecorder.isTypeSupported('audio/webm') ? 'audio/webm' : undefined
      const recorder = new MediaRecorder(stream, mime ? { mimeType: mime } : undefined)
      chunksRef.current = []
      const nombreArchivo = nombreDefault()
      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunksRef.current.push(e.data)
      }
      recorder.onstop = () => {
        const blob = new Blob(chunksRef.current, { type: recorder.mimeType || 'audio/webm' })
        blobRef.current = blob
        setAudioUrl(URL.createObjectURL(blob))
        setEstado('listo')
        stream.getTracks().forEach((t) => t.stop())
        // Registrar en la bitácora (metadata persistente; el binario en memoria).
        const st = useLiveStore.getState()
        const id = nuevoId('rec')
        registroRef.current = id
        bitacora.agregar(
          {
            id,
            titulo: nombreArchivo,
            fechaISO: new Date().toISOString(),
            duracionS: segundosRef.current,
            estado: 'lista',
            origen: st.asesorActivo ? 'sesion_asesor' : 'grabacion',
            asesorNombre: st.asesorActivo && st.asesorNombre.trim() ? st.asesorNombre.trim() : null,
            leadNombre: st.asesorActivo && st.leadNombre.trim() ? st.leadNombre.trim() : null,
            reunionId: null,
            mime: recorder.mimeType || 'audio/webm',
          },
          blob
        )
      }
      recorderRef.current = recorder
      recorder.start(1000)
      setSegundos(0)
      segundosRef.current = 0
      setNombre(nombreArchivo)
      resetSesion()
      if (asesorActivo) arrancarFuente()
      setEstado('grabando')
    } catch (e) {
      setError(
        e instanceof DOMException && (e.name === 'NotAllowedError' || e.name === 'PermissionDeniedError')
          ? 'Permiso de micrófono denegado. Autorízalo en el navegador (icono de candado junto a la URL) y vuelve a intentar.'
          : `No se pudo iniciar la grabación: ${e instanceof Error ? e.message : String(e)}`
      )
      setEstado('inactivo')
    }
  }

  const pausar = () => {
    recorderRef.current?.pause()
    fuenteRef.current?.pausar()
    setEstado('pausado')
  }
  const reanudar = () => {
    recorderRef.current?.resume()
    fuenteRef.current?.reanudar()
    setEstado('grabando')
  }
  const detener = () => {
    fuenteRef.current?.pausar() // conserva los segmentos capturados
    diarizadorRef.current?.detener() // deja de muestrear; las correcciones siguen funcionando
    recorderRef.current?.stop()
  }
  const descartar = () => {
    if (audioUrl) URL.revokeObjectURL(audioUrl)
    blobRef.current = null
    fuenteRef.current?.detener()
    fuenteRef.current = null
    diarizadorRef.current?.detener()
    diarizadorRef.current = null
    streamRef.current = null
    resetSesion()
    setAudioUrl(null)
    setSegundos(0)
    segundosRef.current = 0
    setEstado('inactivo')
  }
  const enviar = () => {
    if (!blobRef.current) return
    const filename = nombre.trim() || nombreDefault()
    agregarArchivos([{ filename, blob: blobRef.current }])
    if (registroRef.current) bitacora.actualizar(registroRef.current, { titulo: filename, estado: 'en_transcripcion' })
    router.push('/herramientas/transcripcion')
  }

  // El valor capturado por el Prompter no se pierde: los segmentos vivos se
  // vuelven una reunión normal y el flujo posterior recalcula de ellos.
  const guardarSesionAnalizada = () => {
    const reunionId = nuevoId('r')
    const prom = segmentos.reduce((a, s) => a + s.confianza, 0) / segmentos.length
    const titulo =
      fuente === 'demo'
        ? 'Sesión demo con asesor'
        : leadNombre.trim()
          ? `Discovery en vivo — ${leadNombre.trim()}`
          : `Sesión en vivo — ${new Date().toLocaleDateString('es-MX')}`
    const reunion: Reunion = {
      ...reunionVivo,
      id: reunionId,
      titulo,
      fecha: new Date().toISOString(),
      duracionS: segmentos.length > 0 ? Math.round(segmentos[segmentos.length - 1].finS) : null,
      estado: 'analizada',
    }
    const transcripcion: Transcripcion = {
      id: nuevoId('t'),
      reunionId,
      motor: fuente === 'demo' ? 'en-vivo (demo)' : 'en-vivo (web-speech)',
      confianzaGlobal: prom >= 0.9 ? 'alta' : prom >= 0.7 ? 'media' : 'baja',
      contenido: contenidoDesdeSegmentos(segmentos),
      segmentos,
    }
    agregarReunion(reunion, transcripcion)
    if (registroRef.current) bitacora.actualizar(registroRef.current, { estado: 'sesion_guardada', reunionId, titulo })
    router.push(`/reuniones/${reunionId}/insights`)
  }

  const toggleAsesor = () => {
    const nuevo = !asesorActivo
    setAsesor(nuevo)
    if (grabandoOPausa) {
      if (nuevo && !fuenteRef.current) arrancarFuente()
      if (!nuevo) {
        fuenteRef.current?.pausar()
        fuenteRef.current = null
      }
    }
  }

  const grabadora = (
    <Card className="space-y-4 p-6">
      <div className="flex flex-col items-center gap-3 text-center">
        <span
          className={`flex h-16 w-16 items-center justify-center rounded-full ${
            estado === 'grabando' ? 'animate-pulse bg-danger-muted text-danger' : 'bg-accent-muted text-accent'
          }`}
        >
          {grabandoOPausa ? <Circle className="h-6 w-6 fill-current" /> : <Mic className="h-7 w-7" />}
        </span>

        <p className="font-mono text-2xl font-semibold tabular-nums text-ink" data-testid="crono">
          {fmtCrono(segundos)}
        </p>

        <div className="flex items-center gap-2">
          {estado === 'inactivo' && (
            <button type="button" className="btn-primary" onClick={iniciar} data-testid="grabar">
              <Mic className="h-3.5 w-3.5" /> Grabar
            </button>
          )}
          {estado === 'grabando' && (
            <>
              <button type="button" className="btn-secondary" onClick={pausar} data-testid="pausar">
                <Pause className="h-3.5 w-3.5" /> Pausar
              </button>
              <button type="button" className="btn-primary" onClick={detener} data-testid="detener">
                <Square className="h-3.5 w-3.5" /> Detener
              </button>
            </>
          )}
          {estado === 'pausado' && (
            <>
              <button type="button" className="btn-secondary" onClick={reanudar}>
                <Play className="h-3.5 w-3.5" /> Reanudar
              </button>
              <button type="button" className="btn-primary" onClick={detener} data-testid="detener">
                <Square className="h-3.5 w-3.5" /> Detener
              </button>
            </>
          )}
        </div>

        {estado === 'grabando' && <Chip tono="danger">grabando</Chip>}
        {estado === 'pausado' && <Chip tono="warning">en pausa</Chip>}

        {asesorActivo && fuente === 'microfono' && grabandoOPausa && atribucion === 'manual' && (
          <div className="flex items-center gap-2 rounded-lg border border-line bg-surface px-3 py-1.5" data-testid="switch-hablante">
            <span className="text-[11px] font-medium text-ink-muted">¿Quién habla?</span>
            {([
              ['Cliente', nombres.cliente],
              ['Yo', nombres.interno],
            ] as const).map(([clave, etiqueta]) => (
              <button
                key={clave}
                type="button"
                onClick={() => setHablante(clave)}
                className={`rounded px-2 py-0.5 text-[12px] font-medium ${
                  hablanteActual === clave ? 'bg-accent-muted text-accent' : 'text-ink-secondary hover:text-ink'
                }`}
              >
                {etiqueta}
              </button>
            ))}
          </div>
        )}
        {asesorActivo && fuente === 'microfono' && grabandoOPausa && atribucion === 'auto' && (
          <Chip tono="info">voces identificadas por tono — toca un nombre en la transcripción para corregir</Chip>
        )}
      </div>

      {error && (
        <div className="flex items-start gap-2 rounded-lg bg-danger-muted px-3 py-2" data-testid="error-grabacion">
          <MicOff className="mt-0.5 h-4 w-4 shrink-0 text-danger" />
          <p className="text-[12px] text-danger">{error}</p>
        </div>
      )}

      {estado === 'listo' && audioUrl && (
        <div className="space-y-3 border-t border-line-subtle pt-4" data-testid="grabacion-lista">
          <audio controls src={audioUrl} className="w-full" />
          <label className="block text-[12px] font-medium text-ink-secondary">
            Nombre del archivo
            <input value={nombre} onChange={(e) => setNombre(e.target.value)} className="input mt-1" data-testid="nombre-grabacion" />
          </label>
          <div className="flex flex-wrap items-center gap-2">
            {asesorActivo && segmentos.length >= 3 && (
              <button type="button" className="btn-primary" onClick={guardarSesionAnalizada} data-testid="guardar-sesion">
                <ScanSearch className="h-3.5 w-3.5" /> Guardar sesión analizada ({segmentos.length} segmentos)
              </button>
            )}
            <button
              type="button"
              className={asesorActivo && segmentos.length >= 3 ? 'btn-secondary' : 'btn-primary'}
              onClick={enviar}
              data-testid="enviar-transcripcion"
            >
              <Send className="h-3.5 w-3.5" /> Enviar a transcripción
            </button>
            <a href={audioUrl} download={nombre || nombreDefault()} className="btn-secondary">
              <Download className="h-3.5 w-3.5" /> Descargar
            </a>
            <button type="button" className="btn-secondary" onClick={descartar}>
              <Trash2 className="h-3.5 w-3.5" /> Descartar
            </button>
          </div>
          {asesorActivo && segmentos.length >= 3 && (
            <p className="text-[11px] text-ink-muted">
              “Guardar sesión analizada” usa la transcripción capturada en vivo (insights al instante). “Enviar a
              transcripción” procesa el audio por la cola normal. La grabación ya quedó en la bitácora.
            </p>
          )}
        </div>
      )}
    </Card>
  )

  const columnaCentral = (
    <div className="space-y-4">
      {grabadora}
      <TranscripcionEnCurso
        grabando={estado === 'grabando'}
        pausado={estado === 'pausado'}
        onCorregir={fuente === 'microfono' ? corregirHablante : undefined}
      />
    </div>
  )

  return (
    <div className={`mx-auto space-y-4 ${asesorActivo ? 'max-w-5xl' : 'max-w-2xl'}`}>
      <SectionHeader
        titulo="Grabación"
        descripcion="Graba la reunión desde la app; con el modo asesor encendido, la guía en vivo te acompaña sin sacarte del flujo."
      />

      {/* Modo asesor: configuración contextual de la sesión */}
      <Card className="space-y-3 p-3">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <Sparkles className={`h-4 w-4 ${asesorActivo ? 'text-accent' : 'text-ink-muted'}`} />
            <div>
              <p className="text-[13px] font-semibold text-ink">Modo asesor</p>
              <p className="text-[11px] text-ink-secondary">
                Guía de la reunión en vivo: playbook, siguiente pregunta, gaps y señales — el mismo motor de Guided Meeting.
              </p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            {asesorActivo && (
              <select
                value={fuente}
                onChange={(e) => setFuente(e.target.value as 'microfono' | 'demo')}
                disabled={grabandoOPausa}
                className="input w-auto"
                aria-label="Fuente de señales en vivo"
                data-testid="fuente-vivo"
              >
                <option value="microfono" disabled={!micVivoDisponible}>
                  Micrófono (transcripción en vivo{micVivoDisponible ? '' : ' — no soportada aquí'})
                </option>
                <option value="demo">Señales demo (conversación de ejemplo)</option>
              </select>
            )}
            <button
              type="button"
              role="switch"
              aria-checked={asesorActivo}
              onClick={toggleAsesor}
              data-testid="toggle-asesor"
              className={`relative h-6 w-11 rounded-full transition-colors ${asesorActivo ? 'bg-accent' : 'bg-surface-muted border border-line'}`}
              title={asesorActivo ? 'Desactivar modo asesor' : 'Activar modo asesor'}
            >
              <span
                className={`absolute top-0.5 h-5 w-5 rounded-full bg-surface shadow transition-transform ${
                  asesorActivo ? 'translate-x-5' : 'translate-x-0.5'
                }`}
              />
            </button>
            <Chip tono={asesorActivo ? 'accent' : 'neutral'}>{asesorActivo ? 'activo' : 'apagado'}</Chip>
          </div>
        </div>

        {/* Contexto de la entrevista: solo con el modo asesor activo */}
        {asesorActivo && (
          <div className="grid gap-3 border-t border-line-subtle pt-3 sm:grid-cols-[1fr_1fr_auto]" data-testid="contexto-sesion">
            <label className="block text-[12px] font-medium text-ink-secondary">
              Nombre del asesor
              <input
                value={asesorNombre}
                onChange={(e) => setAsesorNombre(e.target.value)}
                disabled={grabandoOPausa}
                placeholder="p. ej. Valeria"
                className="input mt-1"
                title={grabandoOPausa ? 'Se fija al iniciar la grabación (atribuye los hablantes de la transcripción)' : undefined}
                data-testid="input-asesor-nombre"
              />
            </label>
            <label className="block text-[12px] font-medium text-ink-secondary">
              Nombre del lead entrevistado
              <input
                value={leadNombre}
                onChange={(e) => setLeadNombre(e.target.value)}
                disabled={grabandoOPausa}
                placeholder="p. ej. Marco (TransLogika)"
                className="input mt-1"
                data-testid="input-lead-nombre"
              />
            </label>
            <div className="flex items-end pb-1">
              {contextoCompleto ? (
                <Chip tono="success">contexto completo</Chip>
              ) : (
                <Chip tono="warning">sin nombres — la sesión usará “Yo / Cliente”</Chip>
              )}
            </div>

            {fuente === 'microfono' && (
              <div className="sm:col-span-3" data-testid="selector-atribucion">
                <span className="text-[12px] font-medium text-ink-secondary">Identificación de interlocutores</span>
                <div className="mt-1 flex flex-wrap items-center gap-2">
                  <div className="flex items-center rounded-lg border border-line bg-surface p-0.5">
                    {([
                      ['auto', 'Automática por voz'],
                      ['manual', 'Manual (switch)'],
                    ] as const).map(([clave, etiqueta]) => (
                      <button
                        key={clave}
                        type="button"
                        onClick={() => {
                          setAtribucion(clave)
                          if (clave === 'auto' && grabandoOPausa) arrancarDiarizador()
                        }}
                        data-testid={`atribucion-${clave}`}
                        className={`rounded-md px-2.5 py-1 text-[12px] font-medium transition-colors ${
                          atribucion === clave ? 'bg-accent-muted text-accent' : 'text-ink-secondary hover:text-ink'
                        }`}
                      >
                        {etiqueta}
                      </button>
                    ))}
                  </div>
                  <p className="text-[11px] text-ink-muted">
                    {atribucion === 'auto'
                      ? 'Heurística por tono de voz (beta): abre TÚ la conversación para calibrar tu voz; corrige cualquier frase tocando el nombre. Voces muy parecidas pueden confundirse.'
                      : 'Tú marcas quién habla con el switch durante la grabación.'}
                  </p>
                </div>
              </div>
            )}
          </div>
        )}
      </Card>

      {!soportado ? (
        <Card className="border-danger bg-danger-muted p-4">
          <p className="text-[13px] text-danger">
            Este navegador no soporta MediaRecorder — la grabación en-app necesita un navegador moderno (Chrome, Edge, Firefox).
          </p>
        </Card>
      ) : asesorActivo ? (
        <div className="grid gap-4 lg:grid-cols-[1fr_21rem]">
          {columnaCentral}
          <PrompterPanel reunion={reunionVivo} playbook={playbook} grabando={grabandoOPausa} />
        </div>
      ) : (
        columnaCentral
      )}

      <Bitacora sesionActiva={grabandoOPausa} />

      <Card className="p-4">
        <p className="text-[12px] text-ink-secondary">
          Provider de transcripción activo: <span className="font-medium">{PROVIDER_STT}</span>.
          {PROVIDER_STT === 'mock' && (
            <>
              {' '}
              Con el provider mock la grabación recorre TODO el pipeline (cola, progreso, análisis) pero la transcripción
              resultante es la demo — el audio real se transcribirá al conectar un provider real (faster-whisper /
              transcripcion-a2a), que ya recibe el binario de esta grabadora.
            </>
          )}
          {asesorActivo && fuente === 'microfono' && (
            <>
              {' '}
              La transcripción EN VIVO del modo asesor usa Web Speech del navegador (es-MX, requiere conexión); atribuye
              el hablante con el switch ¿Quién habla?.
            </>
          )}
        </p>
      </Card>
    </div>
  )
}
