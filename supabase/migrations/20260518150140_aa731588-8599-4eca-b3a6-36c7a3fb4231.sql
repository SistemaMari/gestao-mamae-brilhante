REVOKE EXECUTE ON FUNCTION public.dum_efetiva(uuid) FROM PUBLIC, anon;
GRANT  EXECUTE ON FUNCTION public.dum_efetiva(uuid) TO authenticated, service_role;