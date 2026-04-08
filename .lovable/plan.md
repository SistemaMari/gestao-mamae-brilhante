

# Plano atualizado: Enriquecer dados demo + renomear labels

## 1. Renomear labels (3 arquivos)

| De | Para | Arquivo(s) |
|----|------|------------|
| `"Encaminhada — endocrino"` | `"Associar endocrino"` | `FichaPacientePage.tsx` (linha 25), `DashboardPage.tsx` (linha 47) |
| `"IG atual:"` | `"IG hoje:"` | `FichaPacientePage.tsx` (linha 200) |
| `"DUM calculada:"` | `"DUM:"` | `FichaPacientePage.tsx` (linha ~227) |

## 2. Reordenar IG no cabeçalho da ficha

Em `FichaPacientePage.tsx`, trocar a ordem dos itens para que **"IG na consulta 1"** apareça **antes** de **"IG hoje"** (atualmente IG atual vem primeiro).

## 3. Enriquecer os 7 perfis demo

Em `src/lib/previewPatients.ts`, adicionar dados realistas a cada paciente:

| Paciente | Mudanças |
|----------|----------|
| **Maria Luísa** (demo-1) | Manter como está |
| **Ana Carolina** (demo-2) | Observações + consulta retorno coerente com `aguardando_gtt` |
| **Juliana** (demo-3) | `numero_identificacao` + observações + retorno GJ normal → `dmg_afastado` |
| **Patrícia** (demo-4) | Múltiplas consultas coerentes com `dmg_confirmado` + DMG anterior |
| **Camila** (demo-5) | Observações + retorno DMG confirmado + retorno atrasado |
| **Fernanda** (demo-6) | `numero_identificacao` + consultas até `resultado_parto` |
| **Beatriz** (demo-7) | Observações + retorno coerente com `associar_endocrino` |

## Arquivos modificados
- `src/pages/FichaPacientePage.tsx` — labels + reordenar IG
- `src/pages/DashboardPage.tsx` — label "Associar endocrino"
- `src/lib/previewPatients.ts` — seed data enriquecido

