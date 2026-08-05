# Precondición de Fase 12 — Anclas de confianza y guion de ceremonia

**Estado:** decisión tomada (§2), guion pendiente de agendar
**Ubicación sugerida:** `businessos/gobernanza/anclas-de-confianza.md`
**Bloquea a:** `prp-endurecimiento-a2a.md` paso 2, y a toda la fase 12
**Ventana:** **antes** de la ceremonia de llaves de Fabric. Después se cierra.

---

## 1. Por qué esto tiene fecha límite

Hyperledger Fabric organiza la confianza por organización: cada MSP tiene su propia
CA, y `fabric-ca-server` genera por defecto un certificado **autofirmado**. Colgar
Fabric de una raíz externa es posible —el servidor puede operar como intermedia— pero
**se configura al crear la CA, no después**.

Consecuencia: mientras la ceremonia no ocurra, la arquitectura de confianza sigue
abierta. En cuanto ocurra con CAs autofirmadas, cambiarla implica repetir la ceremonia
y reemitir todos los MSP, con la red ya en operación.

Por eso esta decisión sale del PRP de endurecimiento y entra como precondición.

---

## 2. Decisión: dos anclas independientes

```
Raíz A2A (fuera de línea)                CA Fabric (fuera de línea)
  └── Intermedia Plano A2A                 ├── Operadora MSP
        ├── ejecutor-a2a                   └── Testigo MSP
        ├── grafo-a2a
        ├── ventas-a2a
        └── … los 12 servicios
```

| | **A. Raíz compartida** | **B. Dos anclas** ✅ |
|---|---|---|
| Separación entre dominios | Por configuración (`nameConstraints`, `pathlen`) | **Estructural** |
| Modo de falla | Silencioso: una restricción mal puesta funciona igual hasta que no debe | No existe ruta entre dominios |
| Radio de compromiso de la raíz | Ambos dominios | Uno |
| Fabric | `fabric-ca-server` como intermedia | Por defecto |
| Costo | — | Un slot más de YubiKey, ~1 h más de ceremonia |

**El argumento decisivo** no es el radio de compromiso, es el modo de falla. En la
opción A la separación depende de poner bien restricciones de nombre y longitud de
ruta; equivocarse ahí no produce ningún síntoma —todo funciona igual— y solo se
descubre cuando alguien construye una cadena que no debía validar. Un equipo sin
ingeniero de PKI de tiempo completo no debe apostar a una configuración cuyo error es
invisible.

Lo que **sí** se comparte es la ceremonia: un solo evento, una sola bitácora, la misma
doble presencia, dos artefactos de salida.

---

## 3. Parámetros criptográficos

| Artefacto | Algoritmo | Vigencia | Dónde vive la llave |
|---|---|---|---|
| **Raíz A2A** | EC P-384 | 10 años | Fuera de línea: YubiKey PIV 9c + respaldo sellado |
| **Intermedia A2A** | EC P-256 | 3 años | Secreto de Docker en el servidor (ver §3.1) |
| **Certs de servicio** ×12 | EC P-256 | 90 días | Secreto de Docker por servicio |
| **CA Operadora** (Fabric) | EC P-256 | 10 años | Según IaC de Fabric, custodia física |
| **CA Testigo** (Fabric) | EC P-256 | 10 años | Custodia física **separada** de Operadora |

EC sobre RSA por tamaño de handshake: con doce servicios llamándose entre sí, el
volumen de handshakes importa más que en una API tradicional.

### 3.1 El compromiso consciente de la intermedia

Con certificados de 90 días y doce servicios, una intermedia **fuera de línea**
significaría una ceremonia trimestral. Inviable. Así que la llave de la intermedia
vive en el servidor, y eso se compensa con tres cosas:

- `pathlen:0` — no puede emitir otras CAs, solo certificados finales
- `nameConstraints` — atada a `.hermes-net`; aunque se comprometiera, no puede emitir
  un certificado válido para ningún dominio ajeno
- CRL publicada y consultada, más certificados de vida corta

**Camino de mejora, no de hoy:** mover la llave de la intermedia a un YubiHSM 2
conectado al servidor (~$650, una vez). Elimina la exposición en disco sin cambiar
nada del diseño. Vale cuando entre el primer cliente externo.

### 3.2 Extensiones

```ini
[ raiz_a2a ]
basicConstraints  = critical, CA:TRUE
keyUsage          = critical, keyCertSign, cRLSign
subjectKeyIdentifier = hash

[ intermedia_a2a ]
basicConstraints  = critical, CA:TRUE, pathlen:0
keyUsage          = critical, keyCertSign, cRLSign
nameConstraints   = critical, permitted;DNS:.hermes-net, permitted;URI:hermes.local
authorityKeyIdentifier = keyid:always

[ servicio_a2a ]
basicConstraints  = critical, CA:FALSE
keyUsage          = critical, digitalSignature, keyEncipherment
extendedKeyUsage  = serverAuth, clientAuth
subjectAltName    = DNS:${SERVICIO},
                    DNS:${SERVICIO}.hermes-net,
                    URI:spiffe://hermes.local/ns/produccion/sa/${SERVICIO}
```

### 3.3 Por qué el SAN en formato SPIFFE

El identificador `spiffe://` no requiere adoptar SPIRE ni ninguna pieza nueva: es un
formato de nombre. Cuesta cero ponerlo hoy y convierte una migración futura a
identidad de carga de trabajo atestada en un **cambio de emisor**, no en una
reescritura de las reglas de autorización. La allowlist del plano A2A autoriza por
ese URI, no por el CN; el día que otro emisor firme los certificados, las reglas
siguen escritas igual.

**Restricción de nombre correspondiente.** Las restricciones de nombre solo acotan
los tipos que enumeran: agregar un SAN de tipo URI sin declarar `permitted;URI`
deja ese tipo **sin restricción**, y con él la garantía de §3.1 se vuelve parcial.
Por eso `[ intermedia_a2a ]` lleva las dos.

> Verificar en el ensayo previo: `openssl verify` debe **rechazar** un certificado
> de servicio cuyo URI apunte a un dominio distinto de `hermes.local`. Si lo acepta,
> la restricción de URI no quedó bien puesta — y es exactamente el tipo de error
> silencioso que motivó elegir dos anclas independientes.

`serverAuth` **y** `clientAuth` en el mismo certificado, porque cada agente es las dos
cosas: recibe llamadas y las hace. Es el error de configuración más común al montar
mTLS entre pares y produce un fallo confuso a mitad del despliegue.

---

## 4. Preparación previa (antes del día)

**Hardware**
- [ ] 4 YubiKey 5 — Operadora, Testigo, raíz A2A, respaldo de raíz A2A
- [ ] 1 laptop que arranque desde USB en vivo, **sin conectar a red en toda la sesión**
- [ ] 2 USB nuevos: uno para el sistema en vivo, uno para transportar solicitudes y
      certificados (nunca llaves privadas)
- [ ] Sobres de seguridad numerados, con sello inviolable
- [ ] Cámara o teléfono para el registro fotográfico de los sellos

**Software preparado y verificado antes**
- [ ] Imagen en vivo con `openssl` y `yubico-piv-tool`, con su hash verificado
- [ ] Archivo `openssl.cnf` con las extensiones de §3.2, revisado en frío
- [ ] Scripts de generación probados **completos en un ensayo con llaves desechables**

> El ensayo previo no es opcional. Una ceremonia que se improvisa produce artefactos
> que nadie se atreve a usar, y termina repitiéndose.

**Roles** — tres personas, tres funciones distintas:

| Rol | Quién | Función |
|---|---|---|
| **Oficiante** | La dueña | Ejecuta los comandos |
| **Testigo** | Segunda persona designada | Observa, verifica cada salida, custodia su YubiKey |
| **Escribano** | Cualquiera de los dos, o un tercero | Escribe el acta en tiempo real |

El Testigo debe ser alguien que **no** tenga acceso administrativo al servidor. Si el
Testigo puede entrar a producción, la separación de organizaciones de Fabric es
decorativa.

---

## 5. Guion de la ceremonia

**Duración estimada:** 3–4 horas. No la agendes al final de un día de trabajo.

### Apertura
1. Escribano abre el acta: fecha, hora, ubicación, presentes, propósito.
2. Se declara el modo fuera de línea: Wi-Fi apagado, cable desconectado, modo avión.
   Se fotografía.
3. Arranque desde el USB en vivo. Se verifica que no hay disco montado en escritura.

### Bloque A — Ancla A2A
4. Generar llave de raíz A2A directamente en la YubiKey (slot 9c), **nunca en disco**.
5. Autofirmar el certificado raíz A2A con las extensiones de `[ raiz_a2a ]`.
6. Generar llave y CSR de la intermedia A2A.
7. Firmar la intermedia con la raíz, con las extensiones de `[ intermedia_a2a ]`.
8. **Verificación en la sala:**
   ```bash
   openssl verify -CAfile raiz-a2a.pem intermedia-a2a.pem
   openssl x509 -in intermedia-a2a.pem -noout -text | grep -A2 "Name Constraints"
   openssl x509 -in intermedia-a2a.pem -noout -text | grep "pathlen"
   ```
   El Testigo lee las tres salidas en voz alta. Si `pathlen:0` o las restricciones de
   nombre no aparecen, **la ceremonia se detiene y se rehace el bloque**.
9. Duplicar la raíz a la YubiKey de respaldo.
10. Sellar ambas YubiKeys de raíz en sobres numerados. Fotografiar.

### Bloque B — Anclas Fabric
11. Generar las CAs de Operadora y Testigo según el IaC de `red-tier1-iac/`,
    autofirmadas (decisión §2).
12. Cada quien genera y custodia **su propia** llave. El Oficiante no toca la llave del
    Testigo, ni al revés. Este punto es la razón de ser de toda la ceremonia.
13. Verificar que ninguna de las dos CAs de Fabric valida contra la raíz A2A:
    ```bash
    openssl verify -CAfile raiz-a2a.pem ca-operadora.pem   # DEBE FALLAR
    ```
    **El fallo esperado se anota en el acta.** Es el control negativo que demuestra la
    separación estructural.
14. Sellar en sobres separados, custodia en ubicaciones distintas.

### Cierre
15. Salen del recinto en el USB de transporte **solo certificados públicos**: raíz A2A,
    intermedia A2A, CAs de Fabric. Ninguna llave privada.
16. Escribano lee el acta completa en voz alta.
17. Firman los tres. El acta se escanea y se versiona en `businessos/gobernanza/`.
18. La laptop se apaga; el USB en vivo no persiste nada. Se destruye o se reformatea.

---

## 6. Verificación posterior (dentro de las 48 h)

Mismo estándar que el resto del proyecto: **rechazo observado más control positivo.**

- [ ] Emitir un certificado de servicio de prueba desde la intermedia → valida contra
      la cadena **(control positivo)**
- [ ] Intentar emitir un certificado para un dominio fuera de `.hermes-net` →
      **debe fallar** por restricción de nombre
- [ ] Intentar que la intermedia emita otra CA → **debe fallar** por `pathlen:0`
- [ ] Verificar un cert de Fabric contra la raíz A2A → **debe fallar**
- [ ] Revocar el certificado de prueba, publicar CRL, confirmar el rechazo
- [ ] Restaurar la raíz desde la YubiKey de respaldo en un entorno aislado y confirmar
      que firma. **Un respaldo no probado no es un respaldo** — misma regla que el
      GATE 3 del runbook de FASE 0

Todo lo anterior se anota con fecha y resultado. Sin este bloque, la ceremonia produjo
artefactos pero no evidencia.

---

## 7. Lo que NO se hace en la ceremonia

- No se emiten los doce certificados de servicio. Eso es el paso 2 del PRP de
  endurecimiento, con la intermedia ya disponible.
- No se conecta nada a la red.
- No se despliega chaincode.
- No se toca el servidor de producción.
- No se improvisa. Cualquier cosa fuera del guion se anota como incidencia y se
  resuelve **después**, no durante.

---

## 8. Custodia posterior

| Artefacto | Dónde | Quién |
|---|---|---|
| YubiKey raíz A2A (primaria) | Caja fuerte, domicilio fiscal | Dueña |
| YubiKey raíz A2A (respaldo) | Ubicación física distinta | Dueña |
| YubiKey CA Operadora | Custodia de la dueña | Dueña |
| YubiKey CA Testigo | **Custodia del Testigo**, ubicación separada | Testigo |
| Acta firmada | `businessos/gobernanza/` + copia física | Ambos |
| Certificados públicos | Repositorio, versionados | — |

**Regla dura, ya escrita en el runbook de respaldos §7:** ninguna llave privada entra
jamás al respaldo en línea. Lo que se respalda es la configuración y la CRL.

---

## 9. Checklist de precondición

Antes de agendar la ceremonia:

- [ ] Decisión §2 aceptada por la dueña
- [ ] Testigo designado, y confirmado que **no** tiene acceso administrativo al servidor
- [ ] 4 YubiKeys adquiridas
- [ ] `openssl.cnf` revisado en frío por alguien distinto de quien lo escribió
- [ ] Ensayo completo con llaves desechables, de punta a punta
- [ ] Plantilla del acta lista
- [ ] Fecha agendada con 4 horas libres y las tres personas presentes

Cerrado esto, la fase 12 puede empezar y el paso 2 del PRP de endurecimiento se
desbloquea.
