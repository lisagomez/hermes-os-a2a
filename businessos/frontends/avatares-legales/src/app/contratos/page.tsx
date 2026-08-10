import { redirect } from 'next/navigation'

/** El segmento no tiene vista propia: manda a la primera pestaña. */
export default function SegmentoContratos() {
  redirect('/contratos/intake')
}
