-- supabase-enriquecimiento-refuerzo.sql — RPC atomica para dominio_patron (App A).
-- Complemento de supabase-enriquecimiento.sql (idempotente; aplicar via management
-- API igual que aquella). Motivo (ataque adversarial al diseno del servicio,
-- objecion ALTA): un incremento GET+PATCH desde PostgREST es read-modify-write y
-- PIERDE incrementos bajo concurrencia (backfill de leads del mismo dominio en
-- paralelo). El refuerzo debe ser UNA sentencia SQL.
--
-- Semantica: mismo patron observado -> soporte + 1; patron DISTINTO al registrado
-- -> el nuevo lo reemplaza con soporte 1 (la evidencia fresca manda y la
-- contradiccion queda visible en datos.patron_anterior, jamas silenciosa).

create or replace function public.dominio_patron_reforzar(p_dominio text, p_patron text)
returns void
language sql
set search_path = ''
as $$
  insert into public.dominio_patron as dp (dominio, patron)
  values (lower(p_dominio), p_patron)
  on conflict (dominio) do update set
    soporte = case when dp.patron = excluded.patron then dp.soporte + 1 else 1 end,
    datos = case when dp.patron = excluded.patron then dp.datos
                 else dp.datos || jsonb_build_object('patron_anterior', dp.patron,
                                                     'soporte_anterior', dp.soporte) end,
    patron = excluded.patron,
    ultima_confirmacion = now();
$$;

comment on function public.dominio_patron_reforzar(text, text) is
  'Refuerzo atomico del activo de patrones (App A): mismo patron = soporte+1; patron distinto = reemplaza con soporte 1 dejando el anterior en datos. UNA sentencia: seguro bajo concurrencia. Llama SOLO enriquecimiento-a2a (service_role).';

revoke all on function public.dominio_patron_reforzar(text, text) from public, anon, authenticated;
