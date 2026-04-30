## Corrigir link "Abrir vitrine sem login" na tela de login

### Causa raiz

O link "Abrir vitrine sem login" no `LoginPage.tsx` (linha 163) aponta para `/`. Antes, `/` carregava a `PreviewHubPage`. Depois de privatizarmos a raiz, `/` virou `<Navigate to="/login" replace />` — então o link manda o usuário de volta para a própria tela de login (loop visual). Por isso "não funciona".

### Correção (1 linha, 1 arquivo)

**`src/pages/LoginPage.tsx`** — linha 163:

```diff
- <Link to="/" className="font-medium text-primary transition-colors hover:opacity-80">
+ <Link to="/vitrine" className="font-medium text-primary transition-colors hover:opacity-80">
```

### O que NÃO muda

- `/` continua redirecionando para `/login` (raiz privada).
- Todas as rotas `/vitrine/*` restauradas continuam funcionando.
- `AppShellClinico`, "Meus Cursos", rotas autenticadas, fluxo de cadastro — nada é tocado.
- Nenhum outro arquivo é editado.

### Resultado esperado

Clicar em "Abrir vitrine sem login" na tela de login leva para `/vitrine` (página de cards da demo) em vez de recarregar o login.

Aguardando aprovação para executar.