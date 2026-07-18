# Protección de `master` y flujo de merge (repo lisagomez/hermes-os-a2a)

Estado verificado 2026-07-18. Este archivo es el detalle que referencia el aprendizaje
2026-07-14/2026-07-18 de `CLAUDE.md` (antes era una referencia rota: el archivo no existía).

## Configuración vigente
- `required_pull_request_reviews.required_approving_review_count: 1`
- `enforce_admins: true` → **no hay bypass por token**: ni `gh pr merge --admin` ni un
  `git push origin master` directo entran (GH006), tampoco para la cuenta admin
  (`lisagomez`), que es la que usa el agente.
- GitHub **prohíbe auto-aprobarse**: un PR creado por `lisagomez` no puede aprobarlo esa
  misma cuenta. Los 4 colaboradores con write (`HuertaVictor`, `Johann-Valderrama`,
  `ZELANDIAIO`, `makeflowia-lab`) sí pueden aprobar.
- Contexto (2026-07-12): en un repo de cuenta personal TODO colaborador es `write`
  (los roles finos son de Organizaciones) y la protección de rama requiere plan Pro.

## Flujo de merge ESTÁNDAR del agente (autorización permanente de Elisa, 2026-07-18)
El agente ejecuta los merges a master con la ventana de bypass, sin pedir OK por-merge:

```bash
gh api -X PATCH repos/lisagomez/hermes-os-a2a/branches/master/protection/required_pull_request_reviews \
  -F required_approving_review_count=0 --jq '.required_approving_review_count'
gh pr merge <N> --merge          # varios PRs listos: misma ventana
gh api -X PATCH repos/lisagomez/hermes-os-a2a/branches/master/protection/required_pull_request_reviews \
  -F required_approving_review_count=1 --jq '.required_approving_review_count'
gh api repos/lisagomez/hermes-os-a2a/branches/master/protection \
  --jq '{reviews: .required_pull_request_reviews.required_approving_review_count, enforce_admins: .enforce_admins.enabled}'
```

Reglas duras del flujo:
1. **Restaurar a 1 SIEMPRE e inmediatamente**, también cuando el merge falla (encadenar la
   restauración con `;`, no con `&&`, para que un fallo del merge no deje la ventana abierta).
2. **Verificar el estado final** (`reviews:1` + `enforce_admins:true`) en el mismo bloque.
3. **Jamás `git push origin master` directo** — todo cambio, incluido el del agente, pasa
   por PR.
4. **PRs de colaboradores se revisan antes de mergear** (patrón PR #58: review a fondo,
   fixes commiteados a la rama del PR, comentario con hallazgos, y entonces merge).
5. Tras mergear: borrar la rama en local y en origin, y hacer `git pull --ff-only` de master.
6. Al mergear varios PRs en cadena: el 1º puede generar conflicto nuevo en el 2º contra el
   master recién movido (visto con #55/#56, ambos añadían su línea a
   `.claude/memory/MEMORY.md`). Conflicto aditivo → conservar AMBOS lados (doctrina
   2026-07-11).

## Historial
- 2026-07-12: se descubre que `enforce_admins:false` dejaba pasar al admin; queda la regla
  "todo por PR".
- 2026-07-14: master endurecida (`enforce_admins:true` + 1 review). Bypass usado para
  PRs #49/#50 con autorización expresa, documentado como excepcional.
- 2026-07-18: Elisa convierte el bypass en el flujo estándar del agente (autorización
  permanente); usado ese día para #57–#61, #55 y #56.
