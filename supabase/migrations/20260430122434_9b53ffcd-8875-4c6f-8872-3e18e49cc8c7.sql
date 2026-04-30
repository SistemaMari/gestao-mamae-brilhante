GRANT EXECUTE ON FUNCTION public.is_admin(uuid) TO authenticated, anon;
GRANT EXECUTE ON FUNCTION public.is_gestor_geral(uuid) TO authenticated, anon;
GRANT EXECUTE ON FUNCTION public.has_role(uuid, public.app_role) TO authenticated, anon;
GRANT EXECUTE ON FUNCTION public.current_user_has_role(public.app_role) TO authenticated, anon;
GRANT EXECUTE ON FUNCTION public.belongs_to_unidade(uuid, uuid) TO authenticated, anon;
GRANT EXECUTE ON FUNCTION public.gestor_da_unidade(uuid, uuid) TO authenticated, anon;
GRANT EXECUTE ON FUNCTION public.gestor_geral_tem_unidade(uuid, uuid) TO authenticated, anon;