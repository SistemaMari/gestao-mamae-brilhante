

# Plano: Criar 3 pacientes-demo com fluxo completo de fichas

## Resumo
Adicionar 3 novas pacientes ao array `SEED_PATIENTS` em `src/lib/previewPatients.ts`, cada uma representando um cenário clínico completo com consultas, fichas de perfil glicêmico e dados persistidos (grid, percentual, decisão, dose).

## As 3 pacientes

### Demo 8 — "Renata Silva Martins" (4 pontos dentro da meta, segue acompanhamento)
- DMG confirmado por GJ alterada
- RETORNO 2 (Ficha A, perfil 4 pontos): 80% dentro da meta → controle adequado
- FICHA A seguinte: 85% dentro da meta → mantém acompanhamento com dieta
- Status: `dmg_confirmado`, próximo retorno em 7 dias, botão para nova Ficha A

### Demo 9 — "Larissa Campos Oliveira" (4 pontos fora da meta → 6 pontos com insulina dentro da meta)
- DMG confirmado por GJ alterada
- RETORNO 2 (Ficha A, perfil 4 pontos): 50% dentro da meta → controle inadequado, decisão `controle_inadequado`, dose calculada
- RETORNO 3 (Ficha B, perfil 6 pontos): 78% dentro da meta → controle adequado com insulina
- Status: `dmg_confirmado`, próximo retorno em 7 dias, botão para nova Ficha B

### Demo 10 — "Isabela Duarte Ramos" (4 pontos fora → 6 pontos fora → Dra. Mari encerra)
- DMG confirmado por GJ alterada
- RETORNO 2 (Ficha A, perfil 4 pontos): 45% dentro da meta → controle inadequado, dose calculada
- RETORNO 3 (Ficha B, perfil 6 pontos): 40% dentro da meta → controle inadequado com insulina
- Status: `encaminhada_endocrino`, sem botão de próxima consulta, apenas parto

## Detalhes técnicos

**Arquivo:** `src/lib/previewPatients.ts`

Cada paciente terá:
- Consulta 1 (tipo `consulta_1`) — cadastro inicial
- Retorno 1 (tipo `retorno`) — GJ alterada, DMG confirmado
- Retorno 2 (tipo `ficha_a`) — perfil 4 pontos com `grid_valores` (array de 15 dias × 4 colunas), `percentual_meta`, `total_preenchidos`, `dentro_meta`, `decisao`, `peso_kg`, `dose_total` (quando inadequado), `data_inicio`, `data_fim`
- Retorno 3 (tipo `ficha_b`, demos 9 e 10) — perfil 6 pontos com grid de 6 colunas, mesmos campos de resultado
- Demo 10 terá `decisao: 'encerramento_endocrino'` na Ficha B

Os `grid_valores` serão arrays simulados com valores realistas (jejum 70-100, pós-prandial 100-140, pré-prandial 70-100).

Também incrementar `STORAGE_KEY` para `v4` para forçar o reset do localStorage e garantir que as novas pacientes apareçam.

