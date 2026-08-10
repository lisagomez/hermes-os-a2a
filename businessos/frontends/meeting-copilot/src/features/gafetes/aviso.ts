// Aviso de privacidad de la captura en eventos.
//
// Por qué esto vive en el código y no en un documento aparte: el grafo
// regulatorio de este repo (dimensión `datos-personales`) ya dictamina que
// capturar el contacto de una persona física sin aviso publicado sale `dudoso`,
// con bandera literal "sin aviso de privacidad publicado no hay vía lícita para
// prospección"; y que el contacto corporativo sale `permitido` PERO exige aviso
// accesible más un mecanismo para que el titular limite el uso (Art. 15 IV).
//
// Traducción a ingeniería: la versión del aviso vigente se guarda en CADA fila
// capturada, porque la base de licitud hay que poder demostrarla después, no
// afirmarla. Y mientras no haya aviso configurado, la pantalla lo grita — no se
// captura en silencio como si todo estuviera en orden.

export type EstadoAviso =
  | { configurado: true; url: string; version: string }
  | { configurado: false; motivo: string }

/** Marca que va en las filas capturadas sin aviso. Es deliberadamente fea: si
 *  aparece en la base de producción, alguien capturó datos sin cumplir y debe
 *  poder encontrarse con una consulta. */
export const AVISO_AUSENTE = 'SIN-AVISO'

export function leerEstadoAviso(
  url: string | undefined,
  version: string | undefined
): EstadoAviso {
  const u = (url ?? '').trim()
  const v = (version ?? '').trim()
  if (u.length === 0 || v.length === 0) {
    return {
      configurado: false,
      motivo:
        'No hay aviso de privacidad configurado. Sin un aviso publicado y accesible, ' +
        'capturar datos de contacto para prospección no tiene vía lícita (LFPDPPP Arts. 14 y 16). ' +
        'Configura NEXT_PUBLIC_AVISO_PRIVACIDAD_URL y NEXT_PUBLIC_AVISO_PRIVACIDAD_VERSION.',
    }
  }
  if (!/^https?:\/\//.test(u)) {
    return {
      configurado: false,
      motivo: `La URL del aviso ("${u}") no es una dirección web accesible. El aviso debe poder abrirse desde el gafete o el cartel del stand.`,
    }
  }
  return { configurado: true, url: u, version: v }
}

/** Qué versión se estampa en una fila. Sin aviso configurado NO se inventa una:
 *  se marca la ausencia, que es un dato verdadero y auditable. */
export function versionParaRegistro(estado: EstadoAviso): string {
  return estado.configurado ? estado.version : AVISO_AUSENTE
}

export const ESTADO_AVISO = leerEstadoAviso(
  process.env.NEXT_PUBLIC_AVISO_PRIVACIDAD_URL,
  process.env.NEXT_PUBLIC_AVISO_PRIVACIDAD_VERSION
)
