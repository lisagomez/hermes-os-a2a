'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { ClipboardPaste, Mic, QrCode, Video } from 'lucide-react'
import { useAppStore } from '@/features/domain/store'
import type { Participante, Reunion, Segmento, TipoReunion, Transcripcion } from '@/features/domain/types'
import { ETIQUETA_TIPO_REUNION } from '@/features/domain/types'
import { contenidoDesdeSegmentos } from '@/features/domain/fixtures'
import { Callout, Card, Chip, PillToggle, SectionHeader } from '@/shared/components/ui'
import { nuevoId } from '@/shared/lib/format'

type Tab = 'audio' | 'texto' | 'virtual' | 'presencial'

/** Parsea texto pegado: acepta "Hablante: texto" por línea o texto corrido. */
export function parsearTextoPegado(texto: string): { segmentos: Segmento[]; hablantes: string[] } {
  const lineas = texto
    .split('\n')
    .map((l) => l.trim())
    .filter((l) => l.length > 0)
  const segmentos: Segmento[] = []
  const hablantes: string[] = []
  let t = 0
  for (const linea of lineas) {
    const m = linea.match(/^(?:\[(\d+):(\d{2})\]\s*)?([^:]{2,30}):\s*(.+)$/)
    const inicio = m?.[1] ? Number(m[1]) * 60 + Number(m[2]) : t
    const hablante = m ? m[3].trim() : 'desconocido'
    const cuerpo = m ? m[4] : linea
    if (!hablantes.includes(hablante)) hablantes.push(hablante)
    segmentos.push({ inicioS: inicio, finS: inicio + 10, hablante, texto: cuerpo, confianza: 0.9 })
    t = inicio + 10
  }
  return { segmentos, hablantes }
}

export function NuevaConversacion() {
  const router = useRouter()
  const agregarReunion = useAppStore((s) => s.agregarReunion)
  const [tab, setTab] = useState<Tab>('texto')
  const [titulo, setTitulo] = useState('')
  const [cuenta, setCuenta] = useState('')
  const [asesor, setAsesor] = useState('')
  const [tipo, setTipo] = useState<TipoReunion>('discovery')
  const [texto, setTexto] = useState('')
  const [error, setError] = useState<string | null>(null)

  const crearDesdeTexto = () => {
    setError(null)
    if (!titulo.trim() || !cuenta.trim() || !asesor.trim()) {
      setError('Título, cuenta y asesor son obligatorios: el análisis los usa para atribuir hablantes y scorecards.')
      return
    }
    const { segmentos, hablantes } = parsearTextoPegado(texto)
    if (segmentos.length < 3) {
      setError('La transcripción necesita al menos 3 líneas. Formato sugerido: "Hablante: texto" por línea.')
      return
    }
    const participantes: Participante[] = hablantes.map((h) => ({
      nombre: h,
      rol: h === asesor.trim() ? 'Asesor' : 'Cliente',
      lado: h === asesor.trim() ? 'interno' : 'cliente',
    }))
    const reunionId = nuevoId('r')
    const reunion: Reunion = {
      id: reunionId,
      titulo: titulo.trim(),
      cuenta: cuenta.trim(),
      tipoReunion: tipo,
      participantes,
      asesor: asesor.trim(),
      fecha: new Date().toISOString(),
      duracionS: segmentos.at(-1) ? Math.round(segmentos.at(-1)!.finS) : null,
      origen: 'texto',
      estado: 'analizada',
    }
    const transcripcion: Transcripcion = {
      id: nuevoId('t'),
      reunionId,
      motor: 'texto-pegado',
      confianzaGlobal: 'alta',
      contenido: contenidoDesdeSegmentos(segmentos),
      segmentos,
    }
    agregarReunion(reunion, transcripcion)
    router.push(`/reuniones/${reunionId}/insights`)
  }

  // Un evento presencial no produce transcripción: se crea la reunión vacía y
  // se entra directo a capturar contactos. Por eso no reusa `crearDesdeTexto`.
  const crearPresencial = () => {
    setError(null)
    if (!titulo.trim() || !cuenta.trim() || !asesor.trim()) {
      setError('Nombre del evento, cuenta y asesor son obligatorios: identifican dónde y con quién se capturó cada contacto.')
      return
    }
    const reunionId = nuevoId('r')
    agregarReunion({
      id: reunionId,
      titulo: titulo.trim(),
      cuenta: cuenta.trim(),
      tipoReunion: tipo,
      participantes: [],
      asesor: asesor.trim(),
      fecha: new Date().toISOString(),
      duracionS: null,
      origen: 'presencial',
      estado: 'capturada',
    })
    router.push(`/reuniones/${reunionId}/gafetes`)
  }

  const TABS: { id: Tab; etiqueta: string; Icono: typeof Mic }[] = [
    { id: 'audio', etiqueta: 'Subir audio', Icono: Mic },
    { id: 'texto', etiqueta: 'Pegar transcripción', Icono: ClipboardPaste },
    { id: 'virtual', etiqueta: 'Reunión virtual', Icono: Video },
    { id: 'presencial', etiqueta: 'Evento presencial', Icono: QrCode },
  ]

  return (
    <div className="mx-auto max-w-2xl space-y-4">
      <SectionHeader
        titulo="Nueva conversación"
        descripcion="Tres caminos terminan en el pipeline de análisis; el cuarto —evento presencial— captura contactos, que es lo que se hace de pie en un stand."
      />

      <PillToggle
        variante="suelto"
        etiqueta="Camino de entrada"
        valor={tab}
        onCambio={setTab}
        claseBoton="flex items-center gap-1.5 px-3 py-1.5 text-[13px] font-medium"
        opciones={TABS.map(({ id, etiqueta, Icono }) => ({
          id,
          testid: `tab-${id}`,
          contenido: (
            <>
              <Icono className="h-3.5 w-3.5" /> {etiqueta}
            </>
          ),
        }))}
      />

      {tab === 'audio' && (
        <Card className="space-y-3 p-5 text-center">
          <p className="text-sm text-ink">La subida de audio vive en la herramienta Voice Transcription, con cola y progreso.</p>
          <Link href="/herramientas/transcripcion" className="btn-primary mx-auto" data-testid="ir-voice-transcription">
            <Mic className="h-3.5 w-3.5" /> Abrir Voice Transcription
          </Link>
        </Card>
      )}

      {tab === 'virtual' && (
        <Card className="space-y-3 p-5">
          <div className="flex flex-wrap items-center gap-2">
            {['Zoom', 'Google Meet', 'Microsoft Teams'].map((p) => (
              <Chip key={p} tono="warning">{p} — próximamente</Chip>
            ))}
          </div>
          <p className="text-[13px] text-ink-secondary">
            La integración con reuniones virtuales (bot que se une y captura el audio) está diseñada en el roadmap. Hoy
            puedes simular el flujo con el audio de demostración de Voice Transcription — produce una reunión real dentro
            de la app.
          </p>
          <Link href="/herramientas/transcripcion" className="btn-secondary w-fit">Simular con audio demo</Link>
        </Card>
      )}

      {tab === 'presencial' && (
        <Card className="space-y-3 p-5">
          <p className="text-[13px] text-ink-secondary">
            Para ferias, expos y visitas: se crea el evento y entras directo a capturar contactos. No hay
            transcripción que analizar — lo que se guarda son las personas.
          </p>
          <div className="grid gap-3 sm:grid-cols-2">
            <label className="block text-[12px] font-medium text-ink-secondary">
              Nombre del evento
              <input value={titulo} onChange={(e) => setTitulo(e.target.value)} className="input mt-1" placeholder="Expo Logística 2026" data-testid="input-titulo-presencial" />
            </label>
            <label className="block text-[12px] font-medium text-ink-secondary">
              Cuenta / organizador
              <input value={cuenta} onChange={(e) => setCuenta(e.target.value)} className="input mt-1" placeholder="Centro Citibanamex" data-testid="input-cuenta-presencial" />
            </label>
            <label className="block text-[12px] font-medium text-ink-secondary">
              Asesor en el stand
              <input value={asesor} onChange={(e) => setAsesor(e.target.value)} className="input mt-1" placeholder="Valeria" data-testid="input-asesor-presencial" />
            </label>
            <label className="block text-[12px] font-medium text-ink-secondary">
              Tipo de reunión
              <select value={tipo} onChange={(e) => setTipo(e.target.value as TipoReunion)} className="input mt-1">
                {Object.entries(ETIQUETA_TIPO_REUNION).map(([v, e]) => (
                  <option key={v} value={v}>{e}</option>
                ))}
              </select>
            </label>
          </div>
          {error && (
            <Callout tono="danger" variante="inline" data-testid="error-nueva-presencial">
              <p className="text-[12px] text-danger">{error}</p>
            </Callout>
          )}
          <button type="button" className="btn-primary" onClick={crearPresencial} data-testid="crear-evento-presencial">
            Crear evento y capturar contactos
          </button>
        </Card>
      )}

      {tab === 'texto' && (
        <Card className="space-y-3 p-5">
          <div className="grid gap-3 sm:grid-cols-2">
            <label className="block text-[12px] font-medium text-ink-secondary">
              Título
              <input value={titulo} onChange={(e) => setTitulo(e.target.value)} className="input mt-1" placeholder="Discovery inicial — …" data-testid="input-titulo" />
            </label>
            <label className="block text-[12px] font-medium text-ink-secondary">
              Cuenta / empresa
              <input value={cuenta} onChange={(e) => setCuenta(e.target.value)} className="input mt-1" placeholder="Acme SA de CV" data-testid="input-cuenta" />
            </label>
            <label className="block text-[12px] font-medium text-ink-secondary">
              Asesor (tu nombre en la transcripción)
              <input value={asesor} onChange={(e) => setAsesor(e.target.value)} className="input mt-1" placeholder="Valeria" data-testid="input-asesor" />
            </label>
            <label className="block text-[12px] font-medium text-ink-secondary">
              Tipo de reunión
              <select value={tipo} onChange={(e) => setTipo(e.target.value as TipoReunion)} className="input mt-1">
                {Object.entries(ETIQUETA_TIPO_REUNION).map(([v, e]) => (
                  <option key={v} value={v}>{e}</option>
                ))}
              </select>
            </label>
          </div>
          <label className="block text-[12px] font-medium text-ink-secondary">
            Transcripción — una línea por intervención: “Hablante: texto” (timestamps [m:ss] opcionales)
            <textarea
              value={texto}
              onChange={(e) => setTexto(e.target.value)}
              rows={10}
              className="input mt-1 font-mono text-[12px]"
              placeholder={'Valeria: ¿Qué es lo que más se les complica hoy?\nMarco: Perdemos embarques cada mes porque…'}
              data-testid="input-transcripcion"
            />
          </label>
          {error && (
            <Callout tono="danger" variante="inline" data-testid="error-nueva">
              <p className="text-[12px] text-danger">{error}</p>
            </Callout>
          )}
          <button type="button" className="btn-primary" onClick={crearDesdeTexto} data-testid="crear-conversacion">
            Analizar conversación
          </button>
        </Card>
      )}
    </div>
  )
}
