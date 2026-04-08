
-- 1. Add data_nascimento to pacientes
ALTER TABLE public.pacientes ADD COLUMN IF NOT EXISTS data_nascimento date;

-- 2. Create consultas table
CREATE TABLE public.consultas (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  paciente_id uuid NOT NULL REFERENCES public.pacientes(id) ON DELETE CASCADE,
  profissional_id uuid NOT NULL REFERENCES public.profissionais(id) ON DELETE CASCADE,
  tipo text NOT NULL DEFAULT 'consulta_1',
  numero_sequencial integer NOT NULL DEFAULT 1,
  data date NOT NULL DEFAULT CURRENT_DATE,
  ig_semanas integer,
  ig_dias integer,
  observacoes text,
  status_gerado text,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

-- 3. Enable RLS
ALTER TABLE public.consultas ENABLE ROW LEVEL SECURITY;

-- 4. RLS policies
CREATE POLICY "Profissional pode ver suas consultas"
ON public.consultas
FOR SELECT
TO authenticated
USING (
  profissional_id IN (
    SELECT p.id FROM profissionais p WHERE p.user_id = auth.uid()
  )
);

CREATE POLICY "Profissional pode criar consultas"
ON public.consultas
FOR INSERT
TO authenticated
WITH CHECK (
  profissional_id IN (
    SELECT p.id FROM profissionais p WHERE p.user_id = auth.uid()
  )
);

CREATE POLICY "Profissional pode atualizar suas consultas"
ON public.consultas
FOR UPDATE
TO authenticated
USING (
  profissional_id IN (
    SELECT p.id FROM profissionais p WHERE p.user_id = auth.uid()
  )
);

-- 5. Index for performance
CREATE INDEX idx_consultas_paciente_id ON public.consultas(paciente_id);
CREATE INDEX idx_consultas_profissional_id ON public.consultas(profissional_id);
