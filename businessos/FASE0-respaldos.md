# FASE 0 · Respaldos — runbook

Delta sobre `FASE0.md` §9 (que describe el modelo original de tarball → GitHub).
Este documento **sustituye** ese modelo como destino primario y lo degrada a copia
de conveniencia.

Objetivo: cumplir **3-2-1-1-0** sobre el estado real de Hermes OS, con un costo
adicional menor a $15 USD/mes y sin tocar la arquitectura de servicios.

- **3** copias · **2** medios distintos · **1** fuera de sitio · **1** inmutable ·
  **0** errores en restauración verificada

---

## 1. Qué se respalda (inventario)

Antes de escribir un script hay que saber qué se pierde si arde el servidor.
Este inventario es el contrato del runbook: **si algo no está aquí, no se respalda.**

| Activo | Ubicación | Método | Criticidad |
|---|---|---|---|
| Volúmenes `.hermes` ×3 (negocio, personal, clientes) | `/var/lib/docker/volumes/*hermes*/\_data` | borg (root) | **Crítico** — memoria del agente, irrecuperable |
| Postgres del grafo | contenedor `grafo-db` | `pg_dump` → staging → borg | **Crítico** — 33 reglas del seed + evaluaciones |
| Volumen `caddy-data` (certs Let's Encrypt) | volumen docker | borg | Bajo — se regenera solo |
| `docker-compose.yml` + `.env` del server | `/opt/hermes/` | borg, **cifrado con age** | **Crítico** — contiene secretos |
| `trio-workspace` | volumen docker | borg | Medio |
| Material criptográfico Fabric (MSP, CAs) | `businessos/red-tier1-iac/` | **NO va a respaldo en línea** — ver §7 | **Máximo** |
| Supabase (tablas `token_usage`, `facturas`, `tareas`, `leads`, `contratos_sc`, esquema `erp`, `crm_*`) | Supabase gestionado | PITR del proveedor + dump lógico semanal | **Crítico** |
| Repos de código | GitHub `lisagomez/hermes-os-a2a` | ya versionado | Bajo |

**Regla de exclusión:** ningún respaldo contiene secretos en claro. El `.env` y
cualquier credencial se cifran con `age` **antes** de entrar al archivo, con llave
que vive fuera del servidor.

---

## 2. Topología

```
                  ┌─ copia 1: el servidor mismo (RAID 1 / producción)
                  │
  Hetzner cx33 ───┼─ copia 2: Storage Box BX11 vía Borg  ......... diaria, granular
                  │            (append-only, ~€4/mes)
                  │
                  └─ copia 3: Backblaze B2 + Object Lock ......... mensual, INMUTABLE
                               (archivo cifrado con age, ~$1/mes)

  copia 4 (trimestral, manual): disco cifrado en el domicilio fiscal (MX)
                               — disponibilidad art. 28 III CFF
```

**Por qué dos destinos y no uno:** Borg da deduplicación y restauración granular
pero su modelo de `prune` es incompatible con Object Lock (el bucket rechaza los
borrados y el costo crece sin techo). El archivo mensual cifrado sí tolera Object
Lock. Cada herramienta hace lo que hace bien.

**Por qué se retira GitHub:** el token que empuja el respaldo vive en el mismo
servidor que respalda. Un atacante con acceso al host borra origen y destino en la
misma sesión. GitHub queda como espejo de conveniencia, nunca como copia de
recuperación.

---

## 3. Retención

| Nivel | Cantidad | Destino | Motivo |
|---|---|---|---|
| Diario | 7 | Storage Box | Error operativo reciente |
| Semanal | 4 | Storage Box | Problema detectado tarde |
| Mensual | 12 | Storage Box + B2 | Corrupción silenciosa, disputa |
| Anual | 7 | B2 con Object Lock | Art. 30 CFF (5 años) + margen |

Los 7 días actuales cubren el 60% de los escenarios reales de pérdida. Los
mensuales cubren el resto.

---

## 4. Instalación (una sola vez)

### 4.1 Paquetes

```bash
apt update && apt install -y borgbackup age rclone
```

### 4.2 Storage Box

Contratar un BX11 (1 TB). Crear una **subcuenta** dedicada (no la principal) con
acceso SSH habilitado y directorio propio.

```bash
ssh-keygen -t ed25519 -f /root/.ssh/borg_storagebox -N ""
# subir la pública a la subcuenta (puerto 23, no 22)
ssh-copy-id -p 23 -i /root/.ssh/borg_storagebox.pub uXXXXXX-sub1@uXXXXXX.your-storagebox.de
```

**Modo append-only.** En el `.ssh/authorized_keys` de la subcuenta, antepón a la
llave:

```
command="borg serve --append-only --restrict-to-path /home/borg",restrict ssh-ed25519 AAAA...
```

> **GATE 1 — verificar antes de confiar.** Confirma que la restricción opera de
> verdad: con esa llave, `borg delete` y `borg prune` deben **fallar**. Si no
> fallan, la inmutabilidad de este nivel no existe y toda la carga recae en B2.
> El `prune` se ejecuta entonces desde una segunda llave administrativa que **no**
> vive en el servidor (se usa manualmente desde la laptop de la dueña, mensual).

### 4.3 Inicializar el repositorio

```bash
export BORG_REPO="ssh://uXXXXXX-sub1@uXXXXXX.your-storagebox.de:23/./borg/hermes"
export BORG_RSH="ssh -i /root/.ssh/borg_storagebox -p 23"
borg init --encryption=repokey-blake2
```

Guarda la frase de paso en `/root/.borg-pass` (chmod 600) **y** exporta la llave
para custodia fuera del servidor:

```bash
borg key export --paper $BORG_REPO /root/borg-key-paper.txt
```

> Imprime ese archivo, guárdalo físicamente y **bórralo del servidor**. Sin la
> llave, el respaldo es ruido cifrado. Este es el punto donde más proyectos
> descubren que no tenían respaldo.

### 4.4 Llave de cifrado para el archivo mensual

```bash
age-keygen -o /root/age-hermes.key   # la PRIVADA sale del servidor
grep "public key" /root/age-hermes.key   # la PÚBLICA se queda
```

La privada va a la custodia física junto con la llave paper de Borg. En el
servidor solo queda la pública: el host puede cifrar, no descifrar. Si el
servidor cae en manos ajenas, los archivos mensuales siguen siendo opacos.

### 4.5 Backblaze B2

Crear bucket `hermes-archivo` con **Object Lock activado en governance mode**,
retención por defecto **2555 días** (7 años). Llave de aplicación restringida a
ese bucket, sin permiso `deleteFiles`.

```bash
rclone config   # remote tipo b2, con la llave restringida
```

---

## 5. Script diario — `businessos/respaldo/borg-diario.sh`

Cron **04:17** (misma ventana que el actual `backup-verticales.sh`, que se retira
al cerrar el GATE 3).

```bash
#!/usr/bin/env bash
set -euo pipefail

export BORG_REPO="ssh://uXXXXXX-sub1@uXXXXXX.your-storagebox.de:23/./borg/hermes"
export BORG_RSH="ssh -i /root/.ssh/borg_storagebox -p 23"
export BORG_PASSCOMMAND="cat /root/.borg-pass"
STAGING=/var/tmp/respaldo-staging
AGE_PUB="age1xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx"

rm -rf "$STAGING"; mkdir -p "$STAGING"; chmod 700 "$STAGING"

# --- 1. Dumps consistentes (NUNCA copiar archivos de postgres en caliente) ---
docker exec grafo-db pg_dump -U postgres --format=custom grafo \
  > "$STAGING/grafo.dump"

# --- 2. Secretos cifrados antes de tocar el archivo ---
age -r "$AGE_PUB" -o "$STAGING/env.age" /opt/hermes/.env

# --- 3. Archivo ---
borg create --stats --compression zstd,3 \
  --exclude '*/node_modules' --exclude '*/.cache' --exclude '*/tmp' \
  ::'hermes-{now:%Y-%m-%dT%H:%M}' \
  /var/lib/docker/volumes/hermes_negocio-hermes/_data \
  /var/lib/docker/volumes/hermes_personal-hermes/_data \
  /var/lib/docker/volumes/hermes_clientes-hermes/_data \
  /var/lib/docker/volumes/hermes_trio-workspace/_data \
  /var/lib/docker/volumes/hermes_caddy-data/_data \
  /opt/hermes/docker-compose.yml \
  "$STAGING"

rm -rf "$STAGING"

# --- 4. Marca de éxito para el monitor de §8 ---
date -Iseconds > /var/lib/hermes/ultimo-respaldo-ok
```

> **Gotcha (mismo patrón que el de FASE0 §9):** los volúmenes son `0700`/uid-10000.
> Este script corre como **root en el host**, no dentro de un contenedor de agente.
> El agente no puede ni debe leerlos.

> **Gotcha 2:** `pg_dump` primero, `borg create` después. Copiar el directorio de
> datos de Postgres en caliente produce un respaldo que restaura y luego se
> corrompe — el peor modo de falla, porque parece que funcionó.

---

## 6. Script mensual — `businessos/respaldo/archivo-mensual.sh`

Cron día 1, **05:00**.

```bash
#!/usr/bin/env bash
set -euo pipefail
AGE_PUB="age1xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx"
MES=$(date +%Y-%m)
OUT=/var/tmp/hermes-$MES.tar.zst.age

# Dump lógico de Supabase (además del PITR del proveedor)
pg_dump "$SUPABASE_URI" --format=custom --no-owner > /var/tmp/supabase-$MES.dump

tar -C /var/lib/docker/volumes -cf - . \
  | zstd -3 \
  | age -r "$AGE_PUB" > "$OUT"

rclone copyto "$OUT" "b2:hermes-archivo/$MES/hermes.tar.zst.age"
rclone copyto /var/tmp/supabase-$MES.dump "b2:hermes-archivo/$MES/supabase.dump"
rm -f "$OUT" /var/tmp/supabase-$MES.dump
```

Object Lock hace el resto: una vez subido, ni el servidor ni la llave de
aplicación pueden borrarlo durante 7 años. **Esta es la copia que sobrevive al
ransomware y a la suspensión de la cuenta de Hetzner.**

---

## 7. Material criptográfico de Fabric

**No va en ningún respaldo automatizado.** El MSP de la Operadora y del Testigo
son el equivalente a las llaves de una caja fuerte: respaldarlas en línea anula la
separación de organizaciones que la ceremonia construyó.

- Llaves en **YubiKey 5** (una por organización, ~$55 c/u) o **YubiHSM 2** (~$650)
  si se quiere ceremonia reproducible.
- Respaldo: material de recuperación en sobre sellado, custodia física separada
  (Operadora y Testigo en ubicaciones distintas).
- Lo que sí se respalda: la **configuración** de la red (`red-tier1-iac/`,
  ya versionada en git) y el **CRL**. Nunca las llaves privadas.

> Esto debe quedar resuelto **antes** de la ceremonia real de Fase 12. Rehacerlo
> después implica repetir la ceremonia completa.

---

## 8. GATE 3 — verificación de restauración (el que hace real todo lo demás)

Un respaldo no probado es una hipótesis. Cadencia **trimestral**, cronometrada,
con salida escrita al registro.

`businessos/respaldo/verificar-restauracion.sh`:

```bash
#!/usr/bin/env bash
set -euo pipefail
INICIO=$(date +%s)
DEST=/var/tmp/restauracion-prueba
rm -rf "$DEST"; mkdir -p "$DEST"

ARCHIVO=$(borg list --last 1 --short)
borg extract --destination "$DEST" "::$ARCHIVO"

# Aserción 1: la memoria del agente existe y no está vacía
test -s "$DEST"/var/lib/docker/volumes/hermes_negocio-hermes/_data/memory/*.md

# Aserción 2: el dump del grafo restaura en un postgres efímero
docker run -d --name pg-prueba -e POSTGRES_PASSWORD=x postgres:16-alpine
sleep 8
docker exec -i pg-prueba pg_restore -U postgres -d postgres --no-owner \
  < "$DEST"/var/tmp/respaldo-staging/grafo.dump

# Aserción 3: el seed real está completo (33 reglas)
REGLAS=$(docker exec pg-prueba psql -U postgres -tAc "select count(*) from reglas")
test "$REGLAS" -ge 33 || { echo "FALLO: solo $REGLAS reglas"; exit 1; }

docker rm -f pg-prueba; rm -rf "$DEST"
echo "RTO medido: $(( $(date +%s) - INICIO ))s"
```

Mismo espíritu que el simulacro de revocación de Fabric: **rechazo observado +
control positivo**. No basta con que el script termine en 0; tiene que fallar
cuando debe fallar. Prueba a mano una vez con un archivo corrupto y confirma que
sale con exit 1.

**RPO/RTO declarados tras cerrar este gate:** RPO 24h · RTO 4h.
Antes de cerrarlo, ambos son desconocidos.

---

## 9. Monitoreo del respaldo

El modo de falla más común no es que el respaldo se corrompa: es que **deje de
correr** y nadie se entere durante cinco meses.

Reusar el patrón de `alerta-presupuesto.sh` (host-job, sin LLM, `hermes send`):

```bash
# cron 09:00 — respaldo-vigilante.sh
ULTIMO=$(cat /var/lib/hermes/ultimo-respaldo-ok 2>/dev/null || echo "1970-01-01")
HORAS=$(( ($(date +%s) - $(date -d "$ULTIMO" +%s)) / 3600 ))
if [ "$HORAS" -gt 30 ]; then
  hermes send "⚠️ Respaldo sin correr hace ${HORAS}h — revisar borg-diario.sh"
fi
```

---

## 10. Copia en el domicilio fiscal (trimestral, manual)

El <b>art. 28 fracción III del CFF</b> exige que la documentación comprobatoria de
los registros contables esté **disponible en el domicilio fiscal**. Alojar en
Falkenstein no lo viola, pero en una revisión la diferencia entre "disponible" y
"almacenada" la resuelve tu capacidad de producir archivos rápido.

Trimestral: descargar el archivo mensual más reciente de B2 a un disco externo
cifrado (LUKS o VeraCrypt), guardado en el domicilio fiscal. Costo ~$60 una vez,
elimina la discusión.

---

## 11. Checklist de aceptación

- [ ] Storage Box contratada, subcuenta creada, llave SSH dedicada
- [ ] **GATE 1**: `borg delete` falla con la llave del servidor (append-only real)
- [ ] Repo Borg inicializado; llave paper **impresa y borrada del servidor**
- [ ] Llave `age` privada fuera del servidor; solo la pública en el host
- [ ] Bucket B2 con Object Lock 2555 días; llave sin `deleteFiles`
- [ ] `borg-diario.sh` en cron 04:17, primera corrida verde con `--stats`
- [ ] `archivo-mensual.sh` en cron día 1; primera subida confirmada en B2
- [ ] **GATE 3**: restauración verificada de punta a punta, RTO medido y anotado
- [ ] `respaldo-vigilante.sh` en cron 09:00, probado con marca sintética
- [ ] Plan de Supabase confirmado **con PITR** (si no, el RPO real es 24h)
- [ ] Llaves Fabric en YubiKey, fuera del respaldo en línea
- [ ] `backup-verticales.sh` retirado (GitHub queda como espejo, no como respaldo)
- [ ] Primera copia trimestral en el domicilio fiscal

---

## 12. Costo

| Concepto | Mensual |
|---|---|
| Storage Box BX11 (1 TB) | ~€4.00 |
| Backblaze B2 (~150 GB creciendo) | ~$1.00 |
| YubiKey ×2 | $110 una vez |
| Disco externo cifrado | $60 una vez |
| **Total recurrente adicional** | **~$6 USD/mes** |

Contra los ~$9/mes del servidor: **por menos del doble del costo actual se cierra
el hueco de inmutabilidad**, que es el único modo de falla del que hoy no hay
salida. Los escalones E2 y E3 del análisis de escala cuestan órdenes de magnitud
más y cierran riesgos menos probables.

---

## Principios que aplica este runbook

- **Verificar antes de confiar** (principio 6): GATE 1 y GATE 3 no son papeleo;
  sin ellos el respaldo es una creencia.
- **Aislar, no fundir**: el respaldo corre como host-job, jamás dentro del agente.
- **Acotar antes de escalar**: un destino inmutable bien probado antes de una
  arquitectura multi-región.
