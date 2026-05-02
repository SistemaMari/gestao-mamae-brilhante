-- Adiciona coluna whatsapp opcional em pacientes.
-- Formato canônico: apenas dígitos com DDI 55 (ex.: '5511912345678'). UI cuida da máscara.
ALTER TABLE public.pacientes
ADD COLUMN whatsapp TEXT;

COMMENT ON COLUMN public.pacientes.whatsapp IS
'WhatsApp da paciente, opcional. Armazenado como apenas dígitos no formato E.164 sem +, com DDI 55 fixo (ex.: 5511912345678). 12 ou 13 dígitos.';
