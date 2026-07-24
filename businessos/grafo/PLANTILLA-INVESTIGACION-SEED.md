# Plantilla de investigación → seed del grafo Hermes (logística / exportación)

> Versión corregida del prompt de investigación logística para que su **salida
> estructurada sea *drop-in* del grafo real** (`seed/reglas.json`, validado por
> `gen_seed_sql.py --check`). Reemplaza las plantillas de esquema inventadas del
> borrador original; la mitad de investigación narrativa (misión, cobertura,
> nodos, buyer persona, oportunidades) sigue vigente **como Salida A**.
>
> **Regla de oro del grafo:** cero afirmación sin fuente; fail-safe a `dudoso`
> cuando no hay regla/prueba aplicable; el seed se edita SOLO en
> `seed/reglas.json` (+ `gen_seed_sql.py`); `02-seed.sql` es generado.

## 0. Lo que este grafo ES (y no es) — leer antes de estructurar nada

El grafo NO tiene entidades `nodo`, `actor`, `subcategoria`, `nivel_certeza` ni
`condicion`. Su modelo es:

```
jurisdiccion (MX, CO)
  × dimension (fiscal · contable · contractual · regulatorio)
    × categoria (lista fija, clasificada por keywords + exclusiones)
      × regimen  →  impacto { veredicto_base, requisitos[], banderas[], parametros }
```

Para exportación documental, la dimensión es **`regulatorio`** (no fiscal/
contable/contractual — la clasificación NO cruza dominios). El régimen es
**`GENERAL`** (regulatorio no tiene régimen fiscal).

### Dos salidas, frontera dura entre ellas

- **Salida A — investigación / producto** (narrativa): informe ejecutivo, buyer
  persona, dolores, fichas de nodo, matrices documentales, oportunidades,
  scores de automatización/transparencia/riesgo. **NADA de esto se siembra.**
- **Salida B — seed del grafo**: SOLO reglas regulatorias con fuente primaria,
  en el esquema exacto de abajo. Todo lo de "nodo", "automatización", "riesgo"
  y "transparencia" es Salida A, **no** un veredicto del grafo.

## 1. El veredicto tiene 3 valores — no los inventes

`veredicto_base` en dimensión `regulatorio` ∈ **`permitido` · `no_permitido` ·
`dudoso`**. `dudoso` es el **fail-safe** y el default cuando no hay prueba de
exigencia de autoridad. (El catálogo completo del validador incluye además
`deducible`/`no_deducible`, que son de la dimensión fiscal — no los uses aquí.)

**Los demás "veredictos" del borrador NO son veredictos:**

| Concepto del borrador | Dónde va en el grafo real |
|---|---|
| `obligatorio` / `condicionado` | es el estatus de un **`requisito`** (string en `requisitos[]`), no un veredicto |
| `depende_de_tercero` | **`banderas[]`** |
| `no_confirmado` / `baja_transparencia` | veredicto `dudoso` + **`banderas[]`**; el detalle de accesibilidad de datos → Salida A |
| `automatizable*`, `riesgo_*` | **Salida A** (tablas de oportunidad/riesgo), nunca en el seed |

## 2. Esquema real de una regla (Salida B) — calca esto

```yaml
# clave: MAYÚSCULAS, jurisdiccion-instrumento-articulo-tema (única)
clave: MX-EXP-AEREO-EAWB-672
jurisdiccion: MX                 # MX | CO
dimension: regulatorio           # export documental = regulatorio SIEMPRE
titulo: "..."                    # una línea
texto_resumen: "..."             # 2-5 líneas; separa NORMA de PRÁCTICA
fuente_cita: "..."               # fuente PRIMARIA (ley/reglamento/RGCE/manual/estándar)
fuente_url: "https://..."        # OBLIGATORIO http(s) — el gate lo exige
vigente_desde: "2019-01-01"      # fecha ISO obligatoria
vigente_hasta: null              # null = vigente
impactos:                        # ≥1; único por (categoria, regimen)
  - categoria: EXPORT_AEREO_EAWB # de la lista fija (ver §3); NO texto libre
    regimen: GENERAL
    veredicto_base: dudoso       # permitido | no_permitido | dudoso
    requisitos:                  # lista de strings (aquí va "obligatorio/condicionado")
      - "..."
    banderas:                    # lista de strings (dependencias, opacidad, avisos)
      - "..."
    parametros:
      verificar: false           # true OBLIGATORIO si hay tope/plazo/monto numérico
```

**Crosswalk desde el borrador original** (si ya tienes output viejo):
`regla_id`→`clave` · `texto_regla`→`titulo`+`texto_resumen` ·
`fuentes[]`→`fuente_cita`+`fuente_url` (planos) ·
`vigencia.estado`→`vigente_desde`/`vigente_hasta` ·
`subcategoria`/`modo`/`nodo_id`/`actor_afectado`/`nivel_certeza`/`condicion`/`notas`
→ **fuera del seed** (van a `categoria`, `parametros`, `banderas` o Salida A).

## 3. Categorías nuevas: keywords + exclusiones obligatorias

Cada categoría se clasifica por **keywords en minúsculas, globalmente únicas**
(una keyword repetida entre dos categorías rompe el clasificador — incidente real
`AGENTES_SEGUROS` vs `DRONES_DELIVERY`). Cada categoría de exportación documental
debe declarar sus `keywords` **y** sus `exclusiones` para no chocar entre modos.

```yaml
clave: EXPORT_AEREO_EAWB
nombre: "Exportacion aerea: guia aerea electronica (e-AWB)"
descripcion: "Emision, aceptacion y uso de la e-AWB en exportacion aerea desde Mexico"
keywords: ["e-awb", "eawb", "guia aerea electronica", "guia aerea", "air waybill electronico", "awb electronica"]
exclusiones: ["carta porte", "conocimiento de embarque", "bill of lading", "bl maritimo"]
```

Categorías hermanas a diseñar igual (con sus propias keywords/exclusiones
disjuntas): `EXPORT_MARITIMO_BL`, `EXPORT_TERRESTRE_CARTA_PORTE`, etc.

## 4. Ejemplo trabajado — VALIDADO contra `gen_seed_sql.py --check` (OK)

Demuestra el patrón correcto: estándar sectorial (IATA) ≠ exigencia de autoridad
⇒ veredicto **`dudoso`**, hueco de conocimiento declarado en `banderas`, base
legal MX marcada como pendiente en `requisitos`. Fuente primaria real y citada.

```json
{
  "clave": "MX-EXP-AEREO-EAWB-672",
  "jurisdiccion": "MX",
  "dimension": "regulatorio",
  "titulo": "e-AWB en exportacion aerea: estandar sectorial IATA, exigencia de autoridad no acreditada",
  "texto_resumen": "La guia aerea electronica (e-AWB) esta definida por el estandar sectorial de IATA (Resolution 672 y acuerdo multilateral e-AWB). Su aceptacion es PRACTICA de aerolineas y agentes de carga, no una obligacion probada de autoridad mexicana en esta ficha: la base legal domestica (Ley Aduanera, Reglas Generales de Comercio Exterior, aceptacion via VUCEM) esta PENDIENTE de investigacion primaria. Por regla de oro, sin prueba de exigencia de autoridad el veredicto es dudoso (requisito operativo, no normativo confirmado).",
  "fuente_cita": "IATA e-AWB (Resolution 672) — estandar sectorial; NO acredita exigencia de autoridad mexicana (base legal MX pendiente de cotejo)",
  "fuente_url": "https://www.iata.org/en/programs/cargo/e/eawb/",
  "vigente_desde": "2019-01-01",
  "vigente_hasta": null,
  "impactos": [
    {
      "categoria": "EXPORT_AEREO_EAWB",
      "regimen": "GENERAL",
      "veredicto_base": "dudoso",
      "requisitos": [
        "Confirmar aceptacion operativa de e-AWB con la aerolinea y el agente de carga del nodo (practica, no obligacion legal probada)",
        "Verificar si el recinto fiscalizado y la aduana del nodo aceptan la transmision electronica o exigen respaldo en papel",
        "PENDIENTE: cotejar base legal domestica (Ley Aduanera, Reglas Generales de Comercio Exterior vigentes, aceptacion via VUCEM) contra fuente primaria antes de elevar el veredicto"
      ],
      "banderas": [
        "Estandar sectorial (IATA) != exigencia de autoridad: no sembrar como obligatorio sin fuente primaria mexicana",
        "Hueco de conocimiento: falta base legal MX -> clasificacion de siembra REQUIERE MAS FUENTES"
      ],
      "parametros": { "verificar": false }
    }
  ]
}
```

## 5. Checklist del gate de procedencia (antes de proponer una regla)

- [ ] `clave`, `titulo`, `texto_resumen`, `fuente_cita`, `fuente_url` presentes
- [ ] `fuente_url` empieza con `http://` / `https://` y es **fuente primaria**
      (ley/reglamento/RGCE/manual/estándar reconocido — no blog ni marketing)
- [ ] `vigente_desde` en fecha ISO; `vigente_hasta` null o ≥ `vigente_desde`
- [ ] `dimension` = `regulatorio`; `jurisdiccion` ∈ {MX, CO}
- [ ] cada impacto: `categoria` de la lista fija, `veredicto_base` ∈
      {permitido, no_permitido, dudoso}, único por (categoria, regimen)
- [ ] **cualquier tope/plazo/monto numérico ⇒ `parametros.verificar: true`**
      (cotejo DOF/fuente oficial pendiente hasta producción)
- [ ] norma vs. práctica separadas; sin prueba de autoridad ⇒ `dudoso`
- [ ] validar de verdad: `python3 gen_seed_sql.py --check --json <tu.json>`

## 6. Nodo, automatización, riesgo, transparencia → Salida A

El grafo no modela nodos. La riqueza nodo-céntrica del borrador (fichas por
AICM/Manzanillo/Nuevo Laredo, digitalización, dependencia de terceros,
oportunidades de producto) es **Salida A** valiosísima para discovery, buyer
persona y diseño de producto — pero **no es sembrable** hoy. Dos caminos, y
**ambos son decisión de la dueña**, no un supuesto del investigador:

1. **Modelar la especificidad de nodo dentro del esquema actual**: como
   `regimen` propio (p. ej. `AICM`) o como `banderas`/`parametros` de un impacto
   de categoría regulatoria. Sin cambio de esquema.
2. **Proponer una extensión de esquema** (entidad `nodo`) — cambio mayor;
   requiere decisión explícita antes de sembrar nada nodo-céntrico.

Marca todo hallazgo nodo-céntrico como **REQUIERE REVISIÓN HUMANA / decisión de
esquema**, nunca como regla lista.

## 7. Orden de trabajo (del borrador, conservado)

1. marco conceptual y documental → 2. Top nodos prioritarios (Salida A) →
3. justificar priorización con fuentes → 4. profundizar nodos prioritarios →
5. extraer **reglas regulatorias con fuente primaria** (Salida B, §2-§5) →
6. clasificar por sembrabilidad (`SEMBRABLE YA` / `… CON REVISIÓN HUMANA` /
`NO SEMBRABLE AÚN` / `REQUIERE MÁS FUENTES` / `PRÁCTICA OPERATIVA, NO REGLA`) →
7. cobertura nacional → 8. buyer persona/dolores/oportunidades (Salida A) →
9. entregar Salida B lista para `seed/reglas.json`.

**Regla final:** toda afirmación de Salida B debe sobrevivir a `--check`. Si no
hay base primaria suficiente, es hueco de conocimiento (`dudoso` +
`REQUIERE MÁS FUENTES`), no un hecho.

---
*Companion del borrador `prompt-grafo-hermes-investigacion-logistica.md`. Esquema
verificado contra `seed/reglas.json` y `gen_seed_sql.py` (Fase 8, dimensión
`regulatorio`).*
