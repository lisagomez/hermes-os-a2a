#!/usr/bin/env node
/**
 * Detector del SEGUNDO TENANT — control C7.
 *
 * `businessos/gobernanza/decision-service-role.md` cierra con la condicion de
 * incumplimiento escrita en SQL:
 *
 *     select count(*) from organizaciones where tipo = 'tenant'
 *
 * mayor que 1 mientras las superficies sigan usando `service_role` para leer dato de
 * negocio. "Ese es el estado que esta decision declara inaceptable."
 *
 * Hasta hoy esa condicion se comprobaba A MANO, que es como decir que no se comprobaba.
 * El disparador de la migracion no es una fecha: es el alta del segundo tenant — y si nadie
 * mira, el dia que ocurra nadie se entera.
 *
 * Salidas:
 *   0  OK        — un solo tenant (o cero): C7 sigue en estado preventivo.
 *   1  ALERTA    — hay 2+ tenants y quedan superficies de negocio con service_role.
 *   2  NO SE     — no se pudo comprobar. NO es lo mismo que "esta bien", y por eso no
 *                  devuelve 0: un control que no pudo mirar no informa.
 *
 * Credenciales por entorno (nunca en el repo, nunca impresas):
 *   SUPABASE_URL  (o NEXT_PUBLIC_SUPABASE_URL)  ·  SUPABASE_SERVICE_ROLE_KEY
 *
 * Uso local:  SUPABASE_URL=... SUPABASE_SERVICE_ROLE_KEY=... node scripts/detector-segundo-tenant.mjs
 */
import { readFileSync } from 'node:fs';
import { resolve, dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const raiz = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const DECL = '.claude/gobernanza/superficies-service-role.json';

const url = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;

/** Cuantas superficies de NEGOCIO siguen con la llave que bypassa RLS. Si llegara a cero,
 *  el alta del segundo tenant deja de ser un problema y esto pasa a ser informativo. */
function superficiesDeNegocio() {
  try {
    const d = JSON.parse(readFileSync(join(raiz, DECL), 'utf8'));
    return (d.superficies ?? []).filter((s) => s.clase === 'superficie-negocio');
  } catch {
    return null;
  }
}

const negocio = superficiesDeNegocio();
if (negocio === null) {
  console.error(`✗ No se pudo leer ${DECL}: sin la declaracion no se sabe que superficies estan expuestas.`);
  process.exit(2);
}

if (!url || !key) {
  console.error('⚠  DETECTOR NO EJECUTADO — faltan SUPABASE_URL y/o SUPABASE_SERVICE_ROLE_KEY.');
  console.error('   Esto NO significa que no haya un segundo tenant: significa que nadie lo comprobo.');
  console.error(`   Superficies de negocio hoy con service_role: ${negocio.length}.`);
  console.error('   Para activarlo en CI hay que decidir que la llave viva en los secretos del repo:');
  console.error('   es una decision de alcance de credencial, no una tarea (ver BITACORA-CDC.md 2026-09-04).');
  process.exit(2);
}

const r = await fetch(`${url.replace(/\/$/, '')}/rest/v1/organizaciones?select=tipo`, {
  headers: { apikey: key, Authorization: `Bearer ${key}` },
});
if (!r.ok) {
  // El cuerpo puede traer detalle del proyecto: se reporta el codigo, nunca el cuerpo crudo.
  console.error(`✗ La consulta a organizaciones fallo con HTTP ${r.status}. No se pudo comprobar C7.`);
  process.exit(2);
}
const filas = await r.json();
const tenants = filas.filter((f) => f.tipo === 'tenant').length;

console.log(`organizaciones: ${filas.length} · tenants: ${tenants} · superficies de negocio con service_role: ${negocio.length}`);

if (tenants > 1 && negocio.length > 0) {
  console.error('');
  console.error('🚨 C7 EN INCUMPLIMIENTO — hay mas de un tenant y las superficies de negocio siguen');
  console.error('   usando service_role. En Supabase esa llave tiene BYPASSRLS: el aislamiento entre');
  console.error('   clientes vive EXCLUSIVAMENTE en el codigo de la aplicacion.');
  console.error('');
  console.error('   Este es el estado que `businessos/gobernanza/decision-service-role.md` declara');
  console.error('   INACEPTABLE. La primera a migrar, por exposicion, es la reserva publica:');
  for (const s of negocio) console.error(`     · ${s.archivo}${s.atencion ? '  <- ' + s.atencion : ''}`);
  console.error('');
  console.error('   Si se decide operar asi aunque sea un dia, tiene que quedar una entrada FIRMADA en');
  console.error('   .claude/gobernanza/REGISTRO-RIESGO.md. Ojo con el limite de C5: el daño recae sobre');
  console.error('   los clientes, que son terceros — puede que no sea firmable y haya que rediseñar.');
  process.exit(1);
}

console.log('✓ C7 en estado preventivo: el disparador (alta del segundo tenant) no ha ocurrido.');
process.exit(0);
