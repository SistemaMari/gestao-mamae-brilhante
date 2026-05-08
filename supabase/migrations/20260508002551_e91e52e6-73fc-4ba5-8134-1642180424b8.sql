-- View segura para listagem da equipe da unidade
CREATE OR REPLACE VIEW public.equipe_unidade_view
WITH (security_invoker = true)
AS
SELECT
  id,
  nome,
  crm,
  especialidade,
  unidade_id,
  perfil_institucional,
  perfil_clinico,
  acesso_revogado,
  created_at
FROM public.profissionais;

-- RLS na view via policies na tabela base não funciona para campos extras;
-- como a view usa security_invoker, herda RLS da tabela profissionais.
-- Precisamos adicionar policies explícitas que permitam gestores/admins
-- enxergarem linhas da própria unidade.

CREATE POLICY "Gestores veem profissionais da própria unidade"
ON public.profissionais
FOR SELECT
TO authenticated
USING (
  unidade_id IS NOT NULL
  AND gestor_da_unidade(auth.uid(), unidade_id)
);

CREATE POLICY "Gestor geral vê profissionais das unidades vinculadas"
ON public.profissionais
FOR SELECT
TO authenticated
USING (
  unidade_id IS NOT NULL
  AND is_gestor_geral(auth.uid())
  AND gestor_geral_tem_unidade(auth.uid(), unidade_id)
);

GRANT SELECT ON public.equipe_unidade_view TO authenticated;