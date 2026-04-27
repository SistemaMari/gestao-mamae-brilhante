-- ============================================================
-- 1. ENUM app_role
-- ============================================================
DO $$ BEGIN
  CREATE TYPE public.app_role AS ENUM (
    'admin',
    'gestor_geral',
    'gestor',
    'institucional',
    'consultorio'
  );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- ============================================================
-- 2. TABELA user_roles
-- ============================================================
CREATE TABLE IF NOT EXISTS public.user_roles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  role public.app_role NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, role)
);

ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

-- ============================================================
-- 3. FUNÇÕES has_role / current_user_has_role
-- ============================================================
CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role public.app_role)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = _user_id AND role = _role
  );
$$;

CREATE OR REPLACE FUNCTION public.current_user_has_role(_role public.app_role)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT public.has_role(auth.uid(), _role);
$$;

-- ============================================================
-- 4. RLS user_roles
-- ============================================================
CREATE POLICY "Usuario ve seus papeis"
ON public.user_roles FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

CREATE POLICY "Admins veem todos os papeis"
ON public.user_roles FOR SELECT
TO authenticated
USING (public.is_admin(auth.uid()));

CREATE POLICY "Admins inserem papeis"
ON public.user_roles FOR INSERT
TO authenticated
WITH CHECK (public.is_admin(auth.uid()));

CREATE POLICY "Admins atualizam papeis"
ON public.user_roles FOR UPDATE
TO authenticated
USING (public.is_admin(auth.uid()));

CREATE POLICY "Admins removem papeis"
ON public.user_roles FOR DELETE
TO authenticated
USING (public.is_admin(auth.uid()));

-- ============================================================
-- 5. BACKFILL — popular user_roles a partir do estado atual
-- ============================================================
INSERT INTO public.user_roles (user_id, role)
SELECT user_id, 'admin'::public.app_role FROM public.admins
ON CONFLICT (user_id, role) DO NOTHING;

INSERT INTO public.user_roles (user_id, role)
SELECT user_id, 'gestor_geral'::public.app_role FROM public.gestores_gerais
ON CONFLICT (user_id, role) DO NOTHING;

INSERT INTO public.user_roles (user_id, role)
SELECT
  user_id,
  CASE perfil_institucional
    WHEN 'gestor' THEN 'gestor'::public.app_role
    WHEN 'institucional' THEN 'institucional'::public.app_role
    ELSE 'consultorio'::public.app_role
  END
FROM public.profissionais
WHERE user_id IS NOT NULL
ON CONFLICT (user_id, role) DO NOTHING;

-- ============================================================
-- 6. TRIGGERS de sincronização
-- ============================================================

-- admins
CREATE OR REPLACE FUNCTION public.sync_admin_role()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    INSERT INTO public.user_roles (user_id, role)
    VALUES (NEW.user_id, 'admin')
    ON CONFLICT (user_id, role) DO NOTHING;
    RETURN NEW;
  ELSIF TG_OP = 'DELETE' THEN
    DELETE FROM public.user_roles WHERE user_id = OLD.user_id AND role = 'admin';
    RETURN OLD;
  END IF;
  RETURN NULL;
END;
$$;

DROP TRIGGER IF EXISTS trg_sync_admin_role ON public.admins;
CREATE TRIGGER trg_sync_admin_role
AFTER INSERT OR DELETE ON public.admins
FOR EACH ROW EXECUTE FUNCTION public.sync_admin_role();

-- gestores_gerais
CREATE OR REPLACE FUNCTION public.sync_gestor_geral_role()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    INSERT INTO public.user_roles (user_id, role)
    VALUES (NEW.user_id, 'gestor_geral')
    ON CONFLICT (user_id, role) DO NOTHING;
    RETURN NEW;
  ELSIF TG_OP = 'DELETE' THEN
    DELETE FROM public.user_roles WHERE user_id = OLD.user_id AND role = 'gestor_geral';
    RETURN OLD;
  END IF;
  RETURN NULL;
END;
$$;

DROP TRIGGER IF EXISTS trg_sync_gestor_geral_role ON public.gestores_gerais;
CREATE TRIGGER trg_sync_gestor_geral_role
AFTER INSERT OR DELETE ON public.gestores_gerais
FOR EACH ROW EXECUTE FUNCTION public.sync_gestor_geral_role();

-- profissionais (papel institucional)
CREATE OR REPLACE FUNCTION public.sync_profissional_role()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_new_role public.app_role;
  v_old_role public.app_role;
BEGIN
  IF TG_OP IN ('INSERT', 'UPDATE') THEN
    v_new_role := CASE NEW.perfil_institucional
      WHEN 'gestor' THEN 'gestor'::public.app_role
      WHEN 'institucional' THEN 'institucional'::public.app_role
      ELSE 'consultorio'::public.app_role
    END;
  END IF;

  IF TG_OP = 'UPDATE' THEN
    v_old_role := CASE OLD.perfil_institucional
      WHEN 'gestor' THEN 'gestor'::public.app_role
      WHEN 'institucional' THEN 'institucional'::public.app_role
      ELSE 'consultorio'::public.app_role
    END;
    IF v_old_role IS DISTINCT FROM v_new_role THEN
      DELETE FROM public.user_roles WHERE user_id = OLD.user_id AND role = v_old_role;
    END IF;
  END IF;

  IF TG_OP IN ('INSERT', 'UPDATE') AND NEW.user_id IS NOT NULL THEN
    INSERT INTO public.user_roles (user_id, role)
    VALUES (NEW.user_id, v_new_role)
    ON CONFLICT (user_id, role) DO NOTHING;
    RETURN NEW;
  ELSIF TG_OP = 'DELETE' THEN
    DELETE FROM public.user_roles
    WHERE user_id = OLD.user_id
      AND role IN ('gestor', 'institucional', 'consultorio');
    RETURN OLD;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_sync_profissional_role ON public.profissionais;
CREATE TRIGGER trg_sync_profissional_role
AFTER INSERT OR UPDATE OF perfil_institucional, user_id OR DELETE ON public.profissionais
FOR EACH ROW EXECUTE FUNCTION public.sync_profissional_role();