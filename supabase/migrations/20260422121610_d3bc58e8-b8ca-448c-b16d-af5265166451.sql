
-- 1. Drop the dangerous anon SELECT policy on convites
DROP POLICY IF EXISTS "Acesso público por token" ON public.convites;

-- 2. Helper: is_admin (security definer to avoid recursion in policies)
CREATE OR REPLACE FUNCTION public.is_admin(_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.admins WHERE user_id = _user_id
  );
$$;

-- 3. Helper: is_gestor_geral
CREATE OR REPLACE FUNCTION public.is_gestor_geral(_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.gestores_gerais WHERE user_id = _user_id
  );
$$;

-- 4. Helper: belongs_to_unidade
CREATE OR REPLACE FUNCTION public.belongs_to_unidade(_user_id uuid, _unidade_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.profissionais
    WHERE user_id = _user_id AND unidade_id = _unidade_id
  );
$$;

-- 5. Restrict unidades SELECT policy to members + admins + gestores_gerais
DROP POLICY IF EXISTS "Unidades visíveis por autenticados" ON public.unidades;

CREATE POLICY "Unidades visíveis por membros e admins"
ON public.unidades
FOR SELECT
TO authenticated
USING (
  public.is_admin(auth.uid())
  OR public.is_gestor_geral(auth.uid())
  OR public.belongs_to_unidade(auth.uid(), id)
);

-- 6. Storage policies for base-conhecimento bucket: admin-only
DROP POLICY IF EXISTS "Authenticated users can read base-conhecimento" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can upload base-conhecimento" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can update base-conhecimento" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can delete base-conhecimento" ON storage.objects;

-- Catch any other previously-named policies on this bucket
DO $$
DECLARE
  pol record;
BEGIN
  FOR pol IN
    SELECT policyname FROM pg_policies
    WHERE schemaname = 'storage'
      AND tablename = 'objects'
      AND (qual LIKE '%base-conhecimento%' OR with_check LIKE '%base-conhecimento%')
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON storage.objects', pol.policyname);
  END LOOP;
END $$;

CREATE POLICY "Admins can read base-conhecimento"
ON storage.objects
FOR SELECT
TO authenticated
USING (
  bucket_id = 'base-conhecimento'
  AND public.is_admin(auth.uid())
);

CREATE POLICY "Admins can upload base-conhecimento"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'base-conhecimento'
  AND public.is_admin(auth.uid())
);

CREATE POLICY "Admins can update base-conhecimento"
ON storage.objects
FOR UPDATE
TO authenticated
USING (
  bucket_id = 'base-conhecimento'
  AND public.is_admin(auth.uid())
)
WITH CHECK (
  bucket_id = 'base-conhecimento'
  AND public.is_admin(auth.uid())
);

CREATE POLICY "Admins can delete base-conhecimento"
ON storage.objects
FOR DELETE
TO authenticated
USING (
  bucket_id = 'base-conhecimento'
  AND public.is_admin(auth.uid())
);
