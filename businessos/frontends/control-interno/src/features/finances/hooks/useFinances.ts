'use client'

import { useCallback, useEffect, useState } from 'react'
import type { FinancesPayload, FinanceRange } from '../types/finances'

// Rango GLOBAL: manejar el rango recalcula TODA la página (curva, KPIs, runway).
export function useFinances(initialRange: FinanceRange = '30d') {
  const [data, setData] = useState<FinancesPayload | null>(null)
  const [range, setRange] = useState<FinanceRange>(initialRange)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchData = useCallback(async (targetRange: FinanceRange) => {
    setLoading(true)
    setError(null)
    try {
      const res = await fetch(`/api/finanzas?range=${targetRange}`, { cache: 'no-store' })
      if (!res.ok) {
        const body = (await res.json().catch(() => null)) as { error?: string } | null
        throw new Error(body?.error ?? `Error ${res.status}`)
      }
      setData((await res.json()) as FinancesPayload)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Error cargando finanzas')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchData(range)
  }, [fetchData, range])

  return { data, range, setRange, loading, error, refetch: () => fetchData(range) }
}
