-- Hardening de handle_new_user (advisors de seguridad)
-- 1. Fija search_path para evitar search_path hijacking en SECURITY DEFINER
-- 2. Revoca EXECUTE via RPC a anon/authenticated (sigue funcionando como trigger)

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $function$
  begin
    insert into public.profiles (id, email, full_name, avatar_url)
    values (
      new.id, new.email,
      coalesce(new.raw_user_meta_data->>'full_name', new.raw_user_meta_data->>'name'),
      new.raw_user_meta_data->>'avatar_url'
    );
    return new;
  end;
$function$;

-- Revocar a PUBLIC: el grant por defecto al crear la funcion es a PUBLIC,
-- no a los roles directamente. Revocar solo a anon/authenticated NO basta
-- porque heredan el EXECUTE via PUBLIC.
revoke execute on function public.handle_new_user() from public;
