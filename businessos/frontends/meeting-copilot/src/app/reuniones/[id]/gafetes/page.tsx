import { EscanerGafetes } from '@/features/gafetes/EscanerGafetes'

// Vista propia, NO `VistaReunion`: esa corta con "procesa su audio" cuando falta
// la transcripción, y una reunión presencial nunca va a tener una.
export default function Page() {
  return <EscanerGafetes />
}
