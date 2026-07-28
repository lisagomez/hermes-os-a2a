# Modelo white-label (uso propio + venta)

> Cómo el mismo trío (ver `SPEC-trio.md`) se replica por cliente cambiando **solo
> configuración**. Es lo que vuelve el sistema marca blanca. Descansa sobre dos principios
> ya vigentes: "aislar, no fundir" y el aislamiento por ámbito previsto para el RAG.

---

## 1. Qué es común (idéntico para todos)

- **El trío:** Hermes-Negocio (orquestador) + Ejecutor (A2A) + Supervisor (A2A).
- **El motor:** el bucle de codificación del Ejecutor (Claude Agent SDK) y los gates del
  Supervisor.
- **El catálogo de skills** (las competencias de la fábrica).
- **Las dos capas de control:** Supervisor automático + gate humano en lo irreversible.

Montar un cliente nuevo **no se programa, se configura**.

---

## 2. Qué cambia por cliente (la configuración)

| Eje | Qué se configura |
|-----|------------------|
| **Departamentos activos** | software hoy; finanzas/soporte/… a futuro, encendiendo su paquete |
| **Reglas** | las reglas de validación del Supervisor específicas del cliente y sus criterios de aceptación |
| **Marca** | nombre, tono, identidad de cara a sus usuarios |
| **Datos / workspace** | repo propio, ámbito RAG propio, secretos propios, workspace de ejecución aislado |

---

## 3. Aislamiento por cliente (no negociable)

Cada cliente es un compartimento estanco — la venta multiplica la superficie de riesgo, así
que el aislamiento es la línea de defensa:

- **Repo:** cada cliente trabaja sobre **su** repositorio; el Ejecutor nunca cruza repos.
- **RAG por ámbito:** el conocimiento del cliente vive en **su** ámbito; ninguna consulta
  alcanza datos de otro cliente (igual que el aislamiento ya diseñado para el RAG).
- **Secretos:** credenciales por cliente, fuera de git, en su propio almacén (patrón ya
  usado: secretos en archivo dedicado, referenciados por variable, nunca en el repo).
- **Workspace de ejecución:** git worktree / contenedor por cliente; un fallo o un cambio de
  un cliente no toca a otro ("aislar, no fundir").
- **Endpoints A2A:** los servicios del cliente viven detrás del orquestador; se anuncian por
  capacidad (Agent Card), sin exponer interior ni datos.

---

## 4. El camino: uso propio → venta

1. **Uso propio (primero).** La dueña enciende el departamento de software para construir y
   mantener **sus** SaaS. Es el banco de pruebas: se valida el trío de punta a punta con
   riesgo propio, no de un cliente.
2. **Validado en propio → venta.** Solo cuando el trío funciona de verdad en uso propio se
   ofrece como producto: un cliente recibe **"su departamento de software con IA"** que
   construye y mantiene su app **bajo supervisión**, con su marca.

Acotar antes de escalar: un departamento, validado en propio, antes de white-label; un
cliente bien aislado antes de muchos.

> **Capa humana (equipo + Slack).** Cuando el negocio lo opera un equipo y no un solo dueño,
> la superficie humana son **canales de Slack** por departamento / cliente / desarrollo, con
> roles y matriz de aprobación. Un `#cli-*` privado es **este aislamiento white-label hecho
> visible**. Topología, roles/aprobación y piloto en `equipo-y-slack.md`.

---

## 5. Inventario y costeo de features (no negociable)

**Toda feature generada en marca blanca se incluye como activo digital con su esquema
de costeo.** Sin asiento en el inventario no hay entrega: el margen se conoce por
activo medido, no se estima de memoria (tesis GTM §8, confirmada por el costeo de
`activos/CATALOGO.md`).

El asiento es doble — un escritor por origen, como siempre:

1. **Inventario de la fábrica (ERP, módulo `act`).** La tarea del trío que produce la
   feature declara EN EL ORIGEN `clasificacion: {eje_dei: desarrollo, vendible: true}`.
   Para marca blanca esto no es un juicio del que arma la tarea: es **obligatorio, sin
   excepción** (regla dura en el skill `trio-software`). Al aprobarse, la cosecha
   automática (`cosechar-activos.py`) la da de alta en `erp.act_activo` +
   `act_version` + `act_costo` con su costo real (`token_usage.task_id`, tarea y
   sub-tareas). Nadie cataloga a mano.
2. **Ledger del cliente.** El entregable se asienta en
   `activos-clientes/<slug>/activos.jsonl` con tokens, costo y `fuente_costo`
   declarada (principio 4 de ese control: todo activo se etiqueta y se costea).

El **esquema de costeo** es el de `activos/CATALOGO.md`: construcción (hundido),
operación mensual, réplica y reposición — cada componente con `fuente` declarada.
`no_medido` es un valor honesto; un costo inventado no lo es.

Recordatorio de defensibilidad (§1.7 del ERP-MAESTRO): en marca blanca el cliente
recibe **USO**, jamás las fuentes de los activos defendibles.

---

## 6. Honestidad comercial

- Lo que se vende **no** es "el agente lo hace solo": es un departamento **con supervisión**
  (automática + humana en lo irreversible). Esa es la promesa defendible y la que hay que
  comunicar tal cual.
- El Supervisor es tan bueno como sus reglas; vender reglas flojas es vender falsa
  seguridad. Las reglas por cliente se **auditan** antes de activar el departamento.
- La madurez del stack (Hermes v0.x) pesa: el producto se ofrece cuando el uso propio lo
  respalde, no antes.
