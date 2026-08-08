---
name: revocar-execute-funciones-postgres
description: Para quitar EXECUTE de una funcion Postgres a anon/authenticated hay que revocar a PUBLIC, no a los roles.
metadata:
  type: reference
---

Al crear o recrear una función (`create [or replace] function`), Postgres otorga
`EXECUTE` a **`PUBLIC`** por defecto. Los roles `anon` y `authenticated` son miembros
de `PUBLIC`, así que **heredan** el permiso.

Por eso `revoke execute ... from anon, authenticated` **no surte efecto**:
`has_function_privilege('anon', oid, 'execute')` sigue devolviendo `true` porque el
grant vive en `PUBLIC`. La sentencia correcta es:

```sql
revoke execute on function public.<fn>() from public;
```

Verificar con:

```sql
select
  has_function_privilege('anon', p.oid, 'execute'),
  has_function_privilege('authenticated', p.oid, 'execute'),
  has_function_privilege('public', p.oid, 'execute')
from pg_proc p join pg_namespace n on n.oid = p.pronamespace
where n.nspname = 'public' and p.proname = '<fn>';
```

Contexto: surgió al cerrar los advisors de seguridad de `handle_new_user`
(SECURITY DEFINER ejecutable por anon/authenticated vía `/rest/v1/rpc/`). El fix
completo (también fija `set search_path = ''`) quedó en
`businessos/migrations/harden_handle_new_user.sql`. Nota: revocar EXECUTE **no** afecta
al trigger sobre `auth.users` — los triggers no dependen del grant `EXECUTE`.

El MCP de Supabase está en `--read-only`, así que estas migraciones se ejecutan a mano
en el SQL Editor del dashboard. Ver [[supabase-acceso]].
