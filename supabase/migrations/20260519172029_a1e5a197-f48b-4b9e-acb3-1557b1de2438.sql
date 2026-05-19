
CREATE TABLE public.laudo_textos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tipo_consulta TEXT NOT NULL,
  desfecho_clinico TEXT NOT NULL,
  bloco TEXT NOT NULL,
  ordem_bloco INTEGER NOT NULL DEFAULT 1,
  titulo_bloco TEXT NULL,
  texto TEXT NOT NULL,
  versao INTEGER NOT NULL DEFAULT 1,
  status TEXT NOT NULL DEFAULT 'rascunho'
    CHECK (status IN ('rascunho','publicado','arquivado')),
  criado_em TIMESTAMPTZ NOT NULL DEFAULT now(),
  criado_por UUID NULL REFERENCES auth.users(id),
  publicado_em TIMESTAMPTZ NULL,
  publicado_por UUID NULL REFERENCES auth.users(id),
  observacoes TEXT NULL
);

COMMENT ON TABLE  public.laudo_textos IS 'Textos fixos dos blocos do laudo, escritos pelo time clínico. Substitui a geração via IA (refatoração 34D-A).';
COMMENT ON COLUMN public.laudo_textos.desfecho_clinico IS 'Valor do cenário clínico (ex.: cenario_1..cenario_8, ficha_a_gj_alterada, ficha_b_totg_normal). Mapeia para consultas.cenario_clinico.';
COMMENT ON COLUMN public.laudo_textos.tipo_consulta IS 'Tipo da consulta (ex.: ficha_a, consulta_1, gtt, retorno_1). Mapeia para consultas.tipo.';
COMMENT ON COLUMN public.laudo_textos.bloco IS 'Identificador livre do bloco textual (ex.: introducao, justificativa, conduta, notas_tecnicas). TEXT para permitir evolução clínica.';

CREATE UNIQUE INDEX idx_laudo_textos_unico_publicado
  ON public.laudo_textos (tipo_consulta, desfecho_clinico, bloco)
  WHERE status = 'publicado';

CREATE INDEX idx_laudo_textos_chave
  ON public.laudo_textos (tipo_consulta, desfecho_clinico, status);

ALTER TABLE public.laudo_textos ENABLE ROW LEVEL SECURITY;

-- SELECT publicados: qualquer autenticado
CREATE POLICY "Autenticados leem textos publicados"
  ON public.laudo_textos FOR SELECT
  TO authenticated
  USING (status = 'publicado');

-- SELECT rascunho/arquivado + escrita total: apenas admin
CREATE POLICY "Admins leem todos os textos"
  ON public.laudo_textos FOR SELECT
  TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins inserem textos"
  ON public.laudo_textos FOR INSERT
  TO authenticated
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins atualizam textos"
  ON public.laudo_textos FOR UPDATE
  TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins removem textos"
  ON public.laudo_textos FOR DELETE
  TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role));

-- Marca a coluna legada
COMMENT ON COLUMN public.laudos.conteudo_laudo IS 'LEGADO: texto gerado pela IA (Gemini) antes da refatoração 34D-A. Não usar para novos laudos — preservado para auditoria histórica.';
