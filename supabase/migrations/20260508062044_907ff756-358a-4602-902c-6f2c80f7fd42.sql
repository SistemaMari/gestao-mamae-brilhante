
-- ============================================================
-- 1. Materialized View: mv_metricas_unidade
-- ============================================================
create extension if not exists pg_cron;

drop materialized view if exists public.mv_metricas_unidade;

create materialized view public.mv_metricas_unidade as
with meses as (
  select distinct date_trunc('month', d)::date as mes_referencia
  from (
    select created_at as d from public.pacientes where is_rascunho = false
    union all select created_at from public.laudos
    union all select created_at from public.exames_glicemia
    union all select created_at from public.partos where is_rascunho = false
    union all select created_at from public.registros_atendimento
  ) t
  where d is not null
),
unidades_meses as (
  select u.id as unidade_id, u.nome as unidade_nome, m.mes_referencia
  from public.unidades u
  cross join meses m
),
pac_cad as (
  select p.unidade_id, date_trunc('month', p.created_at)::date as mes, count(*)::int as n
  from public.pacientes p
  where p.is_rascunho = false and p.unidade_id is not null
  group by 1,2
),
pac_ativos as (
  select unidade_id, mes, count(distinct paciente_id)::int as n
  from (
    select p.unidade_id, date_trunc('month', ra.created_at)::date as mes, ra.paciente_id
    from public.registros_atendimento ra
    join public.pacientes p on p.id = ra.paciente_id
    where p.unidade_id is not null
    union
    select p.unidade_id, date_trunc('month', e.created_at)::date, e.paciente_id
    from public.exames_glicemia e
    join public.pacientes p on p.id = e.paciente_id
    where p.unidade_id is not null
    union
    select p.unidade_id, date_trunc('month', l.created_at)::date, l.paciente_id
    from public.laudos l
    join public.pacientes p on p.id = l.paciente_id
    where p.unidade_id is not null
  ) x
  group by 1,2
),
laudos_mes as (
  select p.unidade_id, date_trunc('month', l.created_at)::date as mes,
         count(*)::int as emitidos,
         count(*) filter (where l.cenario_clinico in ('cenario_1','cenario_6','cenario_6b'))::int as dmg_pos,
         count(distinct l.profissional_id)::int as prof_ativos
  from public.laudos l
  join public.pacientes p on p.id = l.paciente_id
  where p.unidade_id is not null
  group by 1,2
),
exames_mes as (
  select p.unidade_id, date_trunc('month', e.created_at)::date as mes, count(*)::int as n
  from public.exames_glicemia e
  join public.pacientes p on p.id = e.paciente_id
  where p.unidade_id is not null
  group by 1,2
),
partos_mes as (
  select pa.unidade_id, date_trunc('month', pa.created_at)::date as mes, count(*)::int as n
  from public.partos pa
  where pa.is_rascunho = false and pa.unidade_id is not null
  group by 1,2
),
ult_ativ as (
  select unidade_id, max(ts) as ultima
  from (
    select p.unidade_id, p.created_at as ts from public.pacientes p where p.is_rascunho=false and p.unidade_id is not null
    union all
    select p.unidade_id, l.created_at from public.laudos l join public.pacientes p on p.id=l.paciente_id where p.unidade_id is not null
    union all
    select p.unidade_id, e.created_at from public.exames_glicemia e join public.pacientes p on p.id=e.paciente_id where p.unidade_id is not null
    union all
    select ra.unidade_id, ra.created_at from public.registros_atendimento ra where ra.unidade_id is not null
  ) t
  group by 1
)
select
  um.unidade_id,
  um.unidade_nome,
  um.mes_referencia,
  coalesce(pc.n, 0) as pacientes_cadastrados,
  coalesce(pa.n, 0) as pacientes_ativos,
  coalesce(lm.emitidos, 0) as laudos_emitidos,
  coalesce(lm.dmg_pos, 0) as laudos_dmg_positivo,
  coalesce(em.n, 0) as exames_realizados,
  coalesce(pm.n, 0) as partos_registrados,
  coalesce(lm.prof_ativos, 0) as profissionais_ativos,
  ua.ultima as ultima_atividade,
  now() as refreshed_at
from unidades_meses um
left join pac_cad pc on pc.unidade_id=um.unidade_id and pc.mes=um.mes_referencia
left join pac_ativos pa on pa.unidade_id=um.unidade_id and pa.mes=um.mes_referencia
left join laudos_mes lm on lm.unidade_id=um.unidade_id and lm.mes=um.mes_referencia
left join exames_mes em on em.unidade_id=um.unidade_id and em.mes=um.mes_referencia
left join partos_mes pm on pm.unidade_id=um.unidade_id and pm.mes=um.mes_referencia
left join ult_ativ ua on ua.unidade_id=um.unidade_id;

create unique index mv_metricas_unidade_pk on public.mv_metricas_unidade (unidade_id, mes_referencia);
create index mv_metricas_unidade_mes_idx on public.mv_metricas_unidade (mes_referencia desc);

-- ============================================================
-- 2. pg_cron — refresh a cada 1h
-- ============================================================
do $$
begin
  perform cron.unschedule('refresh-mv-metricas-unidade')
  where exists (select 1 from cron.job where jobname='refresh-mv-metricas-unidade');
exception when others then null;
end $$;

select cron.schedule(
  'refresh-mv-metricas-unidade',
  '5 * * * *',
  $cron$ refresh materialized view concurrently public.mv_metricas_unidade $cron$
);

-- ============================================================
-- 3. RPC: get_metricas_consolidadas_gestor_geral
-- ============================================================
create or replace function public.get_metricas_consolidadas_gestor_geral(
  p_data_inicio date,
  p_data_fim date,
  p_unidades uuid[] default null
) returns jsonb
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_gestor_id uuid;
  v_unidades uuid[];
  v_totais record;
  v_anterior record;
  v_ant_inicio date;
  v_ant_fim date;
  v_dias int;
begin
  select id into v_gestor_id from public.gestores_gerais where user_id = auth.uid();
  if v_gestor_id is null then
    raise exception 'Acesso negado: usuário não é gestor geral' using errcode='42501';
  end if;

  select array_agg(unidade_id) into v_unidades
  from public.gestores_gerais_unidades where gestor_geral_id = v_gestor_id;

  if p_unidades is not null then
    select array_agg(u) into v_unidades from (
      select unnest(v_unidades) intersect select unnest(p_unidades)
    ) s(u);
  end if;

  v_dias := (p_data_fim - p_data_inicio) + 1;
  v_ant_fim := p_data_inicio - 1;
  v_ant_inicio := v_ant_fim - (v_dias - 1);

  select
    coalesce(sum(pacientes_ativos),0)::int as pacientes_ativos,
    coalesce(sum(laudos_emitidos),0)::int as laudos_emitidos,
    coalesce(sum(laudos_dmg_positivo),0)::int as laudos_dmg_positivo,
    coalesce(sum(partos_registrados),0)::int as partos_registrados,
    coalesce(sum(profissionais_ativos),0)::int as profissionais_ativos
  into v_totais
  from public.mv_metricas_unidade
  where unidade_id = any(coalesce(v_unidades, array[]::uuid[]))
    and mes_referencia between date_trunc('month', p_data_inicio)::date and date_trunc('month', p_data_fim)::date;

  select
    coalesce(sum(pacientes_ativos),0)::int as pacientes_ativos,
    coalesce(sum(laudos_emitidos),0)::int as laudos_emitidos,
    coalesce(sum(laudos_dmg_positivo),0)::int as laudos_dmg_positivo
  into v_anterior
  from public.mv_metricas_unidade
  where unidade_id = any(coalesce(v_unidades, array[]::uuid[]))
    and mes_referencia between date_trunc('month', v_ant_inicio)::date and date_trunc('month', v_ant_fim)::date;

  return jsonb_build_object(
    'periodo', jsonb_build_object('inicio', p_data_inicio, 'fim', p_data_fim),
    'unidades_total', coalesce(array_length(v_unidades, 1), 0),
    'totais', jsonb_build_object(
      'pacientes_ativos', v_totais.pacientes_ativos,
      'laudos_emitidos', v_totais.laudos_emitidos,
      'taxa_dmg_positivo_pct', case when v_totais.laudos_emitidos = 0 then 0
        else round(v_totais.laudos_dmg_positivo::numeric / v_totais.laudos_emitidos * 100, 1) end,
      'partos_registrados', v_totais.partos_registrados,
      'profissionais_ativos', v_totais.profissionais_ativos
    ),
    'variacao_periodo_anterior', jsonb_build_object(
      'pacientes_ativos_pct', case when v_anterior.pacientes_ativos = 0 then null
        else round((v_totais.pacientes_ativos - v_anterior.pacientes_ativos)::numeric / v_anterior.pacientes_ativos * 100, 1) end,
      'laudos_emitidos_pct', case when v_anterior.laudos_emitidos = 0 then null
        else round((v_totais.laudos_emitidos - v_anterior.laudos_emitidos)::numeric / v_anterior.laudos_emitidos * 100, 1) end,
      'taxa_dmg_positivo_delta', case
        when v_anterior.laudos_emitidos = 0 or v_totais.laudos_emitidos = 0 then null
        else round(
          (v_totais.laudos_dmg_positivo::numeric / v_totais.laudos_emitidos * 100)
          - (v_anterior.laudos_dmg_positivo::numeric / v_anterior.laudos_emitidos * 100), 1) end
    )
  );
end;
$$;

-- ============================================================
-- 4. RPC: get_ranking_unidades_gestor_geral
-- ============================================================
create or replace function public.get_ranking_unidades_gestor_geral(
  p_data_inicio date,
  p_data_fim date,
  p_unidades uuid[] default null
) returns table (
  unidade_id uuid,
  unidade_nome text,
  pacientes_ativos int,
  laudos_emitidos int,
  taxa_dmg_positivo_pct numeric,
  tempo_medio_fechamento_dias numeric,
  status_operacional text,
  ultima_atividade timestamptz,
  dias_sem_atividade int
)
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_gestor_id uuid;
  v_unidades uuid[];
begin
  select id into v_gestor_id from public.gestores_gerais where user_id = auth.uid();
  if v_gestor_id is null then
    raise exception 'Acesso negado: usuário não é gestor geral' using errcode='42501';
  end if;

  select array_agg(ggu.unidade_id) into v_unidades
  from public.gestores_gerais_unidades ggu where ggu.gestor_geral_id = v_gestor_id;

  if p_unidades is not null then
    select array_agg(u) into v_unidades from (
      select unnest(v_unidades) intersect select unnest(p_unidades)
    ) s(u);
  end if;

  return query
  with agg as (
    select mv.unidade_id, mv.unidade_nome,
      coalesce(sum(mv.pacientes_ativos),0)::int as pacientes_ativos,
      coalesce(sum(mv.laudos_emitidos),0)::int as laudos_emitidos,
      coalesce(sum(mv.laudos_dmg_positivo),0)::int as laudos_dmg_positivo,
      max(mv.ultima_atividade) as ultima_atividade
    from public.mv_metricas_unidade mv
    where mv.unidade_id = any(coalesce(v_unidades, array[]::uuid[]))
    group by mv.unidade_id, mv.unidade_nome
  ),
  fechamento as (
    select p.unidade_id,
      avg(extract(epoch from (l.created_at - ra_min.primeiro)) / 86400.0)::numeric as media_dias
    from public.laudos l
    join public.pacientes p on p.id = l.paciente_id
    join (
      select paciente_id, min(created_at) as primeiro
      from public.registros_atendimento group by paciente_id
    ) ra_min on ra_min.paciente_id = l.paciente_id
    where p.unidade_id = any(coalesce(v_unidades, array[]::uuid[]))
      and l.created_at::date between p_data_inicio and p_data_fim
    group by p.unidade_id
  )
  select
    a.unidade_id,
    a.unidade_nome,
    a.pacientes_ativos,
    a.laudos_emitidos,
    case when a.laudos_emitidos = 0 then 0::numeric
         else round(a.laudos_dmg_positivo::numeric / a.laudos_emitidos * 100, 1) end as taxa_dmg_positivo_pct,
    round(f.media_dias, 1) as tempo_medio_fechamento_dias,
    case
      when a.ultima_atividade is null then 'nao_iniciada'
      when a.ultima_atividade >= now() - interval '30 days' then 'ativa'
      when a.ultima_atividade >= now() - interval '60 days' then 'atencao'
      else 'inativa'
    end as status_operacional,
    a.ultima_atividade,
    case when a.ultima_atividade is null then null
         else (current_date - a.ultima_atividade::date)::int end as dias_sem_atividade
  from agg a
  left join fechamento f on f.unidade_id = a.unidade_id
  order by
    case
      when a.ultima_atividade is null then 0
      when a.ultima_atividade < now() - interval '60 days' then 1
      when a.ultima_atividade < now() - interval '30 days' then 2
      else 3
    end asc,
    a.laudos_emitidos desc;
end;
$$;

-- ============================================================
-- 5. RPC: get_alertas_gestor_geral
-- ============================================================
create or replace function public.get_alertas_gestor_geral(
  p_unidades uuid[] default null
) returns table (
  alerta_id text,
  unidade_id uuid,
  unidade_nome text,
  tipo text,
  severidade text,
  mensagem text,
  detalhe_numerico numeric
)
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_gestor_id uuid;
  v_unidades uuid[];
begin
  select id into v_gestor_id from public.gestores_gerais where user_id = auth.uid();
  if v_gestor_id is null then
    raise exception 'Acesso negado: usuário não é gestor geral' using errcode='42501';
  end if;

  select array_agg(ggu.unidade_id) into v_unidades
  from public.gestores_gerais_unidades ggu where ggu.gestor_geral_id = v_gestor_id;

  if p_unidades is not null then
    select array_agg(u) into v_unidades from (
      select unnest(v_unidades) intersect select unnest(p_unidades)
    ) s(u);
  end if;

  return query
  with base as (
    select u.id as unidade_id, u.nome as unidade_nome, u.created_at as unidade_criada,
      (select max(ultima_atividade) from public.mv_metricas_unidade mv where mv.unidade_id = u.id) as ultima_atividade,
      (select count(*) from public.profissionais p
        where p.unidade_id = u.id and p.acesso_revogado = false) as prof_ativos
    from public.unidades u
    where u.id = any(coalesce(v_unidades, array[]::uuid[]))
  ),
  laudos_recentes as (
    select mv.unidade_id,
      coalesce(sum(mv.laudos_emitidos) filter (where mv.mes_referencia = date_trunc('month', current_date)::date - interval '1 month'), 0)::int as ult_mes,
      coalesce(avg(mv.laudos_emitidos) filter (where mv.mes_referencia between date_trunc('month', current_date)::date - interval '4 months' and date_trunc('month', current_date)::date - interval '2 months'), 0)::numeric as media_3m
    from public.mv_metricas_unidade mv
    where mv.unidade_id = any(coalesce(v_unidades, array[]::uuid[]))
    group by mv.unidade_id
  ),
  alertas as (
    select 'inativa_60d:'||b.unidade_id::text as alerta_id, b.unidade_id, b.unidade_nome,
      'inativa_60d' as tipo, 'alta' as severidade,
      'Unidade sem atividade há mais de 60 dias' as mensagem,
      (current_date - b.ultima_atividade::date)::numeric as detalhe_numerico,
      1 as ord_sev,
      coalesce((current_date - b.ultima_atividade::date), 9999) as ord_dias
    from base b
    where b.ultima_atividade is not null and b.ultima_atividade < now() - interval '60 days'
    union all
    select 'atencao_30d:'||b.unidade_id::text, b.unidade_id, b.unidade_nome,
      'atencao_30d', 'media',
      'Unidade sem atividade entre 30 e 60 dias',
      (current_date - b.ultima_atividade::date)::numeric,
      2, coalesce((current_date - b.ultima_atividade::date), 9999)
    from base b
    where b.ultima_atividade is not null
      and b.ultima_atividade < now() - interval '30 days'
      and b.ultima_atividade >= now() - interval '60 days'
    union all
    select 'sem_profissionais:'||b.unidade_id::text, b.unidade_id, b.unidade_nome,
      'sem_profissionais', 'alta',
      'Unidade sem profissionais ativos',
      0::numeric, 1, 0
    from base b where b.prof_ativos = 0
    union all
    select 'nunca_iniciada:'||b.unidade_id::text, b.unidade_id, b.unidade_nome,
      'nunca_iniciada', 'media',
      'Unidade criada há mais de 14 dias e nunca registrou atividade',
      (current_date - b.unidade_criada::date)::numeric, 2,
      (current_date - b.unidade_criada::date)
    from base b
    where b.ultima_atividade is null and b.unidade_criada < now() - interval '14 days'
    union all
    select 'queda_laudos:'||lr.unidade_id::text, lr.unidade_id, b.unidade_nome,
      'queda_laudos', 'media',
      'Laudos do último mês caíram mais de 30% vs média dos 3 meses anteriores',
      round(lr.ult_mes - lr.media_3m, 1), 2, 0
    from laudos_recentes lr
    join base b on b.unidade_id = lr.unidade_id
    where lr.media_3m >= 1 and lr.ult_mes < lr.media_3m * 0.7
  )
  select a.alerta_id, a.unidade_id, a.unidade_nome, a.tipo, a.severidade, a.mensagem, a.detalhe_numerico
  from alertas a
  order by a.ord_sev asc, a.ord_dias desc
  limit 10;
end;
$$;

-- ============================================================
-- 6. RPC: refresh_mv_metricas_unidade_manual
-- ============================================================
create or replace function public.refresh_mv_metricas_unidade_manual()
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
begin
  if not exists (select 1 from public.gestores_gerais where user_id = auth.uid()) then
    raise exception 'Acesso negado' using errcode='42501';
  end if;
  refresh materialized view concurrently public.mv_metricas_unidade;
  return jsonb_build_object('refreshed_at', now());
end;
$$;

-- ============================================================
-- 7. Permissões
-- ============================================================
revoke all on function public.get_metricas_consolidadas_gestor_geral(date,date,uuid[]) from public;
revoke all on function public.get_ranking_unidades_gestor_geral(date,date,uuid[]) from public;
revoke all on function public.get_alertas_gestor_geral(uuid[]) from public;
revoke all on function public.refresh_mv_metricas_unidade_manual() from public;

grant execute on function public.get_metricas_consolidadas_gestor_geral(date,date,uuid[]) to authenticated;
grant execute on function public.get_ranking_unidades_gestor_geral(date,date,uuid[]) to authenticated;
grant execute on function public.get_alertas_gestor_geral(uuid[]) to authenticated;
grant execute on function public.refresh_mv_metricas_unidade_manual() to authenticated;

-- Refresh inicial
refresh materialized view public.mv_metricas_unidade;
