## Achados da investigação prévia (3.1)

Antes de migrar, três pontos do schema real divergem do prompt:

1. **`consultas` NÃO tem `status_ficha`.** Tem apenas `is_rascunho boolean` + `status_gerado text`. O nome `status_ficha` já existe em **`pacientes`** com outro significado (`aguardando_gj | dmg_confirmado | …`). Para evitar colisão, vou adicionar na tabela `consultas` a coluna **`status_ficha`** (enum textual `rascunho|completa|laudo_gerado|finalizada`) como pediu o prompt — são tabelas diferentes, não há conflito real, mas vou backfillar a partir de `is_rascunho` e manter `is_rascunho` por compatibilidade (depreca em prompt futuro).
2. **Referência de IG já existe parcialmente:** `pacientes.referencia_ig text CHECK (dum|usg)` + `pacientes.referencia_usg_id uuid → exames_usg(id)`. O prompt pede `ig_referencia_tipo` e `ig_referencia_usg_id`. Vou **reusar as colunas existentes** (não renomear) e tratar `ig_referencia_tipo` como alias semântico de `referencia_ig`. Critério de aceite #5 fica satisfeito pelas colunas atuais.
3. **Auto-save não usa Edge Function.** Está no `Retorno1Form.tsx` via `useAutosave` chamando `supabase.from('consultas').update(...)` direto. Vou criar a Edge Function `salvar-ficha-retorno` com modo `rascunho|finalizar` + COALESCE; a refatoração do frontend para usá-la é responsabilidade do **Prompt 34B**. Esta entrega entrega a função pronta e a deixa disponível.

Tabela `exames_usg` hoje **permite** duas USGs com mesma data; vou adicionar constraint `UNIQUE(paciente_id, data_exame)`.

---

## Migração SQL (uma só)

### Bloco A — Máquina de estado da ficha
- `ALTER TABLE consultas ADD COLUMN status_ficha text NOT NULL DEFAULT 'rascunho' CHECK (status_ficha IN ('rascunho','completa','laudo_gerado','finalizada'))`
- `ALTER TABLE consultas ADD COLUMN ficha_finalizada_em timestamptz`
- Backfill: `UPDATE consultas SET status_ficha = CASE WHEN is_rascunho THEN 'rascunho' ELSE 'completa' END, ficha_finalizada_em = CASE WHEN is_rascunho THEN NULL ELSE created_at END`
- Onde existir laudo gerado: `UPDATE consultas SET status_ficha='laudo_gerado' WHERE id IN (SELECT consulta_id FROM laudos WHERE status='concluido' AND consulta_id IS NOT NULL)`

### Bloco B — Constraints em `exames_usg`
- `ALTER TABLE exames_usg ADD CONSTRAINT exames_usg_paciente_data_uq UNIQUE (paciente_id, data_exame)`
- Trigger `BEFORE INSERT OR UPDATE` que `RAISE EXCEPTION` se `data_exame > CURRENT_DATE`.

### Bloco C — View `v_ficha_retorno_contexto`
- Adaptada ao schema real: `consultas.tipo` (`consulta_1` = caso novo, `retorno_1`/`retorno_n` = retornos), `exames_glicemia.valor_mgdl` e `tipo_exame`, `consultas.cenario_clinico`. View `SECURITY INVOKER` para herdar RLS.

### Bloco D — Função `calcular_ig(p_paciente_id uuid, p_data_alvo date)`
- Retorna `(semanas int, dias int, origem text, base_data date)`.
- Lê `pacientes.referencia_ig` + `pacientes.referencia_usg_id`/`pacientes.dum`.
- Se `referencia_ig='usg'`: busca USG referenciada em `exames_usg`, calcula base = `data_exame − (ig_semanas*7+ig_dias)`, origem = `'USG #'||ordem`.
- Fallback DUM, ou retorna NULLs se sem âncora.
- `LANGUAGE plpgsql STABLE`, `SECURITY INVOKER`, `SET search_path=public`.

---

## Edge Function `salvar-ficha-retorno`

`supabase/functions/salvar-ficha-retorno/index.ts` com `verify_jwt=true` (default).

**Payload:**
```ts
{ consulta_id?: string, paciente_id: string, modo: 'rascunho'|'finalizar',
  campos: { data?: string, ig_semanas?: number, ig_dias?: number,
            cenario_clinico?: string, observacoes?: string },
  exame_glicemia?: { id?: string, valor_mgdl?: number, tipo_exame?: string, data_exame?: string },
  alerta_divergencia_ig?: boolean /* preenchido na resposta */ }
```

**Comportamento:**
- Resolve `profissional_id` via `auth.uid()`.
- `modo='rascunho'`: UPSERT em `consultas` com **COALESCE** em todos os campos clínicos; `status_ficha='rascunho'`. Idem `exames_glicemia` se enviado.
- `modo='finalizar'`: valida campos obrigatórios (`data`, `ig_semanas`, `ig_dias`, `cenario_clinico` e — para Retorno 1 — exame de glicemia presente). Se faltar, retorna `{ error: 'campos_pendentes', faltantes: [...] }` com HTTP 422. Se OK, UPDATE com COALESCE + `status_ficha='completa'`, `ficha_finalizada_em=now()`.
- Verifica divergência IG-USG vs IG-DUM > 7 dias e retorna `alerta_divergencia_ig: true` (não bloqueia).
- Retorna a `consulta` atualizada + resultado de `calcular_ig` para a data da consulta.

## Bloqueio do laudo em rascunho

Editar `supabase/functions/gerar-laudo/index.ts`: ao iniciar, `SELECT status_ficha FROM consultas WHERE id=$1`; se `!= 'completa'` retornar 422 `{ error:'ficha_incompleta' }`. Após sucesso, `UPDATE consultas SET status_ficha='laudo_gerado'`.

---

## Fora deste prompt (vai para 34B)
- Refatorar `Retorno1Form.tsx` para chamar a Edge Function em vez de `supabase.from('consultas').update`.
- Banners de status / badges de origem de IG na UI.
- Consumo do `v_ficha_retorno_contexto` no card readonly do Retorno.

---

## Critérios de aceite cobertos
1–4, 6–11 ✅ pela migração + edge function + alteração em `gerar-laudo`.
5 ✅ pelas colunas já existentes (`referencia_ig`, `referencia_usg_id`) — documentado nos comentários SQL como equivalentes a `ig_referencia_tipo`/`ig_referencia_usg_id`.

**Confirma que posso seguir com (a) reusar `pacientes.referencia_ig` em vez de criar `ig_referencia_tipo` duplicado, (b) manter `is_rascunho` por compatibilidade junto com o novo `status_ficha`?** Se sim, executo migração + edge functions.
