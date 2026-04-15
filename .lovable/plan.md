

# Plano: 4 correções na ficha da paciente

## 1. Badge IG lilás na Consulta 1 no histórico
Hoje o badge lilás com IG aparece apenas quando `c.ig_semanas != null`. Porém, na Consulta 1 os dados de IG estão frequentemente `null` no seed data. A solução: calcular o IG da consulta 1 a partir da DUM + data da consulta quando `ig_semanas` for null, e exibi-lo no trigger do accordion como já acontece nos outros retornos.

**Arquivo:** `src/pages/FichaPacientePage.tsx`
- No bloco do `consultasHistorico.map`, quando `c.tipo === 'consulta_1'` e `c.ig_semanas == null`, calcular IG a partir de `paciente.dum` e `c.data` (mesma lógica de `igNaConsulta1`).
- Exibir o badge lilás com o IG calculado.

## 2. Remover resultado duplicado fora do histórico
Hoje, após salvar uma Ficha A/C ou B/D, o resultado aparece em dois lugares: dentro do accordion do histórico E como card standalone no final da página (linhas 883-921). Remover os blocos standalone (`fichaACCompleted` e `fichaBDCompleted`) para que o resultado apareça apenas dentro do histórico expandido.

**Arquivo:** `src/pages/FichaPacientePage.tsx`
- Remover linhas ~883-921 (blocos `fichaACCompleted && fichaACResult` e `fichaBDCompleted && fichaBDResult`).
- Manter os states para controle de fluxo interno, mas não renderizar cards duplicados.

## 3 e 4. Numeração automática de retornos
O problema: a primeira Ficha A/C é rotulada como "RETORNO 2" via código fixo, e a segunda fica com nome de "FICHA A" em vez de "RETORNO 3". Os nomes precisam ser calculados dinamicamente: cada consulta ganha um número sequencial (CONSULTA 1, RETORNO 1, RETORNO 2, RETORNO 3, RETORNO 4...) e o subtítulo descritivo depende do tipo da ficha.

**Arquivo:** `src/pages/FichaPacientePage.tsx`
- Criar função `getDisplayName(c, index)` que calcula o número do retorno baseado na posição cronológica da consulta no array `consultas`:
  - Posição 0 → "CONSULTA 1 — ..."
  - Posição 1+ → "RETORNO {posição} — ..."
- O subtítulo após o "—" permanece baseado no tipo:
  - `consulta_1`: "Hora de rastrear o DMG (glicemia plasmática de jejum)"
  - `retorno_1`: "Hora de confirmar o diagnóstico e iniciar o tratamento"
  - `ficha_a`/`ficha_c` (primeira): "Hora de ver o resultado inicial do tratamento (Perfil Glicêmico de 4 pontos) e definir próximo passo"
  - `ficha_a`/`ficha_c` (subsequentes): "Acompanhamento sem insulina (Perfil Glicêmico de 4 pontos × 15/7 dias)"
  - `ficha_b`/`ficha_d` (primeira): "Hora de ver o resultado da insulina (Perfil Glicêmico de 6 pontos) e definir próximo passo"
  - `ficha_b`/`ficha_d` (subsequentes): "Acompanhamento com insulina (Perfil Glicêmico de 6 pontos × 15/7 dias)"
- Atualizar também os labels dos botões de próximo passo em `getNextStepInfo` para usar a mesma numeração dinâmica (contando `consultas.length` para saber o próximo número de retorno).

## Detalhes técnicos

**Arquivos modificados:** apenas `src/pages/FichaPacientePage.tsx`

Lógica de numeração:
```text
consultas (cronológica):
  [0] consulta_1    → "CONSULTA 1 — Hora de rastrear..."
  [1] retorno_1     → "RETORNO 1 — Hora de confirmar..."
  [2] ficha_a       → "RETORNO 2 — Hora de ver o resultado inicial..."
  [3] ficha_a       → "RETORNO 3 — Acompanhamento sem insulina..."
  [4] ficha_b       → "RETORNO 4 — Hora de ver o resultado da insulina..."
  [5] ficha_b       → "RETORNO 5 — Acompanhamento com insulina..."
```

O botão de próximo passo usará `consultas.length` para calcular: "RETORNO {consultas.length} — {subtítulo do tipo}".

