-- Revoke EXECUTE from anon and authenticated for SECURITY DEFINER helpers.
-- These functions are called from RLS policies (run as owner) and from edge
-- functions using service_role — neither needs anon/authenticated EXECUTE.

DO $$
DECLARE
  fn record;
BEGIN
  FOR fn IN
    SELECT n.nspname, p.proname, pg_get_function_identity_arguments(p.oid) AS args
    FROM pg_proc p
    JOIN pg_namespace n ON n.oid = p.pronamespace
    WHERE n.nspname = 'public'
      AND p.prosecdef = true
      AND p.proname IN (
        'is_admin',
        'is_gestor_geral',
        'belongs_to_unidade',
        'gestor_geral_tem_unidade',
        'has_role',
        'pode_criar_ficha',
        'pode_gerar_laudo'
      )
  LOOP
    EXECUTE format(
      'REVOKE EXECUTE ON FUNCTION %I.%I(%s) FROM PUBLIC, anon, authenticated;',
      fn.nspname, fn.proname, fn.args
    );
  END LOOP;
END
$$;