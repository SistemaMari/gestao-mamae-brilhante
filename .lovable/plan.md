

# Plano: Ajustar formulário Consulta 1 — remover IG, adicionar localização e tipo de identificação

## Resumo

Três mudanças no formulário `Consulta1Form.tsx`:
1. **Remover campo de IG** — a idade gestacional será calculada automaticamente a partir da DUM na ficha consolidada (FichaPacientePage), não mais digitada pelo médico. O campo de DUM (data) substituirá o campo de IG no formulário.
2. **Adicionar campos País / Estado / Cidade** da paciente, com listas dinâmicas (já existem em `src/data/locationData.ts`).
3. **Adicionar dropdown de tipo de identificação** (CPF, Prontuário, CNS) ao lado do campo "Número de identificação", sempre visível.

## Mudanças no banco de dados

Migração SQL para adicionar colunas na tabela `pacientes`:
- `pais text default 'Brasil'`
- `estado text`
- `cidade text`
- `tipo_identificacao text` (valores: cpf, prontuario, cns)

## Arquivo: `src/components/Consulta1Form.tsx`

**Remover:**
- Campos `igSemanas` e `igDias` (state + inputs + validação)
- Cálculo de `dumCalculada` a partir de IG — agora a DUM é informada diretamente pelo médico

**Adicionar:**
- Campo `dum` (input date) — obrigatório, substitui o campo de IG
- Campo `tipoIdentificacao` — select/dropdown com opções: CPF, Prontuário, CNS — exibido ao lado do campo de número de identificação
- Campos `pais`, `estado`, `cidade` — usando a mesma lógica cascata de `locationData.ts` (País → Estado → Cidade). Default: Brasil.
- Tornar o campo "Número de identificação" + dropdown sempre visível (não mais condicional ao perfil do profissional)

**Lógica de salvamento:**
- Salvar `dum`, `pais`, `estado`, `cidade`, `tipo_identificacao` no paciente
- Na consulta, não salvar mais `ig_semanas`/`ig_dias` (ou salvar como null)

## Arquivo: `src/pages/FichaPacientePage.tsx`

- Calcular IG na consulta 1 a partir da DUM salva + data da consulta 1 (em vez de ler `ig_semanas`/`ig_dias` da consulta)
- Calcular IG hoje a partir da DUM salva + data de hoje
- Exibir País/Estado/Cidade no cabeçalho da ficha
- Exibir tipo de identificação antes do número (ex: "CPF: 123.456.789-00")

## Arquivo: `src/lib/previewPatients.ts`

- Atualizar dados demo para incluir `pais`, `estado`, `cidade`, `tipo_identificacao`
- Remover `ig_semanas`/`ig_dias` das consultas demo ou manter para retrocompatibilidade, mas derivar IG da DUM

## Arquivos modificados
- `src/components/Consulta1Form.tsx` — campo DUM substitui IG, adicionar localização + tipo identificação
- `src/pages/FichaPacientePage.tsx` — cálculo IG via DUM, exibir novos campos
- `src/lib/previewPatients.ts` — dados demo atualizados
- Migração SQL — novas colunas na tabela `pacientes`

