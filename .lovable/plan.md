

## Plano: 2 ajustes pontuais

### 1. Inverter posição: Data da consulta ↔ Idade gestacional

A grid usa 2 colunas. A ordem atual é:
- Linha 1: Data de início | Data de encerramento
- Linha 2: **Idade gestacional** | **Data da consulta**

Quero deixar:
- Linha 2: **Data da consulta** | **Idade gestacional**

**Arquivos:**
- `src/components/FichaACForm.tsx` (linhas 491–540) — trocar a ordem dos blocos
- `src/components/FichaBDForm.tsx` (linhas 486–505) — trocar a ordem dos blocos

Apenas reordenação JSX, sem mudar lógica/estado/labels/tooltips.

### 2. Atualizar texto do popup de encerramento (insulina inadequada)

**Arquivo:** `src/components/FichaBDForm.tsx` linha 665

**De:**
> "A dose de insulina precisa ser ajustada — isso requer acompanhamento conjunto com endocrinologista."

**Para:**
> "A dose de insulina precisa ser ajustada. O(a) obstetra conduz esse ajuste — sozinho ou em associação com endocrinologista — mantendo sempre as metas glicêmicas obstétricas."

Ambos ajustes são cirúrgicos e não afetam outros componentes (cards de resultado permanecem intactos).

