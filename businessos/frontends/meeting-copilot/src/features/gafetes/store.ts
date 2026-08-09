'use client'

import { useMemo } from 'react'
import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { nuevoId } from '@/shared/lib/format'
import { ESTADO_AVISO, versionParaRegistro } from './aviso'
import { corregirDatos, incorporarCaptura, type ResultadoCaptura } from './dedupe'
import { huellaDe } from './huella'
import type { AsistenteEvento, DatosGafete, FormatoQr, FuenteDato } from './types'

/** Almacén propio, separado de `meeting-copilot-datos`: los contactos de un
 *  evento son datos personales de terceros y conviene poder borrarlos (o
 *  migrarlos a Supabase) sin tocar el resto de la app. */
interface EstadoGafetes {
  asistentes: AsistenteEvento[]
  capturar: (entrada: {
    reunionId: string
    textoCrudo: string
    formato: FormatoQr
    datos: DatosGafete
    fuenteDato: FuenteDato
  }) => Promise<ResultadoCaptura['tipo']>
  corregir: (id: string, datos: DatosGafete) => void
  eliminar: (id: string) => void
}

export const useGafetesStore = create<EstadoGafetes>()(
  persist(
    (set, get) => ({
      asistentes: [],

      capturar: async ({ reunionId, textoCrudo, formato, datos, fuenteDato }) => {
        const entrante: AsistenteEvento = {
          id: nuevoId('ga'),
          reunionId,
          huella: await huellaDe(textoCrudo),
          textoCrudo,
          formato,
          datos,
          fuenteDato,
          corregido: false,
          escaneos: 1,
          // La versión del aviso se congela EN LA FILA, no se consulta después:
          // lo que importa es qué se le informó a esa persona ese día.
          avisoVersion: versionParaRegistro(ESTADO_AVISO),
          capturadoAt: new Date().toISOString(),
          sincronizado: false,
        }
        // El antiduplicado se aplica DENTRO del evento: la misma persona puede
        // aparecer legítimamente en dos ferias distintas.
        const delEvento = get().asistentes.filter((a) => a.reunionId === reunionId)
        const resto = get().asistentes.filter((a) => a.reunionId !== reunionId)
        const r = incorporarCaptura(delEvento, entrante)
        set({ asistentes: [...resto, ...r.lista] })
        return r.tipo
      },

      corregir: (id, datos) => set((s) => ({ asistentes: corregirDatos(s.asistentes, id, datos) })),

      eliminar: (id) => set((s) => ({ asistentes: s.asistentes.filter((a) => a.id !== id) })),
    }),
    { name: 'meeting-copilot-gafetes' }
  )
)

/** Asistentes de un evento, del más reciente al más viejo — en un stand lo que
 *  importa es lo que acabas de capturar, no lo de hace dos horas.
 *
 *  El filtrado va en un `useMemo` y NO dentro del selector a propósito: un
 *  selector que construye un arreglo nuevo devuelve una referencia distinta en
 *  cada lectura, zustand lo interpreta como "el estado cambió" y la vista entra
 *  en un bucle de renderizado infinito (React #185). Es la misma lección que
 *  `recording/capacidades.ts` ya dejó escrita sobre las referencias estables. */
export function useAsistentesDe(reunionId: string): AsistenteEvento[] {
  const todos = useGafetesStore((s) => s.asistentes)
  return useMemo(
    () =>
      todos
        .filter((a) => a.reunionId === reunionId)
        .sort((a, b) => b.capturadoAt.localeCompare(a.capturadoAt)),
    [todos, reunionId]
  )
}
