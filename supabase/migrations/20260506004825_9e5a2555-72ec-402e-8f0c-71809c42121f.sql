
-- ============================================================================
-- PROMPT 28.3 — Camada Contratante
-- Ordem crítica (9 passos da Seção 1.3)
-- ============================================================================

-- PASSO 1 — Criar tabela contratantes
CREATE TABLE public.contratantes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nome TEXT NOT NULL,
  cnpj TEXT NOT NULL UNIQUE,
  razao_social TEXT,
  contato_nome TEXT NOT NULL,
  contato_email TEXT NOT NULL,
  contato_telefone TEXT,
  data_inicio_contrato DATE NOT NULL,
  data_termino_contrato DATE,
  status TEXT NOT NULL DEFAULT 'ativo'
    CHECK (status IN ('ativo','suspenso','encerrado')),
  observacoes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  encerrado_em TIMESTAMPTZ,
  encerrado_por UUID REFERENCES auth.users(id),
  motivo_encerramento TEXT
);

-- Trigger de validação data_termino > data_inicio (não usar CHECK por imutabilidade)
CREATE OR REPLACE FUNCTION public.validar_datas_contratante()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  IF NEW.data_termino_contrato IS NOT NULL
     AND NEW.data_termino_contrato <= NEW.data_inicio_contrato THEN
    RAISE EXCEPTION 'data_termino_invalida'
      USING HINT = 'data_termino_contrato deve ser posterior a data_inicio_contrato';
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_validar_datas_contratante
BEFORE INSERT OR UPDATE ON public.contratantes
FOR EACH ROW EXECUTE FUNCTION public.validar_datas_contratante();

-- PASSO 2 — Inserir MARI Sandbox
INSERT INTO public.contratantes (
  nome, cnpj, razao_social,
  contato_nome, contato_email,
  data_inicio_contrato, status, observacoes
) VALUES (
  'MARI Sandbox', '00.000.000/0001-00', 'MARI Sandbox - Uso Interno',
  'Admin MARI', 'SuporteMari@novodmg.com.br',
  CURRENT_DATE, 'ativo',
  'Contratante criado automaticamente para absorver unidades de teste pré-existentes ao Prompt 28.3.'
);

-- PASSO 3 — Coluna contratante_id em unidades (nullable inicial)
ALTER TABLE public.unidades
  ADD COLUMN contratante_id UUID REFERENCES public.contratantes(id);

-- PASSO 4 — Backfill: todas as unidades existentes → MARI Sandbox
UPDATE public.unidades
SET contratante_id = (SELECT id FROM public.contratantes WHERE nome = 'MARI Sandbox')
WHERE contratante_id IS NULL;

-- PASSO 5 — Aplicar NOT NULL
ALTER TABLE public.unidades
  ALTER COLUMN contratante_id SET NOT NULL;

CREATE INDEX idx_unidades_contratante_id ON public.unidades(contratante_id);

-- PASSO 6 — Tabela vínculos gestor geral × contratante (N:N)
CREATE TABLE public.gestores_gerais_contratantes (
  gestor_geral_id UUID NOT NULL REFERENCES public.gestores_gerais(id) ON DELETE CASCADE,
  contratante_id UUID NOT NULL REFERENCES public.contratantes(id) ON DELETE CASCADE,
  vinculado_em TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (gestor_geral_id, contratante_id)
);

CREATE INDEX idx_ggc_contratante ON public.gestores_gerais_contratantes(contratante_id);

-- PASSO 7 — Migrar vínculos existentes
INSERT INTO public.gestores_gerais_contratantes (gestor_geral_id, contratante_id)
SELECT DISTINCT ggu.gestor_geral_id, u.contratante_id
FROM public.gestores_gerais_unidades ggu
JOIN public.unidades u ON u.id = ggu.unidade_id
ON CONFLICT DO NOTHING;

-- PASSO 8 — Tabela log_transferencia_unidade (auditoria imutável)
CREATE TABLE public.log_transferencia_unidade (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  unidade_id UUID NOT NULL REFERENCES public.unidades(id),
  contratante_origem_id UUID REFERENCES public.contratantes(id),
  contratante_destino_id UUID NOT NULL REFERENCES public.contratantes(id),
  justificativa TEXT NOT NULL,
  transferido_em TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  transferido_por UUID NOT NULL REFERENCES auth.users(id),
  contratante_origem_nome_snapshot TEXT,
  contratante_destino_nome_snapshot TEXT
);

CREATE INDEX idx_log_transf_unidade ON public.log_transferencia_unidade(unidade_id);

-- PASSO 9 — RLS

-- contratantes
ALTER TABLE public.contratantes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins gerenciam contratantes"
ON public.contratantes
FOR ALL
TO authenticated
USING (is_admin(auth.uid()))
WITH CHECK (is_admin(auth.uid()));

CREATE POLICY "Gestor geral ve seus contratantes"
ON public.contratantes
FOR SELECT
TO authenticated
USING (
  id IN (
    SELECT ggc.contratante_id
    FROM public.gestores_gerais_contratantes ggc
    JOIN public.gestores_gerais gg ON gg.id = ggc.gestor_geral_id
    WHERE gg.user_id = auth.uid()
  )
);

CREATE POLICY "Profissional ve contratante via unidade"
ON public.contratantes
FOR SELECT
TO authenticated
USING (
  id IN (
    SELECT u.contratante_id
    FROM public.unidades u
    JOIN public.profissionais p ON p.unidade_id = u.id
    WHERE p.user_id = auth.uid() AND p.acesso_revogado = false
  )
);

-- gestores_gerais_contratantes
ALTER TABLE public.gestores_gerais_contratantes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins gerenciam vinculos ggc"
ON public.gestores_gerais_contratantes
FOR ALL
TO authenticated
USING (is_admin(auth.uid()))
WITH CHECK (is_admin(auth.uid()));

CREATE POLICY "Gestor geral ve seus vinculos ggc"
ON public.gestores_gerais_contratantes
FOR SELECT
TO authenticated
USING (
  gestor_geral_id IN (
    SELECT id FROM public.gestores_gerais WHERE user_id = auth.uid()
  )
);

-- log_transferencia_unidade (auditoria imutável: sem UPDATE/DELETE)
ALTER TABLE public.log_transferencia_unidade ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins veem log transferencias"
ON public.log_transferencia_unidade
FOR SELECT
TO authenticated
USING (is_admin(auth.uid()));

CREATE POLICY "Admins inserem log transferencias"
ON public.log_transferencia_unidade
FOR INSERT
TO authenticated
WITH CHECK (is_admin(auth.uid()));

CREATE POLICY "Gestor geral ve log dos seus contratantes"
ON public.log_transferencia_unidade
FOR SELECT
TO authenticated
USING (
  contratante_destino_id IN (
    SELECT ggc.contratante_id
    FROM public.gestores_gerais_contratantes ggc
    JOIN public.gestores_gerais gg ON gg.id = ggc.gestor_geral_id
    WHERE gg.user_id = auth.uid()
  )
  OR contratante_origem_id IN (
    SELECT ggc.contratante_id
    FROM public.gestores_gerais_contratantes ggc
    JOIN public.gestores_gerais gg ON gg.id = ggc.gestor_geral_id
    WHERE gg.user_id = auth.uid()
  )
);
