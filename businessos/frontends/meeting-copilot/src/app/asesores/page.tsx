import { Suspense } from 'react'
import { CatalogoAsesores } from '@/features/agenda/CatalogoAsesores'

export default function AsesoresPage() {
  // Suspense: el catálogo lee el filtro de la URL (useSearchParams).
  return (
    <Suspense>
      <CatalogoAsesores />
    </Suspense>
  )
}
