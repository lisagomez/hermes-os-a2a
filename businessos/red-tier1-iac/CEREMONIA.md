# CEREMONIA DE LLAVES — Red Tier 1 (paso a paso)

> **Qué es**: el procedimiento humano, registrado y repetible, por el que nacen,
> se separan, se respaldan y se prueban las llaves de la red. La ceremonia es lo que
> convierte "dos organizaciones" de un dibujo a una verdad criptográfica: si las
> llaves de Operadora y Testigo nacen y viven separadas, comprometer una máquina
> no falsifica un endorsement. Si no, Org-Testigo es teatro.
> **Duración estimada**: 2-3 horas la primera vez. **Se hace UNA vez por red**
> (más el simulacro de revocación anual y las altas de identidades por cliente).

## Participantes y máquinas

| Rol | Quién | Máquina |
|---|---|---|
| Oficiante (Operadora) | La dueña | **Máquina A**: el servidor de red (Hetzner tier 1) |
| Testigo | La dueña con "sombrero Testigo" (ideal: 2ª persona de confianza) | **Máquina B**: laptop u otro VPS — **distinta de A, siempre** |
| Acta | Se escribe en vivo | Plantilla al final de este doc; copia en Supabase al terminar |

Material previo: gestor de contraseñas listo; **2 USB cifrados** (LUKS/VeraCrypt)
etiquetados RESPALDO-1 y RESPALDO-2; binarios `fabric-ca-client`, `peer`,
`configtxgen`, `osnadmin` en ambas máquinas **en la versión pineada del `.env`**;
canal seguro entre A y B para transferir certificados públicos (scp/magic-wormhole
— los certificados públicos pueden viajar; las llaves privadas JAMÁS viajan).

## Regla de oro (léela dos veces)

**Una llave privada nace donde va a vivir y muere donde nació.** Nada de generar
en A "y luego la paso". El comando `enroll` se ejecuta EN la máquina que custodiará
la llave. Lo único que cruza máquinas: certificados públicos, bloques de canal,
y secretos de registro de un solo uso (por el gestor de contraseñas, nunca por chat).

---

## Fase 0 — Preparación (15 min)
1. Verificar versiones en ambas máquinas: `fabric-ca-client version` == `.env`.
2. Crear las 3 contraseñas bootstrap en el gestor (32+ chars aleatorios):
   `CA_TLS_ADMIN_PW`, `CA_OP_ADMIN_PW`, `CA_TG_ADMIN_PW`. No se escriben en
   ningún archivo — se exportan en la shell al momento.
3. Abrir el acta (plantilla abajo) con fecha, participantes y hashes de los
   binarios (`sha256sum $(which fabric-ca-client)`).

## Fase 1 — Nacen las CAs (Máquina A, 15 min)
4. `export CA_TLS_ADMIN_PW=... CA_OP_ADMIN_PW=... CA_TG_ADMIN_PW=...`
5. `./scripts/01-cas.sh` — levanta ca-tls, ca-operadora, ca-testigo y enrola sus
   admins bootstrap.
6. **Respaldo inmediato de raíces** (no esperar a la Fase 5): copiar
   `organizaciones/fabric-ca/*/msp/keystore/` y `ca-cert.pem` a RESPALDO-1 y
   RESPALDO-2. Verificar con `sha256sum` que ambas copias coinciden. Al acta.
   *Por qué ya: si el disco muere entre la Fase 2 y la 5, la red entera es basura.*

## Fase 2 — Identidades de infraestructura (Máquina A, 20 min)
7. `./scripts/02-identidades-infra.sh` — registra y enrola peers, orderer,
   `admin-despliegue-op`, TLS de nodos y MSPs de organización (NodeOUs incluidos).
8. Guardar en el gestor los secretos de un solo uso que imprime. Al acta: lista
   de identidades emitidas con hash de cada certificado
   (`openssl x509 -noout -fingerprint -sha256 -in <cert>`).

## Fase 3 — El momento Testigo (Máquina B, 20 min) ⚠ EL PASO QUE NO SE NEGOCIA
9. Transferir a B por canal seguro SOLO: `tls-cert.pem` de ca-testigo.
10. Pasar el secreto de `admin-despliegue-tg` por el gestor de contraseñas
    (entrada compartida o en persona — nunca por mensajería plana).
11. En **Máquina B**, ejecutar el bloque que imprimió el script 02 (enroll de
    `admin-despliegue-tg` contra `https://<IP-A>:7056`). La llave privada del
    admin Testigo **nace en B**. Verificar que el secreto ya no sirve (segundo
    enroll debe fallar). Al acta: hash del certificado + confirmación de que
    la llave existe SOLO en B.
12. En B: respaldar esa llave en RESPALDO-2 (solo en el 2). Los dos respaldos
    dejan de ser idénticos a propósito: ni un USB robado reconstruye ambas orgs.

## Fase 4 — Identidades de servicio (Máquina A, 10 min)
13. `./scripts/03-identidades-servicio.sh` — emite `oraculo-pm` (rol=oraculo),
    `arbitro-1` (rol=arbitro), `listener-hermes` (rol=lector), con atributos
    `:ecert` (viajan dentro del certificado; el chaincode los lee).
14. Mover la wallet de `oraculo-pm` a `businessos/pm-a2a/identidad/` (permisos
    0400, dueño = usuario del servicio pm-a2a) y borrar el origen. Al acta.

## Fase 5 — Sellado de respaldos (10 min)
15. RESPALDO-1: raíces de CA + MSPs de infraestructura de A.
    RESPALDO-2: lo mismo + llave del admin Testigo (de B).
16. Guardar los USB en **ubicaciones físicas distintas** (la separación física es
    parte de la criptografía práctica). Anotar en el acta DÓNDE (en clave si hace
    falta) y el sha256 del contenido de cada uno.

## Fase 6 — Nace el canal (Máquinas A y B, 20 min)
17. En A: `./scripts/04-red-y-canal.sh canal-clientes-demo` — levanta la red,
    genera el génesis, une orderer y peer Operadora.
18. En B (o sesión separada con el msp Testigo): el admin Testigo une SU peer con
    el bloque del canal (comando que imprime el script). Que lo haga el Testigo
    no es formalismo: es el primer acto donde la doble firma es real.
19. Verificar: `peer channel list` muestra el canal en ambos peers. Al acta.

## Fase 7 — Simulacro de revocación (Máquina A, 15 min) — SIN ESTO NO HAY CLIENTES
20. `./scripts/05-simulacro-revocacion.sh` — emitir dummy → revocar → CRL →
    recargar MSP → **verificar que el peer RECHAZA** a la identidad revocada.
21. Si el rechazo no se observa, la ceremonia NO se cierra y la red no recibe
    clientes hasta resolverlo. Al acta con tiempo total del ciclo de revocación
    (ese número es tu SLA real ante una llave comprometida).

## Fase 8 — Cierre (10 min)
22. Limpiar shells (`history -c` en ambas máquinas), verificar que ningún secreto
    quedó en archivos (`grep -r` de los secretos en el árbol — deben ser 0 hits).
23. Firmar el acta (ambos roles), subir copia a Supabase, commitear al repo el
    kit IaC **sin** `organizaciones/` (ver .gitignore).

---

## Reglas permanentes post-ceremonia

- **Nunca sale**: llave del admin Testigo de B; raíces de CA del servidor+USBs;
  wallet del oráculo de `pm-a2a/identidad/`.
- **Altas por cliente** (tier 1): emitir comprador/vendedor con mini-ceremonia
  (registro con secreto de un solo uso → la parte enrola en SU dispositivo →
  acta de alta). La Operadora jamás custodia llaves de partes.
- **Rotación**: TLS de nodos anual; simulacro de revocación anual; las raíces de
  CA no rotan salvo compromiso (y eso es re-fundar la red: por eso los respaldos).
- **Compromiso sospechado**: revocar primero, investigar después — el simulacro
  de la Fase 7 es el ensayo de ese día.

## Plantilla de acta

```
ACTA DE CEREMONIA DE LLAVES — red-tier1
Fecha/hora inicio-fin:
Participantes (rol, nombre):
Versiones (fabric, fabric-ca, sha256 de binarios):
Identidades emitidas (id | tipo | attrs | sha256 cert | máquina donde nació la llave):
Respaldos (USB | contenido | sha256 | ubicación):
Canal creado: (nombre | ambos peers unidos S/N)
Simulacro de revocación: (rechazo observado S/N | tiempo total del ciclo)
Incidencias:
Firmas:
```
