
# Plano 23A — Backend Dashboard Admin

Implementação integral do Prompt 23A v3 (Lucas). Cria a infraestrutura de dados agregados pro dashboard admin: 8 views materializadas, 2 cron jobs `pg_cron`, Edge Function autenticada `admin-metrics` e tabela de auditoria `admin_access_log`. Sem alterações de frontend.

## Pré-validação (já feita na inspeção do schema)

- `profissional_id uuid NOT NULL` confirmado em `pacientes`, `consultas`, `laudos`, `partos`, `exames_glicemia`. **Não existe tabela `gtt` separada** — GTT vive em `consultas` via `tipo`/`cenario_clinico`. Ajusto o UNION ALL pra remover `gtt`.
- `profissionais.plano_id uuid NOT NULL` confirmado (FK lógica pra `planos`).
- `unidades.tipo_id uuid` confirmado.
- Tabela `planos` tem 3 slugs esperados (`inicial`, `intermediaria`, `profissional`). Tabela `tipos_unidade` existe.
- `data_expiracao_teste` não existe — nada a dropar.

## Migration 1 — Extensão e auxiliar

```sql
CREATE EXTENSION IF NOT EXISTS pg_cron;

-- View auxiliar de atividade dos últimos 30 dias
CREATE MATERIALIZED VIEW IF NOT EXISTS mv_profissionais_ativos_30d AS
SELECT profissional_id, MAX(ultima_acao) AS ultima_acao FROM (
  SELECT profissional_id, created_at AS ultima_acao FROM pacientes
   WHERE created_at > now() - interval '30 days'
  UNION ALL
  SELECT profissional_id, GREATEST(created_at, updated_at) FROM consultas
   WHERE GREATEST(created_at, updated_at) > now() - interval '30 days'
  UNION ALL
  SELECT profissional_id, created_at FROM laudos
   WHERE created_at > now() - interval '30 days'
  UNION ALL
  SELECT profissional_id, created_at FROM partos
   WHERE created_at > now() - interval '30 days'
  UNION ALL
  SELECT profissional_id, created_at FROM exames_glicemia
   WHERE created_at > now() - interval '30 days'
) sub
WHERE profissional_id IS NOT NULL
GROUP BY profissional_id;
CREATE UNIQUE INDEX idx_mv_ativos_30d_pk ON mv_profissionais_ativos_30d(profissional_id);
```

## Migration 2 — As 8 MVs do dashboard

Cada MV tem **UNIQUE INDEX** pra permitir `REFRESH ... CONCURRENTLY`:

1. **`mv_admin_resumo_global`** — `total_profissionais`, `total_unidades`, `total_gestores_gerais`, `total_consolidacoes` (1 linha).
2. **`mv_admin_distribuicao_geografica`** — `pais, estado, cidade, total_profissionais, total_unidades`.
3. **`mv_admin_top_cidades`** — top 20 cidades por nº de profissionais.
4. **`mv_admin_unidades_resumo`** — por unidade: `nome, tipo (via tipos_unidade.nome), cidade, estado, total_profissionais, total_pacientes, total_laudos`.
5. **`mv_admin_profissionais_por_plano`** — JOIN `profissionais` × `planos` por `plano_id`: `plano_slug, plano_nome, total, ativos_30d`.
6. **`mv_admin_evolucao_mensal_planos`** — últimos 12 meses, contagem de profissionais por plano e por mês de criação.
7. **`mv_admin_evolucao_mensal_profissionais`** — últimos 12 meses, novos profissionais e ativos por mês.
8. **`mv_admin_alertas_operacionais`** — 5 linhas fixas com `tipo_alerta, total`:
   - `profissional_inativo_30d` — profissionais que não estão em `mv_profissionais_ativos_30d`.
   - `intermediaria_inativo_30d` — plano `intermediaria` inativos.
   - `inicial_inativo_30d` — plano `inicial` inativos.
   - `unidade_dormente` — unidades sem nenhum profissional ativo nos últimos 30 dias.
   - `onboarding_travado` — `created_at < now() - 7 days` AND (`crm` IS NULL OR `especialidade` IS NULL OR `unidade_id` IS NULL).

## Migration 3 — Refresh inicial (sem CONCURRENTLY)

`REFRESH MATERIALIZED VIEW <nome>;` em cada uma das 9 MVs (auxiliar + 8). Obrigatório antes do primeiro refresh concorrente.

## Migration 4 — Cron jobs

```sql
-- Job horário: views gerais
SELECT cron.unschedule('refresh_admin_views_hourly')
 WHERE EXISTS (SELECT 1 FROM cron.job WHERE jobname='refresh_admin_views_hourly');
SELECT cron.schedule('refresh_admin_views_hourly', '0 * * * *', $$
  REFRESH MATERIALIZED VIEW CONCURRENTLY mv_profissionais_ativos_30d;
  REFRESH MATERIALIZED VIEW CONCURRENTLY mv_admin_resumo_global;
  REFRESH MATERIALIZED VIEW CONCURRENTLY mv_admin_distribuicao_geografica;
  REFRESH MATERIALIZED VIEW CONCURRENTLY mv_admin_top_cidades;
  REFRESH MATERIALIZED VIEW CONCURRENTLY mv_admin_unidades_resumo;
  REFRESH MATERIALIZED VIEW CONCURRENTLY mv_admin_profissionais_por_plano;
  REFRESH MATERIALIZED VIEW CONCURRENTLY mv_admin_evolucao_mensal_planos;
  REFRESH MATERIALIZED VIEW CONCURRENTLY mv_admin_evolucao_mensal_profissionais;
$$);

-- Job 10min: alertas
SELECT cron.unschedule('refresh_admin_alertas_10min')
 WHERE EXISTS (SELECT 1 FROM cron.job WHERE jobname='refresh_admin_alertas_10min');
SELECT cron.schedule('refresh_admin_alertas_10min', '*/10 * * * *', $$
  REFRESH MATERIALIZED VIEW CONCURRENTLY mv_profissionais_ativos_30d;
  REFRESH MATERIALIZED VIEW CONCURRENTLY mv_admin_alertas_operacionais;
$$);
```

## Migration 5 — admin_access_log + permissões

```sql
CREATE TABLE IF NOT EXISTS admin_access_log (
  id BIGSERIAL PRIMARY KEY,
  admin_id UUID NOT NULL REFERENCES profissionais(id),
  view_consultada TEXT NOT NULL,
  pais_filtro TEXT NULL,
  ip TEXT NULL,
  user_agent TEXT NULL,
  status_code INTEGER NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_admin_log_admin ON admin_access_log(admin_id, created_at DESC);
CREATE INDEX idx_admin_log_view ON admin_access_log(view_consultada, created_at DESC);

ALTER TABLE admin_access_log ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins veem logs" ON admin_access_log FOR SELECT TO authenticated
  USING (is_admin(auth.uid()));
-- INSERT só via service_role (Edge Function); não criar política pra authenticated.

-- Revogar acesso direto às MVs
REVOKE ALL ON mv_admin_resumo_global,
              mv_admin_distribuicao_geografica,
              mv_admin_top_cidades,
              mv_admin_unidades_resumo,
              mv_admin_profissionais_por_plano,
              mv_admin_evolucao_mensal_planos,
              mv_admin_evolucao_mensal_profissionais,
              mv_admin_alertas_operacionais,
              mv_profissionais_ativos_30d
       FROM authenticated, anon;
```

## Edge Function `admin-metrics`

Arquivo: `supabase/functions/admin-metrics/index.ts`.

- CORS via `corsHeaders` do supabase-js.
- Validação JWT em código (verify_jwt = false por padrão).
- **Whitelist** rígida do parâmetro `view` — só aceita os 8 nomes:
  ```
  resumo_global, distribuicao_geografica, top_cidades, unidades_resumo,
  profissionais_por_plano, evolucao_mensal_planos,
  evolucao_mensal_profissionais, alertas_operacionais
  ```
- Valida `is_admin(auth.uid())` via query — retorna 403 se não for admin.
- Faz `SELECT * FROM mv_admin_<view>` usando service_role.
- Aceita query param opcional `pais` (filtro client-side simples).
- Loga sempre em `admin_access_log` (com status_code, ip do header `x-forwarded-for`, user_agent).
- Headers de resposta: `Cache-Control: public, max-age=300` (60s pra `alertas_operacionais`).

## Critérios de aceite (validação pós-deploy)

1. `SELECT * FROM pg_extension WHERE extname='pg_cron'` retorna 1 linha.
2. `SELECT count(*) FROM cron.job WHERE jobname IN ('refresh_admin_views_hourly','refresh_admin_alertas_10min')` = 2.
3. As 9 MVs existem e têm dados (`SELECT count(*) FROM mv_admin_*`).
4. `SELECT * FROM mv_admin_alertas_operacionais` retorna 5 linhas com os 5 `tipo_alerta` esperados.
5. `SELECT * FROM mv_admin_profissionais_por_plano` retorna até 3 linhas (slugs `inicial`/`intermediaria`/`profissional`).
6. Edge Function: chamada como admin → 200; como consultório → 403; com `view=DROP TABLE...` → 400.
7. `SELECT count(*) FROM admin_access_log` cresce a cada chamada.
8. SELECT direto em `mv_admin_*` como `authenticated` falha (permissão revogada).

## Fora de escopo

- Frontend admin (23B) — Moara/Lovable em outro prompt.
- `assinaturas` / webhook Asaas — DOC separado.
- Filtros geográficos avançados, exportação CSV (25A).

## Riscos / observações

- **pg_cron**: se a extensão não puder ser habilitada no plano atual do Cloud, a Migration 4 vai falhar. Nesse caso paro, te aviso, e cron vira agendamento externo (Vercel Cron / GH Actions chamando a Edge Function).
- **`profissionais.plano` (text legado)**: vou ignorar essa coluna nas MVs e usar só `plano_id` JOIN `planos`. Não dropo a coluna agora — fica pra cleanup futuro.
- **Volume `admin_access_log`**: sem TTL no escopo do 23A. Cleanup mensal pode entrar depois.

