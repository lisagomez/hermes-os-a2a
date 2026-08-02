# Política de correo agéntico

> Documento 1 de 3 exigidos por SPEC-buzon-a2a §7.3 (declaración de aplicabilidad).
> Ámbito: servicio `buzon-a2a` (HERALDO-6) y los host-jobs `ingerir-entrantes.py`
> y `enviar-salientes.py`.
> Estado: **BORRADOR — sin firmar**. Requiere firma del responsable del SGSI antes
> de activar cualquier buzón (checklist §8).

## 1. Principio rector

Ningún componente que ejecuta un modelo tiene credenciales de correo, y ningún
correo sale sin firma de una persona. La supervisión humana no es una promesa
escrita: es una fila en `aprobaciones_salientes` que el motor **no puede
fabricar** porque no tiene con qué. Eso es lo que un auditor puede verificar.

## 2. Qué puede redactar el agente

Solo las clases declaradas en `buzones.clases_permitidas` de CADA buzón. Una
clase ausente de esa lista es una clase prohibida: el servicio rechaza la
petición antes de redactar (no la redacta "y ya veremos en la aprobación").

| Clase | Contenido permitido | Buzones típicos |
|---|---|---|
| `acuse_recibo` | Confirmar recepción y anunciar seguimiento humano | todos |
| `informacion_general` | Información **pública y aprobada** del catálogo | ventas@, contacto@ |
| `seguimiento` | Retomar un hilo sin aportar datos nuevos | ventas@ |

Ampliar esta tabla es un cambio de política: exige actualizar este documento
**y** `clases_permitidas`, no solo lo segundo.

## 3. Qué está prohibido categóricamente

Lo siguiente no depende del criterio del aprobador: son gates CRÍTICOS que
impiden que el borrador llegue siquiera a la bandeja (SPEC §3).

- Escribir a alguien fuera del hilo (`destinatarios_del_hilo`).
- Copia oculta, en cualquier circunstancia (`sin_bcc`).
- Reenviar o derivar contenido de otro hilo (`sin_reenvio`).
- Adjuntar cualquier cosa que no sea un ID del catálogo aprobado
  (`adjuntos_de_catalogo`).
- Incluir datos personales que aparecen en otros hilos
  (`sin_datos_personales_cruzados`).
- Dejar salir el token canario del sistema (`canario_ausente`).
- Incluir secretos con formato conocido (`sin_secretos`).

Y con severidad ALTA, revisables por el aprobador pero nunca por omisión:
enlaces fuera de dominios institucionales (`urls_de_dominio`), ausencia de la
leyenda de agente automatizado (`divulgacion_presente`) y exceso de cuota
(`cuota_por_buzon`).

## 4. Quién aprueba

Cada buzón nombra su rol aprobador en `buzones.aprobador_rol` (PM, CEO o CFO).
El aprobador ve, antes de firmar: el original **saneado** con marca de qué se
eliminó, el borrador, los destinatarios resueltos y de dónde salió cada uno, los
11 gates con su resultado individual, y la política aplicada. Firmar sin esos
seis elementos es teatro de control, y por eso la pantalla no permite hacerlo.

El aprobador **no envía**: firma. El envío es de `enviar-salientes.py`, que
vuelve a verificar integridad (¿cambió el cuerpo tras la firma?) y autenticidad
(¿existe la fila?) antes de tocar SMTP.

## 5. Modos de contraparte

Se fijan **por buzón**, nunca por organización: `ventas@` necesita recibir de
desconocidos y `legal@` no.

- **cerrado** — solo allowlist. Los desconocidos van a revisión humana con cero
  procesamiento por agente.
- **abierto_cuarentena** (default recomendado) — cualquiera escribe; los
  desconocidos operan con A5 obligatorio sin excepción, sin adjuntos salientes,
  sin datos más allá del catálogo público y máximo 2 intercambios antes de
  escalar a una persona nombrada.
- **abierto** — requiere firma de aceptación de riesgo del responsable del SGSI,
  registrada en `buzones.riesgo_firmado_por/en`. La base de datos rechaza la
  fila sin esa firma. No se recomienda para ningún buzón que reciba datos
  personales.

## 6. El interruptor

Cualquier persona con rol admin (A6, Guardian) puede activar `pausa_global` en
`buzon_control`. Con la pausa activa el gate `cuota_por_buzon` sale en rojo y
**nada sale**, sin importar qué esté aprobado. El interruptor se prueba en
simulacro antes de activar el primer buzón; un interruptor no probado no cuenta
como control.

## 7. Registro

Toda transición queda en `buzon_bitacora` (append-only con hash encadenado; los
triggers rechazan UPDATE y DELETE) con actor, evento, política aplicada y
resultado de gates. ISO/IEC 27001 A.5.33 y A.8.15.

## 8. Cambios a esta política

Este documento y el código son un solo cambio. Añadir un gate al supervisor sin
declararlo aquí, o ampliar `clases_permitidas` sin actualizar §2, deja la
política y el sistema divergentes — que es exactamente el hallazgo que un
auditor busca.

---

Firmado por: ______________________  Rol: ______________  Fecha: ____________
