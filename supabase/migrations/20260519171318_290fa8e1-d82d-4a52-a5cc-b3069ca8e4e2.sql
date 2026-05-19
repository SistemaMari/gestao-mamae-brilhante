
-- Bloco A: máquina de estado em consultas
ALTER TABLE public.consultas
  ADD COLUMN IF NOT EXISTS status_ficha text NOT NULL DEFAULT 'rascunho'
    CHECK (status_ficha IN ('rascunho','completa','laudo_gerado','finalizada'));
ALTER TABLE public.consultas
  ADD COLUMN IF NOT EXISTS ficha_finalizada_em timestamptz;

UPDATE public.consultas
SET status_ficha = CASE WHEN is_rascunho THEN 'rascunho' ELSE 'completa' END,
    ficha_finalizada_em = CASE WHEN is_rascunho THEN NULL ELSE created_at END;

UPDATE public.consultas c
SET status_ficha = 'laudo_gerado'
FROM public.laudos l
WHERE l.consulta_id = c.id
  AND l.status IN ('gerado','concluido')
  AND c.status_ficha = 'completa';

COMMENT ON COLUMN public.consultas.status_ficha IS
  'Máquina de estado da ficha: rascunho → completa → laudo_gerado → finalizada. is_rascunho mantido por compatibilidade.';

-- Bloco B: integridade em exames_usg
-- 1) Limpa duplicatas (mesma paciente + mesma data): mantém menor ordem / mais antigo
DELETE FROM public.exames_usg u
USING public.exames_usg k
WHERE u.paciente_id = k.paciente_id
  AND u.data_exame  = k.data_exame
  AND u.id <> k.id
  AND (k.ordem, k.criado_em, k.id) < (u.ordem, u.criado_em, u.id);

-- 2) Constraint de unicidade
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'exames_usg_paciente_data_uq') THEN
    ALTER TABLE public.exames_usg
      ADD CONSTRAINT exames_usg_paciente_data_uq UNIQUE (paciente_id, data_exame);
  END IF;
END $$;

-- 3) Trigger: bloqueia data futura
CREATE OR REPLACE FUNCTION public.exames_usg_valida_data()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  IF NEW.data_exame > CURRENT_DATE THEN
    RAISE EXCEPTION 'Data do exame de USG não pode ser futura (recebido: %)', NEW.data_exame
      USING ERRCODE = 'check_violation';
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_exames_usg_valida_data ON public.exames_usg;
CREATE TRIGGER trg_exames_usg_valida_data
BEFORE INSERT OR UPDATE ON public.exames_usg
FOR EACH ROW EXECUTE FUNCTION public.exames_usg_valida_data();

-- Bloco C: view de contexto da ficha de retorno
CREATE OR REPLACE VIEW public.v_ficha_retorno_contexto
WITH (security_invoker = true) AS
SELECT
  c_ret.id                       AS consulta_retorno_id,
  c_ret.paciente_id,
  c_cn.id                        AS consulta_caso_novo_id,
  c_cn.data                      AS data_caso_novo,
  c_cn.cenario_clinico           AS cenario_caso_novo,
  eg.id                          AS exame_gj_id,
  eg.valor_mgdl                  AS glicemia_jejum_caso_novo,
  eg.tipo_exame                  AS tipo_exame_caso_novo,
  eg.data_exame                  AS data_exame_caso_novo
FROM public.consultas c_ret
LEFT JOIN LATERAL (
  SELECT * FROM public.consultas cn
  WHERE cn.paciente_id = c_ret.paciente_id
    AND cn.tipo = 'consulta_1'
  ORDER BY cn.numero_sequencial ASC, cn.created_at ASC
  LIMIT 1
) c_cn ON true
LEFT JOIN LATERAL (
  SELECT * FROM public.exames_glicemia e
  WHERE e.consulta_id = c_cn.id
  ORDER BY e.data_exame ASC, e.created_at ASC
  LIMIT 1
) eg ON true
WHERE c_ret.tipo <> 'consulta_1';

COMMENT ON VIEW public.v_ficha_retorno_contexto IS
  'Para uma consulta de retorno, devolve glicemia de jejum / cenário / data do Caso Novo da mesma paciente. READ-ONLY.';

-- Bloco D: função única de IG
CREATE OR REPLACE FUNCTION public.calcular_ig(
  p_paciente_id uuid,
  p_data_alvo  date
) RETURNS TABLE (semanas int, dias int, origem text, base_data date)
LANGUAGE plpgsql
STABLE
SECURITY INVOKER
SET search_path = public
AS $$
DECLARE
  v_ref       text;
  v_usg_id    uuid;
  v_dum       date;
  v_usg_data  date;
  v_usg_sem   int;
  v_usg_dias  int;
  v_usg_ord   int;
  v_base      date;
  v_total     int;
BEGIN
  SELECT referencia_ig, referencia_usg_id, dum
    INTO v_ref, v_usg_id, v_dum
  FROM pacientes WHERE id = p_paciente_id;

  IF v_ref = 'usg' AND v_usg_id IS NOT NULL THEN
    SELECT data_exame, ig_semanas, ig_dias, ordem
      INTO v_usg_data, v_usg_sem, v_usg_dias, v_usg_ord
    FROM exames_usg WHERE id = v_usg_id;
    IF v_usg_data IS NOT NULL THEN
      v_base := v_usg_data - ((v_usg_sem * 7) + COALESCE(v_usg_dias,0));
      v_total := (p_data_alvo - v_base);
      IF v_total < 0 THEN RETURN; END IF;
      RETURN QUERY SELECT v_total / 7, v_total % 7,
                          ('USG #' || v_usg_ord)::text, v_base;
      RETURN;
    END IF;
  END IF;

  IF v_dum IS NOT NULL THEN
    v_total := (p_data_alvo - v_dum);
    IF v_total < 0 THEN RETURN; END IF;
    RETURN QUERY SELECT v_total / 7, v_total % 7, 'DUM'::text, v_dum;
    RETURN;
  END IF;

  RETURN;
END;
$$;

COMMENT ON FUNCTION public.calcular_ig(uuid, date) IS
  'Fonte única para cálculo de IG. Lê pacientes.referencia_ig + referencia_usg_id|dum e retorna semanas/dias/origem/base_data.';
