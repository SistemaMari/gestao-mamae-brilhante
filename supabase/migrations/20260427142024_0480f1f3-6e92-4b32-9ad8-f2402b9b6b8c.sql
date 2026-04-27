-- Tabela relatorios_unidade
CREATE TABLE public.relatorios_unidade (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  unidade_id UUID NOT NULL,
  gestor_id UUID NOT NULL,
  periodo_inicio DATE NOT NULL,
  periodo_fim DATE NOT NULL,
  tipo TEXT NOT NULL DEFAULT 'dashboard_gestao',
  arquivo_path TEXT NOT NULL,
  arquivo_tamanho_bytes BIGINT,
  metricas_resumo JSONB,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

CREATE INDEX idx_relatorios_unidade_unidade ON public.relatorios_unidade(unidade_id);
CREATE INDEX idx_relatorios_unidade_periodo ON public.relatorios_unidade(periodo_inicio, periodo_fim);

ALTER TABLE public.relatorios_unidade ENABLE ROW LEVEL SECURITY;

-- Gestor da unidade pode INSERT relatórios da própria unidade
CREATE POLICY "Gestor da unidade pode inserir relatorios"
ON public.relatorios_unidade FOR INSERT
TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.profissionais p
    WHERE p.user_id = auth.uid()
      AND p.unidade_id = relatorios_unidade.unidade_id
      AND p.perfil_institucional = 'gestor'
  )
);

-- Gestor da unidade pode SELECT relatórios da própria unidade
CREATE POLICY "Gestor da unidade pode ver relatorios da unidade"
ON public.relatorios_unidade FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.profissionais p
    WHERE p.user_id = auth.uid()
      AND p.unidade_id = relatorios_unidade.unidade_id
      AND p.perfil_institucional = 'gestor'
  )
);

-- Gestor geral pode SELECT todos
CREATE POLICY "Gestor geral pode ver todos os relatorios"
ON public.relatorios_unidade FOR SELECT
TO authenticated
USING (public.is_gestor_geral(auth.uid()));

-- Admin pode SELECT todos
CREATE POLICY "Admin pode ver todos os relatorios"
ON public.relatorios_unidade FOR SELECT
TO authenticated
USING (public.is_admin(auth.uid()));

-- Bucket de storage 'relatorios' (privado)
INSERT INTO storage.buckets (id, name, public)
VALUES ('relatorios', 'relatorios', false)
ON CONFLICT (id) DO NOTHING;

-- Policies do bucket: gestor da unidade pode upload e ler arquivos da própria unidade
-- Path esperado: relatorios/{unidade_id}/{ano-mes}/{timestamp}.pdf
-- Como o bucket já é 'relatorios', o path interno começa com {unidade_id}/...

CREATE POLICY "Gestor pode fazer upload na sua unidade"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'relatorios'
  AND EXISTS (
    SELECT 1 FROM public.profissionais p
    WHERE p.user_id = auth.uid()
      AND p.perfil_institucional = 'gestor'
      AND p.unidade_id::text = (storage.foldername(name))[1]
  )
);

CREATE POLICY "Gestor pode ler arquivos da sua unidade"
ON storage.objects FOR SELECT
TO authenticated
USING (
  bucket_id = 'relatorios'
  AND EXISTS (
    SELECT 1 FROM public.profissionais p
    WHERE p.user_id = auth.uid()
      AND p.perfil_institucional = 'gestor'
      AND p.unidade_id::text = (storage.foldername(name))[1]
  )
);

CREATE POLICY "Gestor geral pode ler todos os relatorios"
ON storage.objects FOR SELECT
TO authenticated
USING (
  bucket_id = 'relatorios'
  AND public.is_gestor_geral(auth.uid())
);

CREATE POLICY "Admin pode ler todos os relatorios"
ON storage.objects FOR SELECT
TO authenticated
USING (
  bucket_id = 'relatorios'
  AND public.is_admin(auth.uid())
);

CREATE POLICY "Admin pode deletar arquivos de relatorios"
ON storage.objects FOR DELETE
TO authenticated
USING (
  bucket_id = 'relatorios'
  AND public.is_admin(auth.uid())
);