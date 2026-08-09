// Huella de un gafete: cómo se decide que dos capturas son el MISMO contacto.
//
// El mismo gafete leído dos veces —cosa que pasa constantemente en un stand,
// porque la gente vuelve— debe ser una fila con el contador en 2, no dos filas.
// La huella es el sha256 del texto crudo normalizado, y es exactamente la misma
// clave que usa el índice único de `evento_asistentes`: si el cálculo aquí y el
// de allá divergieran, el antiduplicado del navegador y el de la base dirían
// cosas distintas.

/** Normaliza ANTES de firmar. Cada paso está aquí porque un mismo gafete puede
 *  llegar escrito distinto sin que su contenido cambie:
 *  - marca de orden de bytes: la meten algunos lectores al principio;
 *  - CRLF → LF: el mismo QR leído desde Windows y desde Android;
 *  - espacios al final de cada línea: los añade el copiar/pegar;
 *  - NFC: "é" puede venir como un carácter o como "e" + acento combinado, que
 *    se ven idénticos en pantalla y son bytes distintos. */
export function normalizarParaHuella(texto: string): string {
  return texto
    .replace(/^﻿/, '')
    .replace(/\r\n?/g, '\n')
    .split('\n')
    .map((linea) => linea.replace(/[ \t]+$/, ''))
    .join('\n')
    .trim()
    .normalize('NFC')
}

/** sha256 en hexadecimal con WebCrypto, que existe igual en el navegador y en
 *  Node — así el cálculo es UNA implementación, no dos que puedan derivar. */
export async function huellaDe(texto: string): Promise<string> {
  const bytes = new TextEncoder().encode(normalizarParaHuella(texto))
  const digest = await crypto.subtle.digest('SHA-256', bytes)
  return Array.from(new Uint8Array(digest))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('')
}

/** Forma que la base exige (el CHECK de la columna `huella`). Se valida aquí
 *  para que un error de cálculo se vea en el navegador y no al insertar. */
export const FORMATO_HUELLA = /^[0-9a-f]{64}$/
