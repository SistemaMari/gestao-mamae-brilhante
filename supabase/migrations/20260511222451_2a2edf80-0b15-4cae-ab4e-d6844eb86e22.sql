
-- Eliminar coluna legada plano + backfill laudos_limite + ajustar default
BEGIN;

ALTER TABLE public.profissionais DROP CONSTRAINT IF EXISTS profissionais_plano_check;
ALTER TABLE public.profissionais DROP COLUMN IF EXISTS plano;

-- Backfill laudos_limite para refletir o plano real (planos.laudos_por_mes)
UPDATE public.profissionais p
SET laudos_limite = pl.laudos_por_mes
FROM public.planos pl
WHERE pl.id = p.plano_id
  AND p.laudos_limite <> pl.laudos_por_mes;

-- Default da coluna laudos_limite passa de 3 para 10 (cota Inicial)
ALTER TABLE public.profissionais ALTER COLUMN laudos_limite SET DEFAULT 10;

-- Zerar laudos_usados APENAS nas 5 contas de teste/demo
UPDATE public.profissionais
SET laudos_usados = 0
WHERE user_id IN (
  SELECT id FROM auth.users
  WHERE email IN (
    'consultorio@teste.dramari',
    'institucional@teste.dramari',
    'gestor@teste.dramari',
    'gestor.demo@mari.health',
    'consultorio.demo@novodmg.com.br'
  )
);

COMMIT;
