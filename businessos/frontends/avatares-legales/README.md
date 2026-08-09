# Avatares Legales · A2A

Prototipos operacionales de los cuatro avatares legales de Hermes OS, en una
sola app Next.js: **Fiscal**, **Litigio**, **Contratos** y **Director
multipráctica**. Es la ejecución del plan del equipo (8 fases) conciliado con el
plan bufete B2B — ver `docs/planes/ADENDA-conciliacion-avatares-legales.md`.

## Qué es (y qué no)

- **Es** un prototipo navegable con datos de muestra: 4 tableros, cada uno con
  4 vistas, sobre una piel visual propia ("legal sobria"). Sirve para validar
  con despachos reales qué vistas generan adopción.
- **No es** un producto conectado: **sin backend, sin Supabase, sin auth, sin
  despliegue**. Todo dato sale de fixtures locales y la UI lo declara con la
  insignia "Datos: muestra (mock)".
- La parte multi-inquilino (tenencia, muralla ética, ZDR) es **Fase 9+** del
  plan bufete y espera decisiones de Elisa (B1, B5) — ver la sección
  "Pendientes de decisión de Elisa" en `businessos/ROADMAP.md`.

## Correr en local

```bash
npm install
npm run dev        # http://localhost:3005 (puerto fijo de esta app)
```

Gates de la app (los mismos que juzga el Supervisor del trío):

```bash
npm run build && npm run typecheck && npm run lint
```

## Decisiones de diseño que gobiernan el código

1. **Color = riesgo, nada más** (decisión C4 de la adenda, resuelta en F1).
   La escala semáforo `--risk-alto/medio/bajo` es la única codificación por
   color. Los plazos se codifican con peso tipográfico, posición y cifras
   tabulares; la validación humana usa fichas neutras/acento. Racional completo
   en `src/app/tokens.css`.
2. **Contrato del grafo reutilizado, no inventado** (C1/C2 de la adenda). Los
   tipos de evaluación regulatoria espejean el contrato real de
   `meeting-copilot/src/features/pre-discovery/grafo.ts` (5 estados, fail-safe
   `dudoso`, toda afirmación cita fuente). "Sin cobertura" es un hecho del
   catálogo estático expertise→dimensión, nunca un veredicto del grafo.
3. **Costura de integración explícita**: `services/index.ts` expone funciones
   asíncronas con la firma de la API futura (documentadas con JSDoc
   "Integración futura") que hoy resuelven fixtures de `services/mock.ts`.
   Conectar el backend real = reemplazar ese módulo, sin tocar vistas.
4. **Campos de tenencia inertes** (C3 de la adenda): los tipos llevan
   `tenantId`/`asociadoId` como campos presentes pero sin lógica, para que la
   Fase 9+ no obligue a re-tipar.

## Trazabilidad

Cada pantalla responde a un dolor de la investigación de buyer persona — el
mapa completo está en `INVESTIGACION-SINTESIS.md` (síntesis exigida por el
prompt del equipo). Planes fuente en `docs/planes/`.

## Limitaciones operativas declaradas

- **El CI del repo no cubre `businessos/frontends/`**: los gates de arriba se
  corren a mano (o los corre el Supervisor si la tarea entra por el trío). Un
  verde de CI en el PR **no** dice nada de esta app.
- **Los PR de esta app siguen el flujo normal del repo**: revisión y fusión por
  otro colaborador o desde la máquina con administración — la máquina que
  desarrolla no auto-fusiona.
- Fuera de alcance del prototipo: tema oscuro, arrastrar-y-soltar real,
  librerías de calendario, i18n, alta en el launcher hasta F7.
