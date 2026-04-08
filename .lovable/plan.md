

# Plano: Prompt 8 — Formulário Consulta 1 (Dados da Paciente + Pedido de Exame)

## Resumo
Construir o formulário completo da Consulta 1 e a página de ficha da paciente (FichaPacientePage), com persistência em banco (consultas + pacientes) e versão preview com localStorage.

## Mudanças no banco de dados

**1. Adicionar coluna `data_nascimento` na tabela `pacientes`**
- `data_nascimento DATE` (nullable para manter compatibilidade)

**2. Criar tabela `consultas`**
- `id UUID PK`, `paciente_id UUID FK→pacientes`, `profissional_id UUID FK→profissionais`
- `tipo TEXT` (consulta_1, retorno_1, etc.), `numero_sequencial INT`
- `data DATE NOT NULL`, `ig_semanas INT`, `ig_dias INT`
- `observacoes TEXT`, `status_gerado TEXT`
- `created_at TIMESTAMPTZ DEFAULT now()`
- RLS: profissional vê/insere só suas consultas

**3. Habilitar RLS na tabela `consultas`** com policies para select/insert vinculadas a `profissional_id = auth.uid()` via join com profissionais.

## Mudanças no frontend

**1. Componente `Consulta1Form`** (`src/components/Consulta1Form.tsx`)
- 7 campos conforme spec: Nome completo*, Data nascimento* (com cálculo de idade ao lado), Número de identificação (condicional ao `identificador_padrao` do profissional), Idade gestacional (semanas 0-42 + dias 0-6 lado a lado)*, Data da consulta* (default hoje), Observações clínicas, DMG em gestação anterior* (Sim/Não com borda lilás)
- Todos com ícone ⓘ e tooltip
- Validação: campos obrigatórios em vermelho se vazios
- Ao salvar: chama `pode_criar_ficha()`, insere em `pacientes` + `consultas`, redireciona para `/paciente/:id`

**2. Componente `FichaPacientePage`** (refatorar `PacientePage.tsx`)
- Cabeçalho: nome, idade calculada, IG atual (IG consulta 1 + dias decorridos), número de identificação, tag de status
- Banner DMG anterior (fixo, não fechável, fundo amarelo/laranja)
- Card de confirmação verde (#DCFCE7) com 3 partes: orientação glicemia jejum, janela GTT calculada, notas técnicas
- Histórico de consultas (cronológico)
- Botão "+ Nova consulta de retorno" (placeholder por ora)

**3. Preview (vitrine)**
- Expandir `PreviewPaciente` com `data_nascimento`, `data_consulta`, `ig_semanas`, `ig_dias`, `observacoes`, `consultas[]`
- Salvar tudo em localStorage, exibir ficha completa sem login

**4. Rotas**
- `/paciente/nova` e `/vitrine/paciente/nova` → formulário Consulta 1
- `/paciente/:id` e `/vitrine/paciente/:id` → FichaPacientePage com dados reais ou localStorage

## Resultado
Ao clicar "+Nova Paciente", abre o formulário Consulta 1. Ao salvar, cria ficha com cabeçalho, banner DMG (se aplicável), card de confirmação com orientações e janela GTT, e botão para próximo retorno.

