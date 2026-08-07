'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Radar } from 'lucide-react'
import { useAppStore } from '@/features/domain/store'
import { usePreDiscoveryStore } from './store'
import { correrPipeline } from './pipeline'
import { useAdminPreDiscovery } from './admin-store'
import type { IntakeLead } from './types'
import { Button, Card, Chip, SectionHeader } from '@/shared/components/ui'
import { nuevoId } from '@/shared/lib/format'
import { MOTOR_AGENTE } from '@/shared/lib/config'

const INTAKE_VACIO: IntakeLead = { telefono: '', email: '', linkedin: '', web: '', tamano: '11-50', giro: '', categoria: '', pais: 'México', notas: '' }

const CATEGORIAS_PROFESIONALES = [
  'Legal',
  'Logística',
  'Marketing',
  'Ingeniería',
  'Retail / Comercio',
  'Finanzas / Contabilidad',
  'Tecnología / Software',
  'Salud',
  'Manufactura',
  'Educación',
  'Inmobiliario / Construcción',
  'Turismo / Hospitalidad',
  'Consultoría / Servicios profesionales',
  'Otro',
]

export function NuevoCaso() {
  const router = useRouter()
  const { leads, agregarLead } = useAppStore()
  const casos = usePreDiscoveryStore((s) => s.casos)
  const crearCaso = usePreDiscoveryStore((s) => s.crearCaso)

  const [leadSel, setLeadSel] = useState<string>('nuevo')
  const [empresa, setEmpresa] = useState('')
  const [contacto, setContacto] = useState('')
  const [intake, setIntake] = useState<IntakeLead>(INTAKE_VACIO)
  const [error, setError] = useState<string | null>(null)
  const [creando, setCreando] = useState(false)

  const campo = (k: keyof IntakeLead, etiqueta: string, placeholder: string, tipo = 'text') => (
    <label className="block text-[12px] font-medium text-ink-secondary">
      {etiqueta}
      <input
        type={tipo}
        value={intake[k]}
        onChange={(e) => setIntake({ ...intake, [k]: e.target.value })}
        placeholder={placeholder}
        className="input mt-1"
        data-testid={`intake-${k}`}
      />
    </label>
  )

  const crear = async () => {
    setError(null)
    let leadId = leadSel
    if (leadSel === 'nuevo') {
      if (!empresa.trim() || !contacto.trim()) {
        setError('Empresa y contacto son obligatorios para dar de alta el lead.')
        return
      }
      leadId = nuevoId('lead')
      agregarLead({ leadId, empresa: empresa.trim(), contacto: contacto.trim(), etapa: 'nuevo', origen: 'copilot', creadoAt: new Date().toISOString() })
    }
    if (!intake.giro.trim()) {
      setError('El giro (a qué se dedica) es obligatorio: ancla todo el análisis.')
      return
    }
    if (casos.some((c) => c.leadId === leadId)) {
      setError('Este lead ya tiene un caso de Pre-Discovery — ábrelo desde la lista (puedes regenerar sus bloques ahí).')
      return
    }
    setCreando(true)
    const casoId = crearCaso(leadId, intake)
    useAdminPreDiscovery.getState().log('crear_caso', `caso:${casoId} lead:${leadId} (${intake.giro})`)
    useAdminPreDiscovery.getState().log('analizar', `caso:${casoId} pipeline completo`)
    void correrPipeline(casoId) // corre en background; el workspace muestra el avance por bloque
    router.push(`/pre-discovery/${casoId}`)
  }

  return (
    <div className="mx-auto max-w-2xl space-y-4">
      <SectionHeader
        titulo="Nuevo caso de Pre-Discovery"
        descripcion="Con estos datos el sistema perfila al lead, analiza su sitio y arma el brief del asesor."
      />

      <Card className="space-y-3 p-5">
        <label className="block text-[12px] font-medium text-ink-secondary">
          Lead
          <select value={leadSel} onChange={(e) => setLeadSel(e.target.value)} className="input mt-1" data-testid="selector-lead">
            <option value="nuevo">— Dar de alta un lead nuevo —</option>
            {leads.map((l) => (
              <option key={l.leadId} value={l.leadId}>
                {l.empresa} ({l.contacto}, {l.etapa})
              </option>
            ))}
          </select>
        </label>
        {leadSel === 'nuevo' && (
          <div className="grid gap-3 sm:grid-cols-2">
            <label className="block text-[12px] font-medium text-ink-secondary">
              Empresa
              <input value={empresa} onChange={(e) => setEmpresa(e.target.value)} placeholder="Empresa" className="input mt-1" data-testid="intake-empresa" />
            </label>
            <label className="block text-[12px] font-medium text-ink-secondary">
              Contacto
              <input value={contacto} onChange={(e) => setContacto(e.target.value)} placeholder="Contacto" className="input mt-1" data-testid="intake-contacto" />
            </label>
          </div>
        )}

        <div className="grid gap-3 sm:grid-cols-2">
          {campo('telefono', 'Teléfono', '+52 …')}
          {campo('email', 'Correo', 'contacto@empresa.com', 'email')}
          {campo('linkedin', 'LinkedIn del contacto', 'https://linkedin.com/in/contacto')}
          {campo('web', 'Página web', 'https://empresa.com')}
          <label className="block text-[12px] font-medium text-ink-secondary">
            Tamaño de la empresa
            <select value={intake.tamano} onChange={(e) => setIntake({ ...intake, tamano: e.target.value })} className="input mt-1">
              {['1-10', '11-50', '51-200', '200+'].map((t) => (
                <option key={t} value={t}>{t} personas</option>
              ))}
            </select>
          </label>
          {campo('giro', 'A qué se dedica (giro)', 'Agencia de carga (freight forwarder)')}
          <label className="block text-[12px] font-medium text-ink-secondary">
            Categoría profesional
            <select
              value={intake.categoria}
              onChange={(e) => setIntake({ ...intake, categoria: e.target.value })}
              className="input mt-1"
              data-testid="intake-categoria"
            >
              <option value="">— Selecciona una categoría —</option>
              {CATEGORIAS_PROFESIONALES.map((c) => (
                <option key={c} value={c}>{c}</option>
              ))}
            </select>
          </label>
          {campo('pais', 'País / región', 'México')}
        </div>
        <label className="block text-[12px] font-medium text-ink-secondary">
          Notas iniciales del lead
          <textarea value={intake.notas} onChange={(e) => setIntake({ ...intake, notas: e.target.value })} rows={3} className="input mt-1" data-testid="intake-notas" />
        </label>

        <div className="flex items-center gap-2">
          <Button variante="primary" onClick={() => void crear()} disabled={creando} data-testid="crear-caso">
            <Radar className="h-3.5 w-3.5" /> {creando ? 'Creando…' : 'Crear y analizar'}
          </Button>
          <Chip tono={MOTOR_AGENTE === 'llm' ? 'accent' : 'warning'}>
            {MOTOR_AGENTE === 'llm' ? 'análisis con IA (sitio real + benchmark)' : 'análisis demo (activa AGENT_ENGINE=llm para el real)'}
          </Chip>
        </div>
        {error && <p className="rounded-s bg-danger-muted px-3 py-2 text-[12px] text-danger" data-testid="error-caso">{error}</p>}
      </Card>
    </div>
  )
}
