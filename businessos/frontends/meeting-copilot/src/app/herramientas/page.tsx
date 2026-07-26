import { LauncherGrid } from '@/features/launcher/LauncherGrid'
import { SectionHeader } from '@/shared/components/ui'

export default function Page() {
  return (
    <div className="space-y-4">
      <SectionHeader
        titulo="Herramientas"
        descripcion="Todas las herramientas de la plataforma. Fija tus favoritas; también viven en el launcher de la barra superior (⌘K para buscar)."
      />
      <LauncherGrid />
    </div>
  )
}
