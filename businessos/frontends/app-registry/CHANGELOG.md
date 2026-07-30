# CHANGELOG — @a2a/app-registry

Una línea por versión (`REGISTRY_VERSION` en src/apps.ts). El sync estampa
versión+hash en la cabecera de cada copia vendored.

- **v1** (2026-07-29): registro inicial — 5 superficies (3 internas: mission-control,
  control-interno, meeting-copilot; 2 públicas: cliente-web2, cliente-a2a-web3) +
  schema NavNodo/NavArbol con esRutaActiva/rastroDe/aplanarNav/validarArbol.
- **v2** (2026-07-30, hotfix del ataque adversarial al PR #194): control-interno
  queda sin urlProd (127.0.0.1 era una URL de producción imposible — el tile pasa
  a "en construcción" con nota, habilitable por env override); los tiles en
  construcción pintan su `nota`; los llamadores deben pasar `produccion:
  process.env.NODE_ENV === 'production'` a resolverUrlApp (antes urlDevDefault
  era código muerto y en localhost se saltaba a producción con sesión real).
