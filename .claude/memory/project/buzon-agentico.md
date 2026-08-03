# Buzón agéntico — HERALDO-6 / `buzon-a2a` (2026-08-02)

Correo institucional operado por agentes con **aprobación humana obligatoria**.
Spec: `SPEC-buzon-a2a.md` (raíz) · progreso: `PROGRESS-buzon-a2a.md` ·
ficha de activo: `businessos/activos/ACT-buzon-a2a-ficha.md`.

## Qué está vivo (2026-08-02)

`atencion@digifixapp.com` **en MODO ESPEJO** desde 2026-08-03T00:14Z: lee correo
real y redacta borradores, **sin enviar nada**. `buzon-jobs.sh` en cron cada 15
min (3,18,33,48). Primera corrida real: 17 entrantes, 2 borradores con los 11
gates en verde, 15 remitentes automáticos saltados.

- Servicio `buzon-a2a` :4900 (perfil `a2a`) + gates del buzón en `supervisor-a2a`
  (5 departamentos, 48 gates activos).
- Tres migraciones aplicadas a prod; 8 tablas con RLS **enable + FORCE**.
- Modo `abierto_cuarentena`, plantilla `soporte`, `clases_permitidas=["acuse_recibo"]`,
  `captar_leads=false`, aprobador `PM`.
- Dominio con SPF + **DKIM 2048** verificado + **DMARC `p=none`**.

## Las decisiones que NO son obvias

**El invariante es que ningún componente con modelo tiene credenciales de envío.**
La supervisión humana no es una política escrita: es una fila en
`aprobaciones_salientes` que el motor no puede fabricar porque no tiene con qué.

**OAuth por buzón, NO delegación de dominio** (la spec §5.1 pedía lo segundo).
En Google la delegación **no se puede acotar por buzón**: concede los scopes sobre
TODOS los usuarios del dominio y no hay equivalente al `ApplicationAccessPolicy`
de Microsoft. Con OAuth el alcance lo fija quien consiente, y
`obtener-token-gmail.py` lo **demuestra** con un control positivo antes de guardar
el token (lee el suyo ✅, otro del dominio → 403). Si esa segunda prueba pasara,
aborta.

⚠️ **El scope `gmail.modify` INCLUYE enviar** (su pantalla de consentimiento dice
"leer, redactar y enviar"). Dije en sesión que no había pedido envío y es
inexacto: la credencial del host puede enviar. El invariante se sostiene porque el
contenedor no la tiene, pero **si se quiere estrictamente solo-lectura hay que
re-consentir con `gmail.readonly`** y renunciar a marcar como leído (la
idempotencia ya la da `unique(buzon_id, proveedor_id)`).

**DMARC en `p=none`, no `p=reject`.** La spec pide reject, pero lo pide para un
**subdominio de envío nuevo** ("no hay flujo legado que romper"). En el apex, que
mueve el correo real del negocio, reject tumbaría en silencio a cualquier emisor
legítimo no alineado. Se endurece cuando los informes lo respalden.

## Los cinco bugs que solo destapó correr el ciclo REAL

Ninguno lo vieron 102 tests verdes ni dos dry-runs. El patrón vale más que la lista:

1. `AdaptadorGmail` con token estático → los de Gmail **caducan en 1h** (PR #218).
2. **Nadie orquestaba la redacción**: la cadena se paraba en `correos_entrantes`,
   así que el mínimo de 20 borradores era inalcanzable (PR #219 → `redactar-borradores.py`).
3. `captar_leads` existía como columna y **nadie la leía** → 7 leads basura de
   direcciones noreply (PR #220; borrados de prod).
4. `enviados_ultima_hora` mandaba `now()-interval'1hour'` **a PostgREST**, que no
   evalúa SQL en un filtro → HTTP 400 (PR #220). Los tests no podían cazarlo:
   `MockTransport` responde 200 a cualquier URL sin que Postgres la vea.
5. La leyenda de divulgación salía **vacía**: el compose fija `BUZON_LEYENDA=` y
   `os.environ.get(k, default)` **no aplica el default si la clave existe vacía**
   (PR #221). **Lo cazó el gate `divulgacion_presente`**, no un test — para eso
   existen los once.

## Gotchas operativos

- **El repo no es el runtime, tres veces el mismo día**: tras mergear hay que
  `git pull` en el servidor **y** reconstruir la imagen si el cambio vive dentro
  del contenedor. El 400 de PostgREST persistió una corrida entera por esto.
- **Nada criptográfico se transcribe desde imágenes**: la clave DKIM se leyó de una
  captura y una `l` minúscula se confundió con `I` mayúscula. El resultado era un
  RSA 2048 **válido** — pasó todas las validaciones estructurales — pero era otra
  clave, y solo Google lo detectó al verificar.
- Un token de Cloudflare se filtró al pegarlo en un `curl` que lo imprime. Rotado.
  Ver [[secretos-nunca-en-pantalla]].

## Lo que falta

- El mínimo de espejo (7 días **y** 20 borradores) corre, pero el buzón recibe casi
  solo notificaciones automáticas: se cumplirá por calendario sin enseñar mucho.
- **Nada impide que el buzón se responda a sí mismo** (remitente = su propia
  dirección). En espejo es inocuo; antes de activar hay que guardarlo.
- `dmarc@digifixapp.com` no existe: los informes rebotan (la política protege igual).
- Los tres documentos de `businessos/gobernanza/` siguen **sin firmar**.
