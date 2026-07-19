# docs/ - Área de conocimiento del equipo

> Puerta de entrada (léela primero). Esta carpeta es el espacio COMPARTIDO donde vive el
> conocimiento del proyecto que todavía NO es código ni un PRP formal: ideas tempranas,
> investigaciones, charlas y artículos. Es de lectura para todo el equipo (Elisa, Víctor,
> Ricardo, Luis, Johann).

## Qué va aquí y qué no

| Va aquí | No va aquí |
|---|---|
| Ideas sin formalizar (antes de convertirse en PRP) | PRPs formales → `.claude/PRPs/` |
| Investigaciones, validaciones de mercado, análisis | Código o features → `businessos/`, `src/` |
| Charlas, ensayos, artículos de referencia (propios o de terceros) | Lógica de negocio → `BUSINESS_LOGIC.md` |
| Notas de visión / diseño de producto | Reuniones/transcripts privados → `docs/_privado/` (ignorado) |

Cuando una idea de aquí madura, se gradúa a un PRP en `.claude/PRPs/`; el doc de origen puede
quedarse como referencia.

## Regla de organización: feature-first

Cada tema vive en **su propia carpeta** con un `_context.md` que la explica (no archivos sueltos
al azar). Slugs sin acentos, nombres estables. Así un agente (o una persona) entra por el
`_context.md` de la carpeta y entiende el tema sin abrir todo.

## Privacidad

Lo que NO sea compartible (transcripts de reunión, notas privadas) va en `docs/_privado/`, que
está en `.gitignore` y no viaja al repo. Todo lo demás en `docs/` sí se comparte con el equipo.

## Mapa de contenido actual

| Ruta | Tipo | Qué es |
|---|---|---|
| `juego-y-oficina-de-agentes/` | Charla + investigación | Ensayo (de un colaborador externo) sobre teoría de juegos aplicada a la oficina de agentes, su contraste verificado contra fuente primaria, y utilidades de producto (patrones de HUD que reflejan estado real). Ver su `_context.md`. |
| `Validación de oportunidad SaaS agent-to-agent para seguros de mercancía en México.md` | Investigación | Validación de mercado (seguros de carga MX) para la oportunidad A2A. Candidato a reubicarse en su carpeta-tema feature-first. |
| `Efecto de creacion (construcción) de cursos platzi.md` | Idea / bookmark | Nota suelta (enlace). Pendiente de desarrollar o descartar. |
