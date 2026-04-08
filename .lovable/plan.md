

# Plano: Campos do cabeçalho sempre visíveis + consultas expansíveis

## Problema
Os 6 campos do cabeçalho usam renderização condicional (`{value && ...}`), então se um dado está vazio o campo desaparece. Isso causa inconsistência entre fichas. Além disso, as consultas no histórico não são clicáveis.

## 1. Tornar os 6 campos sempre visíveis

Em `src/pages/FichaPacientePage.tsx` (linhas 177-232), remover todas as condições `{value && ...}` dos 6 campos. Quando o valor estiver ausente, exibir "—" como placeholder.

Campos (nesta ordem fixa):
1. Nascimento
2. Identificação
3. IG na consulta 1
4. IG hoje
5. Data da consulta 1
6. DUM

## 2. Consultas no histórico expansíveis

Substituir os `<div>` estáticos do histórico por componentes `Accordion` (já existe em `src/components/ui/accordion.tsx`). Ao clicar, expande mostrando observações completas, IG e status.

## 3. Forçar refresh do localStorage

Incrementar a versão do storage key em `src/lib/previewPatients.ts` para invalidar cache antigo.

## Arquivos modificados
- `src/pages/FichaPacientePage.tsx` — campos incondicionais + accordion no histórico
- `src/lib/previewPatients.ts` — versão do storage key

