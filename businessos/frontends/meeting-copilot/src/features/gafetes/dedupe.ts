// Qué hacer cuando llega una captura que ya estaba.
//
// Función pura y separada de la pantalla a propósito: es la regla de negocio
// que decide si se pierde o no el trabajo de una persona, y tiene que poder
// ponerse en rojo sin montar un navegador.
import type { AsistenteEvento, DatosGafete } from './types'

export type ResultadoCaptura =
  | { tipo: 'nuevo'; lista: AsistenteEvento[]; asistente: AsistenteEvento }
  | { tipo: 'repetido'; lista: AsistenteEvento[]; asistente: AsistenteEvento }

/** Incorpora una captura a la lista del evento.
 *
 *  Si la huella ya existe, NO se crea otra fila: sube el contador de escaneos.
 *  Y —esto es lo que importa— **una corrección hecha a mano nunca se pisa por
 *  un re-escaneo**: si alguien arregló el nombre que venía mal en el gafete,
 *  volver a pasarlo por la cámara no debe devolverlo al valor equivocado. */
export function incorporarCaptura(
  lista: AsistenteEvento[],
  entrante: AsistenteEvento
): ResultadoCaptura {
  const idx = lista.findIndex((a) => a.huella === entrante.huella)
  if (idx === -1) return { tipo: 'nuevo', lista: [...lista, entrante], asistente: entrante }

  const previo = lista[idx]
  const fusionado: AsistenteEvento = {
    ...previo,
    escaneos: previo.escaneos + 1,
    // El trabajo manual manda sobre lo que vuelva a leer la máquina.
    datos: previo.corregido ? previo.datos : entrante.datos,
  }
  const copia = [...lista]
  copia[idx] = fusionado
  return { tipo: 'repetido', lista: copia, asistente: fusionado }
}

/** Aplica una edición manual y deja marcado que hubo mano humana.
 *  El texto crudo se conserva intacto: la corrección cambia la interpretación,
 *  nunca la evidencia. */
export function corregirDatos(
  lista: AsistenteEvento[],
  id: string,
  datos: DatosGafete
): AsistenteEvento[] {
  return lista.map((a) => (a.id === id ? { ...a, datos, corregido: true } : a))
}

/** Aviso blando: ¿ya hay alguien con este correo, aunque su gafete fuera otro?
 *  Pasa cuando la misma persona se captura a mano y luego por gafete. No
 *  bloquea nada — solo evita que el equipo escriba dos veces al mismo contacto. */
export function otroConMismoEmail(
  lista: AsistenteEvento[],
  email: string,
  excluirId: string
): AsistenteEvento | null {
  const buscado = email.trim().toLowerCase()
  if (buscado.length === 0) return null
  return lista.find((a) => a.id !== excluirId && a.datos.email.trim().toLowerCase() === buscado) ?? null
}

/** Cuántas capturas siguen viviendo solo en este navegador. Se pinta en
 *  pantalla: un dato que solo existe en un teléfono es un dato en riesgo, y
 *  callarlo sería exactamente el fallo invisible que este repo ya pagó tres
 *  veces. */
export function pendientesDeSincronizar(lista: AsistenteEvento[]): number {
  return lista.filter((a) => !a.sincronizado).length
}
