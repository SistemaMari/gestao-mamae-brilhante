-- Helper RPC para a edge function seed-demo-gestor-geral fazer o primeiro
-- refresh da MV (sem CONCURRENTLY, pois a MV pode estar vazia).
-- Privilégios: revoga de anon/authenticated; só service_role chama.

create or replace function public.refresh_mv_metricas_unidade_seed()
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
begin
  refresh materialized view public.mv_metricas_unidade;
  return jsonb_build_object('refreshed_at', now());
end;
$$;

revoke all on function public.refresh_mv_metricas_unidade_seed() from public;
revoke all on function public.refresh_mv_metricas_unidade_seed() from anon;
revoke all on function public.refresh_mv_metricas_unidade_seed() from authenticated;