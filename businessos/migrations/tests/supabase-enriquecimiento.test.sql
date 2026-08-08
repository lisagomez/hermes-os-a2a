-- supabase-enriquecimiento.test.sql — pruebas de comportamiento de la migración
-- supabase-enriquecimiento.sql (App A). NO se aplica a producción: corre contra un
-- Postgres efímero de dev (patrón: apt-get download + dpkg-deb -x, ver memoria
-- postgres-efimero-sin-sudo). Requiere la cadena fase9 → fase11 → crm0 → fase12
-- + roles anon/authenticated + la migración aplicada DOS veces (idempotencia).
-- Suite con estado: UNA sola pasada por base fresca (la re-corrida duplica filas
-- a propósito — T6/T19a no llevan on conflict).
-- Todo camino que DEBE fallar va en un DO-block que reporta PASS/FAIL explícito.

\set ON_ERROR_STOP 1

-- Semilla: un lead real
insert into public.leads (lead_id, origen, empresa) values ('L-TEST-1', 'manual', 'ACME SA')
on conflict (lead_id) do nothing;

-- T1: ledger acepta hit con veredicto
insert into public.enriquecimiento_intento (lead_id, fuente, campo, resultado, veredicto, valor, costo_usd)
values ('L-TEST-1', 'patron_dominio', 'email', 'hit', 'dudoso', 'jperez@acme.mx', 0);
select 'T1 PASS: hit con veredicto insertado' as r;

-- T2: hit SIN veredicto debe fallar (CHECK)
do $$ begin
  insert into public.enriquecimiento_intento (lead_id, fuente, campo, resultado, valor)
  values ('L-TEST-1', 'denue', 'telefono', 'hit', '5555');
  raise exception 'T2 FAIL: acepto un hit sin veredicto';
exception when check_violation then raise notice 'T2 PASS: hit sin veredicto rechazado'; end $$;

-- T3: UPDATE al ledger debe fallar (append-only)
do $$ begin
  update public.enriquecimiento_intento set costo_usd = 99 where lead_id = 'L-TEST-1';
  raise exception 'T3 FAIL: el ledger acepto UPDATE';
exception when raise_exception then
  if sqlerrm like 'T3 FAIL%' then raise; end if;
  raise notice 'T3 PASS: UPDATE bloqueado (%)', sqlerrm;
end $$;

-- T4: DELETE al ledger debe fallar
do $$ begin
  delete from public.enriquecimiento_intento where lead_id = 'L-TEST-1';
  raise exception 'T4 FAIL: el ledger acepto DELETE';
exception when raise_exception then
  if sqlerrm like 'T4 FAIL%' then raise; end if;
  raise notice 'T4 PASS: DELETE bloqueado';
end $$;

-- T5: intento con lead inexistente debe fallar (FK)
do $$ begin
  insert into public.enriquecimiento_intento (lead_id, fuente, resultado)
  values ('L-NO-EXISTE', 'denue', 'miss');
  raise exception 'T5 FAIL: acepto lead inexistente';
exception when foreign_key_violation then raise notice 'T5 PASS: FK a leads respetada'; end $$;

-- T6: consolidado con procedencia + upsert por PK
insert into public.lead_enriquecimiento (lead_id, campo, valor, veredicto, fuente, intento_id)
select 'L-TEST-1', 'email', 'jperez@acme.mx', 'dudoso', 'patron_dominio', id
from public.enriquecimiento_intento where lead_id = 'L-TEST-1' limit 1;
insert into public.lead_enriquecimiento (lead_id, campo, valor, veredicto, fuente, intento_id)
select 'L-TEST-1', 'email', 'juan.perez@acme.mx', 'valido', 'proveedor_email', id
from public.enriquecimiento_intento where lead_id = 'L-TEST-1' limit 1
on conflict (lead_id, campo) do update
  set valor = excluded.valor, veredicto = excluded.veredicto,
      fuente = excluded.fuente, intento_id = excluded.intento_id,
      actualizado_en = now();
select case when (select count(*) from public.lead_enriquecimiento where lead_id='L-TEST-1' and campo='email') = 1
            and (select veredicto from public.lead_enriquecimiento where lead_id='L-TEST-1' and campo='email') = 'valido'
  then 'T6 PASS: upsert consolidado por PK' else 'T6 FAIL' end as r;

-- T7: override sin dictamen previo debe fallar (fail-closed)
do $$ begin
  insert into public.override_69b (rfc, autorizado_por, motivo, vence_en)
  values ('XAXX010101000', 'elisa', 'proveedor conocido', now() + interval '30 days');
  raise exception 'T7 FAIL: override sin dictamen acepto';
exception when raise_exception then
  if sqlerrm like 'T7 FAIL%' then raise; end if;
  raise notice 'T7 PASS: override sin dictamen bloqueado';
when foreign_key_violation then raise notice 'T7 PASS: override sin dictamen bloqueado (FK)';
end $$;

-- T8: dictamen 'definitivo' → override debe fallar (invariante 1, estatus vivo)
insert into public.contraparte_69b (rfc, estatus, razon_social, fuente)
values ('AAA010101AAA', 'definitivo', 'FACTURERA SA', 'listado SAT 69-B 2026-07')
on conflict (rfc) do nothing;
do $$ begin
  insert into public.override_69b (rfc, autorizado_por, motivo, vence_en)
  values ('AAA010101AAA', 'elisa', 'insisto', now() + interval '30 days');
  raise exception 'T8 FAIL: override a definitivo acepto';
exception when raise_exception then
  if sqlerrm like 'T8 FAIL%' then raise; end if;
  raise notice 'T8 PASS: override a definitivo bloqueado';
end $$;

-- T8b: tampoco se puede declarar el snapshot a mano (el trigger lo pisa con el vivo)
insert into public.contraparte_69b (rfc, estatus, fuente)
values ('BBB020202BB2', 'presunto', 'listado SAT 69-B 2026-07')
on conflict (rfc) do nothing;
insert into public.override_69b (rfc, estatus_al_autorizar, autorizado_por, motivo, vence_en)
values ('BBB020202BB2', 'no_listado', 'elisa', 'cliente historico', now() + interval '30 days');
select case when (select estatus_al_autorizar from public.override_69b where rfc='BBB020202BB2') = 'presunto'
  then 'T8b PASS: snapshot lo fija el trigger (declarado no_listado, quedo presunto)'
  else 'T8b FAIL: el caller pudo mentir el snapshot' end as r;

-- T9: vence_en NULL debe fallar (invariante 2)
do $$ begin
  insert into public.override_69b (rfc, autorizado_por, motivo, vence_en)
  values ('BBB020202BB2', 'elisa', 'sin caducidad', null);
  raise exception 'T9 FAIL: vence_en null acepto';
exception when not_null_violation then raise notice 'T9 PASS: vence_en NULL rechazado'; end $$;

-- T10: empeora el estatus → override se invalida (invariante 3)
update public.contraparte_69b set estatus = 'definitivo' where rfc = 'BBB020202BB2';
select case when (select invalidado from public.override_69b where rfc='BBB020202BB2')
  then 'T10 PASS: empeoramiento invalido el override — ' ||
       (select invalidado_motivo from public.override_69b where rfc='BBB020202BB2')
  else 'T10 FAIL: el override sobrevivio al empeoramiento' end as r;

-- T11: mejora del estatus NO invalida (y no revive lo invalidado)
insert into public.contraparte_69b (rfc, estatus, fuente)
values ('CCC030303CC3', 'presunto', 'listado SAT 69-B 2026-07')
on conflict (rfc) do nothing;
insert into public.override_69b (rfc, autorizado_por, motivo, vence_en)
values ('CCC030303CC3', 'elisa', 'en litigio, riesgo aceptado', now() + interval '15 days');
update public.contraparte_69b set estatus = 'desvirtuado' where rfc = 'CCC030303CC3';
select case when not (select invalidado from public.override_69b where rfc='CCC030303CC3')
  then 'T11 PASS: la mejora no invalido el override'
  else 'T11 FAIL: una mejora invalido el override' end as r;

-- T12: RFC en minúsculas rechazado (consulta por RFC exacto)
do $$ begin
  insert into public.contraparte_69b (rfc, estatus) values ('ddd040404dd4', 'presunto');
  raise exception 'T12 FAIL: rfc minusculas acepto';
exception when check_violation then raise notice 'T12 PASS: rfc en minusculas rechazado'; end $$;

-- T13: vistas responden y costo_por_hit no divide entre cero
insert into public.enriquecimiento_intento (lead_id, fuente, campo, resultado, costo_usd)
values ('L-TEST-1', 'proveedor_email', 'email', 'miss', 0.003);
select 'T13a rows: ' || count(*)::text as r from public.v_cascada_rendimiento;
select case when (select costo_por_hit from public.v_cascada_rendimiento
                  where fuente='proveedor_email' and campo='email') is null
  then 'T13 PASS: fuente sin hits -> costo_por_hit NULL (sin division por cero)'
  else 'T13 FAIL' end as r;
select 'T13b aporte_marginal rows: ' || count(*)::text as r from public.v_aporte_marginal;

-- T14: anon/authenticated no ven las vistas ni las tablas
set role anon;
do $$ begin
  perform * from public.v_cascada_rendimiento;
  raise exception 'T14 FAIL: anon leyo la vista';
exception when insufficient_privilege then raise notice 'T14 PASS: anon sin acceso a la vista'; end $$;
reset role;

select '=== FIN: revisar que no haya FAIL arriba ===' as r;


-- T15: TRUNCATE bloqueado. El simple lo frena la FK de lead_enriquecimiento;
-- el vector real es TRUNCATE CASCADE (salta la FK) → lo debe cazar el trigger.
do $$ begin
  truncate public.enriquecimiento_intento cascade;
  raise exception 'T15 FAIL: TRUNCATE CASCADE paso';
exception when raise_exception then
  if sqlerrm like 'T15 FAIL%' then raise; end if;
  raise notice 'T15 PASS: TRUNCATE CASCADE bloqueado por el trigger';
end $$;

-- T16: revivir un override invalidado (true -> false) bloqueado
do $$ begin
  update public.override_69b set invalidado = false, invalidado_motivo = ''
   where rfc = 'BBB020202BB2';
  raise exception 'T16 FAIL: override revivido';
exception when raise_exception then
  if sqlerrm like 'T16 FAIL%' then raise; end if;
  raise notice 'T16 PASS: revivir override bloqueado';
end $$;

-- T17: estirar vence_en bloqueado (incluso invalidando a la vez)
do $$ begin
  update public.override_69b set vence_en = now() + interval '11 months'
   where rfc = 'CCC030303CC3' and not invalidado;
  raise exception 'T17 FAIL: vence_en estirado';
exception when raise_exception then
  if sqlerrm like 'T17 FAIL%' then raise; end if;
  raise notice 'T17 PASS: estirar vence_en bloqueado';
end $$;

-- T18a: supresión LFPDPPP permitida (redactar valor/detalle, nada más cambia)
update public.enriquecimiento_intento
   set valor = '[suprimido-lfpdppp]', detalle = '{"suprimido": true}'::jsonb
 where lead_id = 'L-TEST-1' and resultado = 'hit';
select case when (select count(*) from public.enriquecimiento_intento
                  where lead_id='L-TEST-1' and resultado='hit' and valor='[suprimido-lfpdppp]') >= 1
  then 'T18a PASS: supresion LFPDPPP aplicada al ledger' else 'T18a FAIL' end as r;

-- T18b: un UPDATE de valor que NO es el tombstone sigue bloqueado
do $$ begin
  update public.enriquecimiento_intento set valor = 'otro@correo.mx'
   where lead_id = 'L-TEST-1' and resultado = 'hit';
  raise exception 'T18b FAIL: update arbitrario de valor paso';
exception when raise_exception then
  if sqlerrm like 'T18b FAIL%' then raise; end if;
  raise notice 'T18b PASS: update no-tombstone bloqueado';
end $$;

-- T18c: tombstone que ADEMÁS intenta cambiar el costo, bloqueado
do $$ begin
  update public.enriquecimiento_intento
     set valor = '[suprimido-lfpdppp]', detalle = '{"suprimido": true}'::jsonb, costo_usd = 0.5
   where lead_id = 'L-TEST-1' and resultado = 'miss';
  raise exception 'T18c FAIL: tombstone con cambio de costo paso';
exception when raise_exception then
  if sqlerrm like 'T18c FAIL%' then raise; end if;
  raise notice 'T18c PASS: tombstone no permite tocar otras columnas';
end $$;

-- T19a: fila de ajuste con costo negativo y marca, aceptada
insert into public.enriquecimiento_intento (lead_id, fuente, campo, resultado, costo_usd, detalle)
values ('L-TEST-1', 'proveedor_email', 'email', 'ajuste', -0.003,
        jsonb_build_object('compensa_intento_id', 2, 'motivo', 'cobro duplicado del proveedor'));
select 'T19a PASS: ajuste negativo marcado aceptado' as r;

-- T19b: costo negativo SIN marca de compensación, rechazado
do $$ begin
  insert into public.enriquecimiento_intento (lead_id, fuente, resultado, costo_usd)
  values ('L-TEST-1', 'proveedor_email', 'miss', -1);
  raise exception 'T19b FAIL: negativo sin marca paso';
exception when check_violation then raise notice 'T19b PASS: negativo sin marca rechazado'; end $$;

-- T20: vence_en a mas de 1 año, rechazado (override permanente imposible)
do $$ begin
  insert into public.override_69b (rfc, autorizado_por, motivo, vence_en)
  values ('CCC030303CC3', 'elisa', 'permanente', now() + interval '2 years');
  raise exception 'T20 FAIL: override a 2 anos paso';
exception when check_violation then raise notice 'T20 PASS: vence_en acotado a 1 ano'; end $$;

-- T21: DELETE de un override bloqueado (registro de autorización = auditoría)
do $$ begin
  delete from public.override_69b where rfc = 'BBB020202BB2';
  raise exception 'T21 FAIL: delete de override paso';
exception when raise_exception then
  if sqlerrm like 'T21 FAIL%' then raise; end if;
  raise notice 'T21 PASS: delete de override bloqueado';
end $$;

-- T22: la vista no cuenta ajustes como intentos y el costo queda NETO
select case
  when (select intentos from public.v_cascada_rendimiento
        where fuente='proveedor_email' and campo='email') = 1
   and (select costo_usd from public.v_cascada_rendimiento
        where fuente='proveedor_email' and campo='email') = 0
  then 'T22 PASS: ajuste fuera de intentos, costo neteado a 0'
  else 'T22 FAIL: intentos=' ||
       coalesce((select intentos::text from public.v_cascada_rendimiento
                 where fuente='proveedor_email' and campo='email'),'null') ||
       ' costo=' ||
       coalesce((select costo_usd::text from public.v_cascada_rendimiento
                 where fuente='proveedor_email' and campo='email'),'null')
  end as r;

-- T23: DELETE+INSERT de contraparte con override vivo falla VISIBLE (FK restrict)
do $$ begin
  delete from public.contraparte_69b where rfc = 'CCC030303CC3';
  raise exception 'T23 FAIL: delete de contraparte con overrides paso';
exception when foreign_key_violation or restrict_violation then
  raise notice 'T23 PASS: refresco por DELETE+INSERT truena visible (usa UPSERT)';
end $$;

select '=== FIN v2: revisar que no haya FAIL arriba ===' as r;
