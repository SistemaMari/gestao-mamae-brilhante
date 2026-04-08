
-- Create exames_glicemia table
CREATE TABLE public.exames_glicemia (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  consulta_id UUID NOT NULL REFERENCES public.consultas(id) ON DELETE CASCADE,
  paciente_id UUID NOT NULL REFERENCES public.pacientes(id) ON DELETE CASCADE,
  profissional_id UUID NOT NULL REFERENCES public.profissionais(id) ON DELETE CASCADE,
  valor_mgdl INTEGER NOT NULL,
  tipo_exame TEXT NOT NULL DEFAULT 'plasmatica',
  data_exame DATE NOT NULL DEFAULT CURRENT_DATE,
  ig_semanas_na_data INTEGER,
  ig_dias_na_data INTEGER,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.exames_glicemia ENABLE ROW LEVEL SECURITY;

-- RLS policies
CREATE POLICY "Profissionais can view own exames"
ON public.exames_glicemia FOR SELECT TO authenticated
USING (profissional_id IN (SELECT id FROM public.profissionais WHERE user_id = auth.uid()));

CREATE POLICY "Profissionais can insert own exames"
ON public.exames_glicemia FOR INSERT TO authenticated
WITH CHECK (profissional_id IN (SELECT id FROM public.profissionais WHERE user_id = auth.uid()));

CREATE POLICY "Profissionais can update own exames"
ON public.exames_glicemia FOR UPDATE TO authenticated
USING (profissional_id IN (SELECT id FROM public.profissionais WHERE user_id = auth.uid()));

CREATE POLICY "Profissionais can delete own exames"
ON public.exames_glicemia FOR DELETE TO authenticated
USING (profissional_id IN (SELECT id FROM public.profissionais WHERE user_id = auth.uid()));

-- Add cenario_clinico column to consultas
ALTER TABLE public.consultas ADD COLUMN cenario_clinico TEXT;
