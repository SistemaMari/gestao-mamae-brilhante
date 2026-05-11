## Objetivo

Cadastrar os 5 e-mails abaixo como usuários com **perfil "consultório"**, cada um com uma **senha temporária forte** gerada automaticamente. O admin do sistema continua sendo `suportemari@novodmg.com.br` (sem mudanças).

E-mails a cadastrar:
- roberto.costa@unesp.br
- claudia.magalhaes@unesp.br
- iracema.calderon@gmail.com
- marilzarudge@gmail.com
- raulvcrudge@gmail.com

## Por que uma rota nova e não a UI existente

A página `/admin/usuarios` e a edge function `criar-usuario` criam o usuário **sem senha** e disparam um e-mail de "definir senha" (fluxo invite/recovery). Como você pediu **senhas temporárias fortes geradas e entregues a você**, esse fluxo não serve — preciso de um caminho que defina a senha no momento da criação.

## Plano

1. **Criar edge function one-off** `seed-usuarios-consultorio` (admin-only, service role):
   - Recebe a lista dos 5 e-mails + nomes.
   - Para cada um: gera senha forte aleatória (16 caracteres, mistura de maiúsc./minúsc./números/símbolos seguros).
   - Cria conta em `auth.users` com `email_confirm: true` (já confirmado, login imediato sem verificação).
   - Insere registro em `profissionais` com `perfil_clinico = 'consultorio'`, plano free, sem unidade.
   - Atribui role apropriada em `user_roles`.
   - Retorna a lista `[{ email, senha_temporaria }]` no response.

2. **Executar a função uma vez** (chamada autenticada como admin `suportemari@novodmg.com.br`).

3. **Entregar as credenciais a você** em formato:
   ```
   roberto.costa@unesp.br  →  <senha gerada>
   claudia.magalhaes@unesp.br  →  <senha gerada>
   ...
   ```
   Você repassa para cada usuário. Cada um deve trocar a senha no primeiro login (existe fluxo "esqueci a senha" se quiserem).

4. **Limpeza:** após a execução bem-sucedida, removo a edge function `seed-usuarios-consultorio` para não ficar como vetor de criação em massa no projeto.

## Detalhes técnicos

- **Idempotência:** se um e-mail já existir em `auth.users`, a função retorna `{ ok: false, motivo: "já existe" }` para esse item e segue os demais — não sobrescreve senha de conta existente.
- **Geração de senha:** 16 chars, alfabeto `A-Za-z0-9` + `!@#$%&*`, garantindo pelo menos 1 de cada classe. Usar `crypto.getRandomValues` (Web Crypto).
- **Autorização:** valida que o caller está em `public.admins` antes de executar — mesma checagem usada em `criar-usuario`.
- **Sem mudanças** em UI, schema, RLS, ou no fluxo normal de criação por convite.

## Fora do escopo

- Não altero a UI `/admin/usuarios`.
- Não mexo na conta admin `suportemari@novodmg.com.br`.
- Não crio conta para o Raul como admin/gestor master (você confirmou "nenhum" — fica só como usuário consultório).
- Não envio e-mails automáticos para os usuários — a entrega das senhas é manual via você.
