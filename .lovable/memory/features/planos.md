---
name: Planos e bloqueio de uso
description: 4 planos (Free/Teste/Iniciante/Profissional), DB functions pode_criar_ficha/pode_gerar_laudo, modais de bloqueio, banner 90%
type: feature
---
## Planos
- Free: R$0, 3 laudos, 3 pacientes
- Teste: R$79, 10 laudos, ilimitados
- Iniciante: R$139, 35 laudos, ilimitados
- Profissional: R$299, 100 laudos, ilimitados

## Colunas em profissionais
plano_status, laudos_limite, laudos_usados, periodo_renovacao, stripe_customer_id, stripe_subscription_id

## DB Functions (RPC)
- pode_criar_ficha(uuid) → boolean (Free: max 3 pacientes)
- pode_gerar_laudo(uuid) → jsonb {allowed, laudos_limite} (incremento atômico)

## Stripe
Integração adiada. Botões exibem toast informativo por enquanto.

## Perfil incompleto
Se crm ou especialidade NULL → redireciona para /completar-perfil (placeholder).
