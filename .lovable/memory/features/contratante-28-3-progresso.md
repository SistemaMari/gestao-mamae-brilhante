---
name: Camada Contratante (Prompt 28.3) — progresso parcial
description: Schema migration aplicada; Edge Function revertida ao pré-28.3 com default MARI Sandbox. Pendente 28.3a/b/c.
type: feature
---

## Status: schema OK, lógica revertida (aguardando 28.3a/b/c)

### O que JÁ ESTÁ EM PRODUÇÃO (não refazer)
- Tabela `contratantes` (id, nome, cnpj UNIQUE, razao_social, contato_nome/email/telefone, data_inicio_contrato NOT NULL, data_termino_contrato, status default 'ativo', observacoes, encerrado_em/_por/_motivo).
- Trigger `validar_datas_contratante` (data_termino > data_inicio).
- Tabela `gestores_gerais_contratantes` (PK gestor_geral_id+contratante_id, ON DELETE CASCADE).
- Tabela `log_transferencia_unidade` (auditoria imutável: unidade_id, contratante_origem/destino_id, justificativa, snapshots de nomes, transferido_em/_por).
- Coluna `unidades.contratante_id UUID NOT NULL` (FK contratantes).
- Contratante "MARI Sandbox" (id=`feac2ad0-cb91-43c3-a043-094ac0d95d08`, CNPJ `00.000.000/0001-00`, contato SuporteMari@novodmg.com.br, status ativo).
- Backfill: todas unidades existentes apontam para MARI Sandbox.
- Backfill: todos `gestores_gerais_unidades` distintos foram replicados em `gestores_gerais_contratantes`.
- RLS nas 3 novas tabelas (admin gerencia; gestor geral vê seus vínculos; profissional vê contratante via unidade).

### O que foi REVERTIDO na Edge Function (pré-28.3)
- `criar_unidade`: aceita `contratante_id` opcional; se ausente, default MARI Sandbox. Sem validação de contratante encerrado/inexistente (volta no 28.3a).
- `listar_unidades`: mantém retorno de `contratante_id/nome/status` (backward-compatible; frontend atual ignora).
- `criar_gestor_geral`: voltou a aceitar `unidade_ids[]` populando `gestores_gerais_unidades`. NÃO aceita `contratante_ids[]`.

### A reaproveitar no 28.3a
- Validação contratante ativo em `criar_unidade` (código já escrito antes; ver git history).
- Códigos de erro: `contratante_obrigatorio`, `contratante_inexistente`, `contratante_encerrado`.
- `criar_gestor_geral` aceitar `contratante_ids[]` ao invés de `unidade_ids[]`.
- `listar_gestores_gerais` retornar `contratantes_vinculados[]`.
- `atualizar_vinculos_gestor_geral` sobre `gestores_gerais_contratantes`.
- 6 novas ações: `listar_contratantes`, `criar_contratante`, `editar_contratante`, `encerrar_contratante`, `reativar_contratante`, `transferir_unidade_de_contratante`.

### Decisão: dividir 28.3 em 3 sub-prompts
- **28.3a**: Edge Function completa (todas as 6 novas ações + ajustes em criar_unidade/criar_gestor_geral/listar_*).
- **28.3b**: Aba Contratantes CRUD (AbaContratantes, ModalCadastrarContratante, ModalEditarContratante).
- **28.3c**: ModalEncerrar/AlertReativar/ModalTransferir + ajustes nas abas Unidades/Profissionais/GestoresGerais + nova ordem de tabs.
