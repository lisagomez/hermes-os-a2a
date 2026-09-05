# Registro de incidentes

> Control **C6** de `GOBERNANZA.md`. **Append-only**: se añade una entrada por incidente;
> **nunca se edita una pasada**.
>
> El procedimiento (`plantillas/incidente.md`) decía qué hacer y no tenía dónde
> escribirlo. Este archivo es ese hueco cerrado.

## Este archivo nace vacío, a propósito

Un registro de incidentes es **del proyecto que los sufre**. Heredar los de otro no aporta
nada y sí confunde: nadie sabe si esa fuga le ocurrió a él.

Lo que **sí** viaja de un incidente pasado es su aprendizaje, y viaja donde muerde: una
regla en *Reglas de Código* de `CLAUDE.md`, un caso en el corpus, una comprobación en el
verificador. Si un incidente ajeno no dejó ninguna de esas tres cosas, tampoco tenía nada
que enseñarte.

> Los incidentes del **buzón agéntico** tienen su propio procedimiento en
> `businessos/gobernanza/procedimiento-incidente-inyeccion.md`, con sus cuatro
> disparadores y el gate `canario_ausente`. Ese documento manda en su dominio; el
> incidente se registra **igual aquí**, para que el repositorio tenga una sola línea de
> tiempo.
>
> Los **Aprendizajes de `CLAUDE.md`** son la historia de errores ya corregidos de este
> repo, no un registro de incidentes: no se migran aquí. Un aprendizaje es la enseñanza;
> un incidente es el suceso con su contención, su clasificación y su cierre.

## Formato

```markdown
### <fecha ISO> — <título> — <contenido | vector abierto>
- **Qué pasó**:
- **Cómo se detectó**:
- **Contención**:
- **Clasificación**: ¿salió dato? ¿lo detuvo un gate? ¿ningún gate lo vio?
- **Cierre** (las tres, o no está cerrado):
  - Caso de regresión: <identificador; el contenido vive en la rama `golden-sets`>
  - Aprendizaje: <dónde quedó, y que sea un sitio que obligue>
  - Riesgo residual: <entrada en REGISTRO-RIESGO.md, o "ninguno">
```

**Un incidente cerrado sin caso de regresión no está cerrado: está olvidado.** Y un caso
que existe pero nunca se ha ejecutado no es evidencia de nada — solo prueba que alguien lo
escribió.

---

## Entradas

*(ninguna todavía)*

<!-- Añadir aquí los incidentes siguientes. NO editar los anteriores. -->
