---
name: adquisicion-paquete-comercial
description: >-
  Activo Digital del departamento de Adquisición de Clientes (Hermes OS · A2A, Fase 9). Arma el paquete
  comercial del pipeline de EG.CRM (Hito 6): Propuesta + Cotización + Contrato preliminar "DNA" (alcances,
  asesoría e implementación Done With You, manejo de incidencias, responsabilidad limitada, escalabilidad,
  próximos pasos). Las cláusulas del contrato se validan contra el grafo (grafo-a2a, dimensión
  contractual, país del cliente); claims y precios salen de referencias aprobadas versionadas e
  intocables; y el envío al cliente por WAB/correo es un GATE HUMANO obligatorio. Usa este skill siempre
  que un lead aprobado necesite propuesta/cotización/contrato, o cuando pidan "generar el paquete",
  "contrato DNA", "cotización para el cliente" o "propuesta comercial", aunque no se nombre.
tipo_activo: Activo Digital
objetivo: >-
  Generar un paquete comercial correcto y validado (propuesta, cotización, Contrato DNA con cláusulas
  citadas por el grafo) listo para revisión humana, sin que nada salga al cliente sin aprobación.
---

# Adquisición · Paquete Comercial (Propuesta + Cotización + Contrato DNA)

**Activo Digital:** Paquete comercial (Propuesta, Cotización y Contrato DNA).
**Objetivo:** producir un paquete correcto y validado por el grafo, listo para que un humano lo apruebe y lo envíe — nunca al cliente de forma autónoma.

## Encuadre en Hermes OS (ROADMAP)

- **Competencia del Ejecutor** en el departamento Adquisición, con **doble candado**: gates deterministas del **Supervisor** + **gate humano** en lo irreversible. *(Copiloto, no autopiloto.)*
- **Gates comerciales binarios** (`reglas/adquisicion.toml`, patrón Fase 9): `claims_aprobados`, `precio_en_rango`, `plantilla_contrato_intacta`, `politica_intocable`, `sin_secretos`. Los claims aprobados, la política de precios y la plantilla del contrato viven **versionados y firmados en el repo**; el motor **no puede tocarlos** (integridad por sha256). *(Arreglar lo compartido; verificar antes de confiar.)*
- **Contrato DNA validado por el grafo.** Cada cláusula pasa por `grafo-a2a` (dimensión **contractual**, país del cliente) → banderas con fuente citada → estado `en_revision`/`validado`. Igual que `validar-contratos.py` (Fase 3). Sin fuente, la cláusula se marca; **firmar/aprobar = SOLO humano** (Elisa).
- **Envío = GATE HUMANO.** El paquete sale al cliente por **WAB + correo** solo tras **aprobación humana verificada** (`salientes_con_aprobacion`, autenticidad en la frontera de envío, patrón del host-job `enviar-salientes.py`). El motor **nunca** envía por su cuenta. *(Gate en dinero y cara al cliente.)*
- **Routing:** redacción → modelo capaz; validación de cláusulas → grafo determinista (cero tokens).

## Entradas

Informe de Análisis (`adquisicion-analisis-profundo`), Evaluación de Factibilidad, referencias aprobadas versionadas (claims, precios, plantilla de contrato), país del cliente, datos del lead y su **WAB**/**correo**.

## Proceso

1. **Redacta la Propuesta** desde el Informe de Análisis (alcances, beneficios, fases).
2. **Arma la Cotización** con la **política de precios versionada**; verifica `precio_en_rango`. Fuera de rango → escala a humano, no lo fuerza.
3. **Genera el Contrato DNA** desde la **plantilla intacta**: alcances, asesoría e implementación **Done With You**, manejo de incidencias, responsabilidad limitada, escalabilidad, próximos pasos.
4. **Valida cláusulas contra el grafo** (contractual, país) → banderas con fuente → `en_revision`.
5. **Presenta para aprobación humana.** Nada se envía todavía.
6. **Tras aprobación humana**, el host-job de envío entrega el paquete por **WAB + correo** y registra el estado.

## Salida — Paquete + estado

```
# Paquete Comercial — [Empresa]  ·  Lead: [lead_id]
Estado del contrato: en_revision | validado
Gate humano de envío: PENDIENTE  ← no sale sin aprobación

## Propuesta
## Cotización        (precio_en_rango: sí/no)
## Contrato DNA
   - Alcances · Done With You · Incidencias · Resp. limitada · Escalabilidad · Próximos pasos
   - Banderas del grafo: [cláusula → fuente citada]

Estatus de seguimiento (post-envío): Enviado → En revisión → Aceptado | Rechazado | En negociación
```

## Reglas de oro

- **Nada al cliente sin humano.** Envío, precio final y firma son gate humano. Siempre.
- **Referencias intocables:** claims, precios y plantilla se leen versionados; el motor no los edita (integridad sha256).
- **Cláusulas citadas o marcadas:** el grafo respalda; sin respaldo, bandera — nunca se afirma legalidad por cuenta propia.

## Método diio aplicado ("Guía de supervivencia para vender con IA")

- **Primero pensar, después redactar.** Antes de generar propuesta/cotización/contrato, define: *"¿qué quiero que pase después de que el cliente lo lea?"*, la idea central a reforzar y el error a evitar. *"El problema de un mensaje no se arregla calibrando tono, sino calibrando intención"* (diio, cap. 8).
- **La propuesta es herramienta de decisión, no brochure.** Debe responder la pregunta real del comprador: *"¿por qué esto merece prioridad, cómo lo justifico internamente y qué riesgo corro si no lo hago?"*
- **Defendible internamente:** diseña el material para que el **champion pueda sostenerlo ante quien aprueba el presupuesto** (CFO). Lo que entusiasma al champion no siempre convence al que firma.
- **Simulador de lectura crítica** (prompts 9, 11): antes de presentar a revisión humana, lee la propuesta "como un CFO / comprador ocupado" — qué parece relleno, qué falta para merecer presupuesto, si construye urgencia.
- **Anti "mensajes sin filo" (Trampa 2):** evita el texto correcto pero irrelevante ("correos que nadie odia pero nadie responde"); nada de "Gracias por tu tiempo, quedo atento".
- **Preserva la voz** (anti-homogeneización) y marca inferencias como inferencias.

## Integración

Cierra el pipeline en el **Hito 7 (Entrega, Retroalimentación, Ajuste y Aprobación)**: si el cliente aprueba, se procede a **firma de contrato + anticipo** (gate humano de dinero). Un proyecto ganado en Adquisición es el que luego recibe el departamento de **Desarrollo de Software** (trío/enjambre, Fases 6-7).

---
*Método basado en "Guía de supervivencia para vender con IA" (diio.com), CC BY-SA 4.0.*
