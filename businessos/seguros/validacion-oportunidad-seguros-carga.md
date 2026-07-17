# Validación de oportunidad — Seguros de carga MX, línea white-label de Hermes-os-a2a

> **Etapa:** discovery / validación de mercado (un paso ANTES de un blueprint de
> producto como los de `ocr/`, `crm/`, `logistica/`). Fuente: investigación externa
> con 31 referencias citadas (ver §Referencias). Integrada al repo el 2026-07-15;
> alineada a las directrices del proyecto el 2026-07-17.
> **Veredicto de la investigación:** oportunidad comercial viable, condicionada a un
> ciclo de discovery de 30 días (10–20 entrevistas) antes de comprometer desarrollo.
> **Encuadre:** NO es un producto nuevo con marca propia. Es una línea **white-label
> de Hermes-os-a2a**: el broker/insurtech pone su marca; la fábrica pone el grafo,
> los agentes A2A y el trío que los construye.

---

## 1. Qué es (y qué no es)

**Es:** Hermes-os-a2a en marca blanca para brokers e insurtechs de seguros de carga
en México — una capa de orquestación agent-to-agent (intake → scoring → comparación →
recomendación) que el intermediario **autorizado** opera bajo su propia marca, sobre
la infraestructura ya viva del proyecto.

**No es:** un marketplace directo al cliente final, un emisor de pólizas, ni un
intermediario. La intermediación de seguros es actividad reservada a agentes con
autorización de la CNSF (LISF, Reglamento de Agentes de Seguros y Fianzas); una
plataforma que presente propuestas o recabe aceptaciones sin licencia — o sin operar
aliada a un agente/corredor autorizado — asume carga regulatoria que este proyecto no
quiere ni necesita.[^22][^23][^25][^15]

La superficie pública declara **fronteras negativas literales** en su card A2A, el
mismo patrón de `ventas-a2a` (Fase 9): *no intermedia, no cierra pólizas, no asesora
en nombre de la aseguradora*. "Copiloto, no autopiloto": la plataforma es apoyo
analítico; la decisión y la relación contractual siguen en manos del agente
autorizado.

---

## 2. Los diferenciadores (por qué Hermes-os-a2a y no cualquier SaaS)

Solo se lista lo que de verdad diferencia. Lo que cualquier SaaS puede dar
(formularios, panel, multi-tenant) no aporta al caso y no se argumenta aquí.

1. **El gap existe y nadie lo cubre.** No hay multicotizador especializado en seguros
   de carga en México — los multicotizadores y simuladores públicos (p. ej. CONDUSEF)
   viven en autos y gastos médicos; en carga la comparación se hace con Excel, correo
   y portales de cada aseguradora.[^12][^18][^20][^21][^19] Tampoco existe una vista
   unificada de pólizas/certificados por embarque en las herramientas logísticas
   estándar (TMS/WMS tienen foco operativo, no de seguros).[^7][^31][^30]

2. **El grafo regulatorio con fuente citada es el moat.** La mitigación legal que la
   propia investigación exige (§1) es exactamente lo que el grafo ya hace en fiscal y
   regulatorio: señalar con fuente y vigencia, jamás asesorar sin cita. Extenderlo es
   un seed nuevo (CNSF, LISF Art. 91 y ss., Reglamento de Agentes), no arquitectura
   nueva.[^22][^23][^25] Ningún competidor identificado tiene esta disciplina de
   procedencia como núcleo.[^3][^15]

3. **Comparación de coberturas con cláusula citada.** El agente de comparación
   interpreta condiciones generales en PDF para extraer coberturas, exclusiones y
   deducibles — y cada afirmación cita la cláusula que la respalda.[^23][^27][^4] Es
   la misma disciplina de grafo/facturas: un "sí cubre robo" sin cláusula es el mismo
   bug que un veredicto fiscal sin fuente. Este es el corazón del valor para el
   broker (los PDFs legales inter-aseguradora son hoy incomparables a mano).[^27][^20]

4. **La arquitectura A2A ya está viva — lo nuevo es solo dominio.** El patrón card +
   executor + cliente corre en producción (`grafo-a2a`, `ventas-a2a`); el trío/enjambre
   (Fases 6–7) construye por tareas con gates deterministas; Supabase con RLS y el
   edge público ya operan. Un competidor parte de cero en todo esto; Hermes-os-a2a
   solo suma servicios hermanos en `hermes-net` ("aislar, no fundir").

5. **Gate humano en lo irreversible, por diseño.** Recomendación ≠ contratación: la
   decisión final, la negociación con aseguradoras y los siniestros complejos quedan
   en el agente autorizado.[^23][^25] La plataforma nace alineada al principio del
   proyecto y al requisito regulatorio a la vez — no hay tensión que resolver.

---

## 3. Qué se reusa vs qué se construye

| Lo que pide la oportunidad | Lo que Hermes-os-a2a ya tiene | Qué habría que construir |
|---|---|---|
| Orquestación agent-to-agent (intake→scoring→comparación→recomendación) | Patrón A2A completo vivo en `grafo-a2a` y `ventas-a2a` | 4 servicios A2A hermanos, uno por paso |
| Carga regulatoria (CNSF, LISF, Reglamento de Agentes) | Grafo con dimensión `regulatorio`/`contractual` y regla "señala, no asesora, cita fuente" | Seed nuevo: MX + seguros/intermediación |
| Construir el MVP por fases | Trío (Fase 6) + enjambre (Fase 7) con gates deterministas | Nada de infra: tareas con criterios de aceptación |
| Vender white-label a brokers/insurtechs | Departamento de adquisición (Fase 9): `ventas-a2a`, `leads`, edge público | ICP y oferta propios de este vertical |
| Datos de embarques, cotizaciones, pólizas | Supabase (service_role, RLS) — patrón `facturas`/`token_usage` | Esquema `embarques`/`cotizaciones`/`polizas` |

**Nuevo (dominio):** seed regulatorio de seguros MX, parser de condiciones generales
por aseguradora, esquema de intake de embarque, motor de comparación/recomendación, y
las relaciones/datos con aseguradoras — el mayor riesgo de integración según la
investigación (no hay APIs estándar de cotización/emisión en el ramo).[^15][^27][^7][^31]

---

## 4. El mercado, solo lo que sostiene el caso

Mercado de seguros de carga MX: ~USD 1,245 millones (2025) con proyección a ~1,730
millones para 2033, digitalización incompleta y alta dependencia de procesos
manuales.[^2][^1][^3] El dolor no es principalmente precio: es complejidad documental
y legal, comparación de coberturas entre aseguradoras, tiempos de cotización, y
reclamaciones rechazadas por errores de declaración — con impacto amplificado por la
criminalidad contra el autotransporte en rutas de alto riesgo.[^14][^27][^23][^15][^30]
Hay múltiples aseguradoras con productos equivalentes (GNP, HDI, AXA, Chubb, MAPFRE,
Sura, GMX)[^6][^7][^8][^9][^10][^11][^26] — la abundancia de opciones sin herramienta
de comparación es precisamente lo que hace valiosa la recomendación. Insurtechs como
Zuru (con Chubb y AI27) y SafeLink demuestran apetito del mercado por soluciones
tecnológicas en el ramo, pero su foco es gestión de riesgo/monitoreo, no la
multicotización multi-aseguradora por embarque.[^13][^16][^28][^29][^3]

---

## 5. ICP white-label

El cliente de la marca blanca es quien ya opera la intermediación regulada:

- **Brokers/agentes especializados en carga y comercio exterior** — ya manejan varias
  aseguradoras; el flujo puede arrancar con captura semi-manual de cotizaciones, sin
  negociar integraciones con cada compañía.[^12][^15][^18][^20]
- **Insurtechs logísticas** (perfil Zuru/SafeLink) — buscan diferenciarse y ya están
  conectadas a aseguradoras, lo que reduce las integraciones necesarias.[^13][^16][^29][^28]

Buyer: director/socio del broker o gerente de riesgo; usuario diario: ejecutivo de
suscripción/operaciones que hoy compara PDFs y captura dos veces.[^18][^31][^20][^23]
Señales de adopción: volumen alto de embarques, rutas de alto riesgo, uso previo de
TMS/multicotizadores en otros ramos.[^19][^21][^31][^15]

Forwarders, 3PL e importadores/exportadores quedan como segundo anillo: son usuarios
del flujo, no operadores de la intermediación — entran vía el broker/insurtech que
tenga la marca blanca.[^5][^12][^14]

---

## 6. Wedge del MVP ("acotar antes de escalar")

**Multicotizador + cockpit de recomendación. Sin emisión ni siniestros al inicio.**

Agentes a construir primero (todos servicios A2A hermanos):

1. **Intake de embarque** — mercancía, ruta, valor, modalidad; desde Excel/CSV/
   formulario, con normalización y validación.[^14][^1][^4]
2. **Scoring de riesgo básico** — reglas heurísticas por tipo de mercancía, zona de
   riesgo y modalidad; sin modelos avanzados al inicio.[^29][^30][^15]
3. **Comparación de cobertura** — acotada a un conjunto pequeño de aseguradoras y
   tipos de póliza comunes, siempre con cláusula citada.[^27][^23][^4]
4. **Recomendación de asegurador** — precio + cobertura + desempeño, como apoyo al
   agente humano que decide.[^3][^29][^14]

Datos mínimos: tipo de mercancía, ruta, modalidad, valor asegurado, cliente, póliza
base, cotizaciones existentes.[^1][^4][^5][^14] Métricas de éxito tempranas: tiempo de
cotización/comparación por embarque (de horas/días a minutos), errores documentales
detectados, % de embarques por la plataforma, pilotos que renuevan y pagan.[^19][^20]

**Qué NO construir todavía** (la investigación es explícita):
- Marketplace directo al cliente final sin agente autorizado (riesgo regulatorio).[^22][^23][^25]
- Emisión automática multi-aseguradora sin estandarización de datos ni acuerdos por
  compañía.[^7][^27][^15]
- Cockpit de siniestros automatizado sobre datos que hoy no son accesibles (tasas de
  rechazo y tiempos de respuesta por aseguradora no son públicos).[^2][^15][^3]

---

## 7. El gate: discovery de 30 días

**No es fase comprometida del ROADMAP.** Vive como oportunidad hasta pasar este gate.
Si pasa, el siguiente paso es un PRP que reusa el patrón de Fase 5/9 (servicio A2A +
card con fronteras negativas) y el formato de blueprint de `ocr/`/`crm/`.

**Hipótesis a validar (10–20 entrevistas):**
1. Brokers/insurtechs perciben la selección de aseguradora por embarque como dolor
   recurrente.
2. Aceptan centralizar información de embarques y pólizas en una plataforma externa
   (bajo su marca).
3. Pagan por un SaaS que ahorra tiempo y reduce errores aunque no emita pólizas.
4. Se pueden obtener cotizaciones y condiciones generales suficientes sin
   integraciones profundas.
5. Las aseguradoras no bloquean una capa externa de apoyo si la intermediación sigue
   en manos autorizadas.[^22][^15][^23]

**Perfiles:** 4–6 brokers de carga (≥1 en rutas de alto riesgo), 3–4 insurtechs
logísticas, 3–4 forwarders medianos, 2–3 operadores 3PL/autotransporte, 2–3
importadores/exportadores con pólizas flotantes.[^12][^15][^16][^13][^30][^5]

**Criterios de decisión:**
- **Seguir:** 5–7 entrevistas confirman dolor + 2–3 clientes dispuestos a co-diseñar
  y compartir datos + sin barrera regulatoria insalvable operando como apoyo a
  agentes autorizados.
- **Pivotear:** el dolor mayor está en siniestros/documentación, no en comparación →
  pivot a cockpit de siniestros o automatización documental.
- **Descartar:** el dolor no justifica pago, o las soluciones internas/insurtechs ya
  lo cubren, o la regulación/políticas de aseguradoras impiden operar una capa
  independiente.

---

## 8. Limitaciones de la investigación

No hay datos públicos de participación por aseguradora en el ramo, ni estadísticas de
tiempos de respuesta o tasas de rechazo por compañía, ni APIs estándar documentadas de
cotización/emisión en carga.[^2][^13][^16][^15][^3] El nivel real de digitalización de
brokers/forwarders, la disposición a centralizar datos sensibles, la tolerancia de
las aseguradoras a una capa de recomendación externa y el valor económico percibido
son **supuestos que solo las entrevistas validan** — por eso el discovery es gate y no
formalidad.

---

## Referencias

1. [Seguro de Transporte de Carga en México](https://hanseatica.com/seguro-de-carga-mexico/) - El costo de un seguro de transporte de carga internacional en México depende del tipo de mercancía, ...

2. [Mercado de Seguros de Carga en México 2033](https://www.imarcgroup.com/report/es/mexico-cargo-insurance-market) - El tamaño del mercado de seguros de carga en México alcanzó los USD 1,245.5 millones en 2025. De car...

3. [Las Insurtech en los seguros de transporte y carga](https://asociacioninsurtech.mx/las-insurtech-en-los-seguros-de-transporte-y-carga/) - Para ZURU LATAM, la principal labor de una Insurtech es crear un ecosistema tecnológico y digital qu...

4. [Los beneficios de contratar un seguro de carga para el ...](https://www.andresycia.com/noticias-consejos/los-beneficios-de-contratar-un-seguro-de-carga-para-el-transporte-de-mercancias/) - Cobertura por avería particular: cubre la pérdida o daño parcial de la mercancía por causas inherent...

5. [Seguro de Mercancías: Todo lo que Necesita Saber](https://alianza-logistics.com/seguro-de-mercancias-todo-lo-que-necesita-saber/) - Este seguro cubre los riesgos asociados con el transporte, incluyendo daños, pérdida o robo de las m...

6. [Seguro de Mercancías y Transporte de Carga](https://www.mapfre.com.mx/empresas/seguros-empresariales/seguro-transporte-carga/) - El seguro de mercancías de MAPFRE protege la carga en tránsito ante accidentes, averías y actos deli...

7. [Seguro de transporte de mercancías](https://www.gnp.com.mx/seguro-empresarial-de-danos-en-mercancias) - También conocido como "carga", el seguro de transporte de mercancías, es un servicio de protección f...

8. [HDI Transporte: cuidamos tu mercancía](https://www.hdi.com.mx/empresas/hdi-transporte/) - Arma tu seguro con base en las necesidades de tu negocio, contratando solo las coberturas que tu mer...

9. [Transporte de Mercancía](https://www.segurossura.com.mx/pymes/transporte-de-mercancia/) - Brinda protección ante los riesgos más comunes a los que puede estar expuesta tu mercancía durante s...

10. [Seguros de Transporte de Carga y Mercancías](https://www.chubb.com/mx-es/empresas/transporte-de-carga-y-mercancias.html) - Un Seguro de Transporte de Carga brinda protección inmediata a los bienes durante su traslado de un ...

11. [Seguro de Carga en Tránsito protección de mercancía](https://www.gmx.com.mx/seguros/transportes-y-aviacion/carga-en-transito.html) - El Seguro de Carga en Tránsito de GMX protege tu mercancía contra robos y riesgos del transporte. Te...

12. [Seguros de Carga en México](https://transporte.mx/seguros-de-carga/) - El seguro de carga (también llamado seguro de transporte de mercancías) protege el valor económico d...

13. [SafeLink Marine: Seguros de Carga y Transporte](https://www.safelinkmexico.com/) - Ofrecemos seguros de carga, contenedor y responsabilidad civil para transporte terrestre, aéreo, mar...

14. [How to Choose the Best Cargo Insurance in Mexico](https://www.youtube.com/watch?v=69tk1HpOuR4) - Guía para Contratar un Seguro de Carga Internacional ¿Sabías que un error al transportar tus mercanc...

15. [Seguros de carga: las legislaciones en México y ...](https://www.safelinkmexico.com/blog/seguros-de-carga-las-legislaciones-en-mexico-y-centroamerica/) - Ante la enorme tasa de criminalidad contra el autotransporte, las legislaciones enfocadas en seguros...

16. [Zuru Logistics Insurtech](https://zurulatam.com/) - Con Zuru tienes acceso a herramientas de protección, gestión de riesgo con inteligencia artificial, ...

17. [Seguro de Transporte de Carga y Mercancía](https://surexs.com/seguros/danos-rc/seguro-transporte-carga-mercancia-empresas) - Con Surexs, compara aseguradoras, optimiza condiciones y administra tu póliza con soporte técnico du...

18. [Software para corredurías de seguros](https://www.capterra.mx/directory/31282/p&c-insurance/software) - Sistema de gestión de agencias que ayuda a las empresas de seguros con el seguimiento de pólizas, la...

19. [Todo sobre cómo cotizar seguro de auto en línea](https://www.bbva.mx/educacion-financiera/seguros/como-cotizar-seguro-auto-en-linea.html) - Quieres asegurar tu coche? Conoce paso a paso cómo cotizar seguro de auto en línea. Ahorra tiempo, p...

20. [Software Multicotizadores para Agentes](https://blog.segutrends.com/blog/software/software-multicotizadores-para-agentes) - Un software multicotizador es una plataforma que permite a los agentes de seguros cotizar diferentes...

21. [Simulador de seguro de autos](https://webappsos.condusef.gob.mx/SimuladorSeguroAutomovil/entradas-tabs.jsp) - Compara los beneficios de cada producto que se ajustan a tu presupuesto: ¿Hasta cuánto puedes gastar...

22. [de los agentes de seguros y de fianzas - CNSF Interactiva](https://lisfcusf.cnsf.gob.mx/LISF/LISF_4_2_S1) - Las autorizaciones podrán otorgarse para realizar actividades de intermediación en las operaciones y...

23. [Unidad 3. Agente de seguros](https://gc.scalahed.com/recursos/files/r161r/w24032w/r_u4_01.pdf) - El Reglamento de Agentes de Seguros y de Fianzas establece: Que los intermediarios de seguros y pers...

24. [Agentes e intermediarios - Base de datos](https://www.datos.gob.mx/dataset/agentes_intermediarios) - Listado de los asesores externos de seguros registrados ante la CNSF, vigentes al 2025. Incluye nomb...

25. [Agentes de Seguros y de Fianzas Personas Físicas](https://www.gob.mx/cnsf/documentos/agentes-de-seguros-y-o-fianzas) - Con fundamento en el artículo 93 de la LISF, para el ejercicio de la actividad de agente de seguros ...

26. [Seguro Daños Marítimo | AXA México - Portal Público](https://axa.mx/seguro-danos/maritimo-transporte) - El Seguro de Transportes Carga otorga protección a una amplia gama de bienes cuando éstos son transp...

27. [SEGURO DE TRANSPORTES DE CARGA](https://www.hdi.com.mx/wp-content/uploads/2023/04/cg-seguro-de-transporte-cnsf-s0027-0458-2022-condusef-005601-02.pdf) - 3.3.1 Para el Medio de Transporte terrestre, las mercancías y/o bienes asegurados bajo esta Póliza p...

28. [insurtech.accelerator basada en USA, invierte en ZURU](https://www.startuplinks.world/noticias/insurtech-accelerator-basada-en-usa-invierte-en-zuru) - insurtech.accelerator, la aceleradora de insurtechs líder en Latam, ha decidido sumarse como inversi...

29. [Chubb, Zuru Logistics Insurtech y AI27 lanzan "Zuru Max"](https://chubb.mediaroom.com/chubb_zuru_logistics_y_ai27_lanzan_zuru_max) - Zuru Max fue diseñado para ofrecer una solución integral que combina monitoreo digital, evaluación d...

30. [TMS – Samsara, binomio orientado a favorecer ...](https://t21.com.mx/tms-samsara-binomio-orientado-a-favorecer-operadores-y-seguridad-vial/) - La alianza estratégica tiene como, con el ambicioso objetivo de reducir un 24% los accidentes durant...

31. [Transformando el transporte de carga en México](https://logistaas.com/es/transformando-el-transporte-de-carga-en-mexico-como-el-tms-de-vanguardia-de-logistaas-esta-cambiando-el-juego/) - Un Sistema de Gestión de Transporte (TMS) es una plataforma diseñada para simplificar los procesos c...

[^1]: https://hanseatica.com/seguro-de-carga-mexico/
[^2]: https://www.imarcgroup.com/report/es/mexico-cargo-insurance-market
[^3]: https://asociacioninsurtech.mx/las-insurtech-en-los-seguros-de-transporte-y-carga/
[^4]: https://www.andresycia.com/noticias-consejos/los-beneficios-de-contratar-un-seguro-de-carga-para-el-transporte-de-mercancias/
[^5]: https://alianza-logistics.com/seguro-de-mercancias-todo-lo-que-necesita-saber/
[^6]: https://www.mapfre.com.mx/empresas/seguros-empresariales/seguro-transporte-carga/
[^7]: https://www.gnp.com.mx/seguro-empresarial-de-danos-en-mercancias
[^8]: https://www.hdi.com.mx/empresas/hdi-transporte/
[^9]: https://www.segurossura.com.mx/pymes/transporte-de-mercancia/
[^10]: https://www.chubb.com/mx-es/empresas/transporte-de-carga-y-mercancias.html
[^11]: https://www.gmx.com.mx/seguros/transportes-y-aviacion/carga-en-transito.html
[^12]: https://transporte.mx/seguros-de-carga/
[^13]: https://www.safelinkmexico.com/
[^14]: https://www.youtube.com/watch?v=69tk1HpOuR4
[^15]: https://www.safelinkmexico.com/blog/seguros-de-carga-las-legislaciones-en-mexico-y-centroamerica/
[^16]: https://zurulatam.com/
[^17]: https://surexs.com/seguros/danos-rc/seguro-transporte-carga-mercancia-empresas
[^18]: https://www.capterra.mx/directory/31282/p&c-insurance/software
[^19]: https://www.bbva.mx/educacion-financiera/seguros/como-cotizar-seguro-auto-en-linea.html
[^20]: https://blog.segutrends.com/blog/software/software-multicotizadores-para-agentes
[^21]: https://webappsos.condusef.gob.mx/SimuladorSeguroAutomovil/entradas-tabs.jsp
[^22]: https://lisfcusf.cnsf.gob.mx/LISF/LISF_4_2_S1
[^23]: https://gc.scalahed.com/recursos/files/r161r/w24032w/r_u4_01.pdf
[^24]: https://www.datos.gob.mx/dataset/agentes_intermediarios
[^25]: https://www.gob.mx/cnsf/documentos/agentes-de-seguros-y-o-fianzas
[^26]: https://axa.mx/seguro-danos/maritimo-transporte
[^27]: https://www.hdi.com.mx/wp-content/uploads/2023/04/cg-seguro-de-transporte-cnsf-s0027-0458-2022-condusef-005601-02.pdf
[^28]: https://www.startuplinks.world/noticias/insurtech-accelerator-basada-en-usa-invierte-en-zuru
[^29]: https://chubb.mediaroom.com/chubb_zuru_logistics_y_ai27_lanzan_zuru_max
[^30]: https://t21.com.mx/tms-samsara-binomio-orientado-a-favorecer-operadores-y-seguridad-vial/
[^31]: https://logistaas.com/es/transformando-el-transporte-de-carga-en-mexico-como-el-tms-de-vanguardia-de-logistaas-esta-cambiando-el-juego/
