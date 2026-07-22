# Control de clientes y proyectos — multitenant (vertical clientes)

> Fuente de verdad **en el repo** del portafolio de clientes de la fábrica: qué servicios
> contrata cada cliente, qué proyectos hay en curso, qué entregables se produjeron y
> cuánto costaron en tokens. El bot de la vertical `clientes` consume ESTADO desde aquí
> vía host-jobs (drop-file/snapshot) — nunca escribe directo (no tiene secretos).

## Principios

1. **Un slug por cliente** (`gal-mexico`, …) = identidad estable. Es el MISMO slug que se
   usará como `tenant_id` si el cliente contrata CRM marca blanca (`crm_tenants`) o
   cualquier servicio multitenant — una sola noción de cliente en todo el sistema.
2. **Un escritor por origen**: esta carpeta la escribe Claude Code (dev). El bot clientes
   propone/borradores; los host-jobs sincronizan snapshots al volumen. Nadie más edita.
3. **Nada sale hacia el cliente sin visto bueno de Elisa** (regla de la vertical). Un
   entregable pasa a `estado: entregado` solo tras ese OK.
4. **Todo activo se etiqueta y se costea** (etiqueta de entregable + línea en el ledger
   `activos.jsonl` del cliente, con tokens y `fuente_costo` declarada).
5. **Documentado = aplicado**: si un proyecto dice "entregado", el archivo entregado
   existe en `entregables/`; si dice "facturado", hay folio en `facturas`.

## Estructura

```
activos-clientes/
├── README.md                  ← este documento (control multitenant)
├── _catalogo/
│   └── servicios.md           ← catálogo de servicios de la fábrica (S-xx)
├── _plantillas/
│   ├── CLIENTE.md             ← plantilla de alta de cliente
│   └── PROYECTO.md            ← plantilla de proyecto
└── <cliente-slug>/            ← un directorio por cliente (tenant)
    ├── CLIENTE.md             ← ficha: contacto, servicios contratados, canales
    ├── activos.jsonl          ← ledger de activos del cliente (tokens + costo)
    ├── branding/              ← marca ingerida (tokens CSS, guía, referencias)
    └── proyectos/
        └── <proyecto-slug>/
            ├── PROYECTO.md    ← alcance, hitos, estado, gates
            └── entregables/   ← activos etiquetados <PREFIJO>-NNN-*
```

## Ciclo de vida de un proyecto

```
propuesta → aprobado → en_curso → en_revision → entregado → cerrado
                                      ↑ OK de Elisa (gate obligatorio para todo
                                        lo que ve el cliente)
```

- **Alta de cliente**: copiar `_plantillas/CLIENTE.md` a `<slug>/CLIENTE.md`, ingerir
  branding a `<slug>/branding/` (tokens CSS + BRANDING.md, patrón GAL), crear skill
  `<slug>-design` si habrá activos de diseño.
- **Alta de proyecto**: copiar `_plantillas/PROYECTO.md` a
  `<slug>/proyectos/<proyecto-slug>/PROYECTO.md`, referenciar servicios del catálogo
  (S-xx), definir criterios de terminado y presupuesto de tokens.
- **Entregables**: nacen etiquetados (`<PREFIJO>-NNN`, ej. `GALMX-001`) dentro del
  proyecto, con su línea en el ledger del cliente (campo `proyecto`).
- **Cierre**: PROYECTO.md a `cerrado` + resumen de costo total (suma del ledger) +
  factura registrada por el flujo de facturas de la vertical.

## Ledger `activos.jsonl` (por cliente)

```json
{"id":"GALMX-001","proyecto":"rediseno-web","fecha":"2026-07-22","tipo":"mock-html",
 "descripcion":"Home rediseño","archivos":["proyectos/rediseno-web/entregables/GALMX-001-home.html"],
 "modelo":"<modelo>","tokens_est":85000,"metodo_estimacion":"salida×4chars/token ×1.5 + contexto",
 "costo_usd":1.20,"fuente_costo":"/cost de la sesión","estado":"borrador"}
```

## Integración con runtime (siguiente paso, NO construido aún)

- **Snapshot de proyectos** → host-job que deje `proyectos.json` (estado por cliente) en
  el volumen de la vertical clientes para que el bot responda "¿cómo va X?" sin
  confabular (patrón dato-en-SOUL / read_file local).
- **Supabase** (`clientes`, `proyectos`, `activos`) si Mission Control debe verlos —
  migración aditiva al proyecto compartido A2ABot (ojo colisiones, lección `profiles`).
Hasta que existan, la única fuente de verdad es esta carpeta.
