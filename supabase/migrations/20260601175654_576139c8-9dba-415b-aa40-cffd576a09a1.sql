-- 35A: Pactuação pós-prandial (1h/2h) em perfis_glicemicos

ALTER TABLE public.perfis_glicemicos
  ADD COLUMN IF NOT EXISTS tipo_pos_prandial text NOT NULL DEFAULT '1h';

ALTER TABLE public.perfis_glicemicos
  DROP CONSTRAINT IF EXISTS perfis_glicemicos_tipo_pos_prandial_check;

ALTER TABLE public.perfis_glicemicos
  ADD CONSTRAINT perfis_glicemicos_tipo_pos_prandial_check
  CHECK (tipo_pos_prandial IN ('1h','2h'));

-- Backfill explícito (defensivo — o DEFAULT já cobre, mas garantimos não-NULL)
UPDATE public.perfis_glicemicos
  SET tipo_pos_prandial = '1h'
  WHERE tipo_pos_prandial IS NULL;

-- Imutabilidade: tipo_pos_prandial não pode mudar após criação
CREATE OR REPLACE FUNCTION public.impedir_update_tipo_pos_prandial()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  IF NEW.tipo_pos_prandial IS DISTINCT FROM OLD.tipo_pos_prandial THEN
    RAISE EXCEPTION 'tipo_pos_prandial é imutável após criação do perfil glicêmico'
      USING ERRCODE = '22023';
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_perfis_glicemicos_imutabilidade_pos_prandial ON public.perfis_glicemicos;
CREATE TRIGGER trg_perfis_glicemicos_imutabilidade_pos_prandial
  BEFORE UPDATE ON public.perfis_glicemicos
  FOR EACH ROW
  EXECUTE FUNCTION public.impedir_update_tipo_pos_prandial();