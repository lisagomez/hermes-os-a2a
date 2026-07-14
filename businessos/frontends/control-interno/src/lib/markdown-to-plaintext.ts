/**
 * Convierte el markdown de una respuesta a TEXTO PLANO continuo, preservando los
 * saltos de párrafo pero SIN estructura de bloques.
 *
 * Se usa en el LECTOR (ReaderOverlay) para que el screen reader de iOS pueda
 * seleccionar/leer TODA la respuesta como un solo bloque: el markdown renderizado
 * la parte en N elementos DOM (<p>, <li>, <h2>, <pre>…) y el gesto de "tocar y
 * sostener" se detiene en el límite de cada uno. Un ÚNICO nodo de texto (con los
 * `\n\n` adentro, pintados con whitespace-pre-wrap) deja que la selección fluya de
 * un tirón — exactamente lo que se lograba a mano pegando en una app de notas.
 *
 * Idempotente. También quita el bloque de pensamiento (las sesiones CLI lo funden
 * en el content con marcadores <!--thinking-->…).
 */
export function markdownToPlainText(input: string): string {
  return input
    // pensamiento fuera (defensivo — normalmente ya viene stripeado)
    .replace(/<!--thinking-->[\s\S]*?<!--\/thinking-->/g, '')
    .replace(/<details>[\s\S]*?<\/details>/g, '')
    // bloques de código → su contenido crudo (sin backticks), conserva saltos
    .replace(/```[a-zA-Z0-9]*\n?([\s\S]*?)```/g, '$1')
    .replace(/`([^`]+)`/g, '$1')
    // links [texto](url) → texto
    .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1')
    // énfasis **x** / *x* / _x_
    .replace(/[*_]{1,3}([^*_]+)[*_]{1,3}/g, '$1')
    // headers, viñetas y quotes: quita el marcador, deja el texto
    .replace(/^#{1,6}\s+/gm, '')
    .replace(/^\s*[-*+]\s+/gm, '• ')
    .replace(/^\s*>\s?/gm, '')
    // HTML sobrante + entidades comunes
    .replace(/<[^>]*>/g, '')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    // normaliza espacios de línea y colapsa 3+ saltos a 2 (conserva párrafos)
    .replace(/[ \t]+/g, ' ')
    .replace(/\n{3,}/g, '\n\n')
    .trim()
}
