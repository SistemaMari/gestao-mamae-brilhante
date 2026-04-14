

# Plano: Corrigir campo Cidade no ProfileForm

## Problema
O campo Cidade exibe dois elementos separados: um input de busca ("Buscar cidade...") e um select dropdown abaixo dele. Isso causa confusão visual com duas opções aparecendo.

## Solução
Remover o input de busca separado e usar apenas o Select com busca integrada via Command/Combobox pattern, ou simplesmente usar apenas o Select dropdown com a lista de cidades filtrada pelo estado — sem o input extra de busca.

A abordagem mais simples e consistente: remover o `<Input placeholder="Buscar cidade...">` (linha 234-239) e manter apenas o `<Select>` com as cidades. O select já mostra as cidades filtradas pelo estado selecionado.

Para Brasil: lista de municípios do IBGE filtrada pelo estado (já implementado via `locationData.ts`).
Para País = "Outro": campo vira texto livre (já implementado na linha 225-231).

## Arquivo modificado
- `src/components/ProfileForm.tsx` — Remover o input de busca de cidade (linhas 234-239) e o state `citySearch`, mantendo apenas o Select dropdown com cidades do estado.

