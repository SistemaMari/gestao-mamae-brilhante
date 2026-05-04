## Fix — Fallback mock em /vitrine/admin

**Sintoma:** `/vitrine/admin` quebra com overlay de runtime "Edge function returned 401" mesmo com `try/catch` no hook. O `supabase.functions.invoke` lança um erro que o overlay do Lovable intercepta antes do nosso `catch` silenciar.

**Causa:** Em preview usamos `supabase.functions.invoke`, que faz o erro 401 borbulhar pelo runtime mesmo dentro de `try/catch` (interceptado pelo overlay de dev). O fallback para mock só funcionou nos casos em que o erro não chegou a ser "throw".

### Mudanças

**1. `src/hooks/useAdminMetrics.ts` (único arquivo alterado)**

- Em **modo preview**: substituir `supabase.functions.invoke` por `fetch` direto para `${VITE_SUPABASE_URL}/functions/v1/admin-metrics`, com `apikey` + `Authorization: Bearer <publishable>` (ou `access_token` se houver sessão).
- Qualquer falha (`!res.ok`, parse error, throw) → retorna mock de `MOCK_ADMIN[view]` silenciosamente. Sem nunca dar `throw` em preview.
- Em **modo autenticado** (`previewMode=false`): mantém `fetchAdminView` exatamente como está; comportamento de `/admin` autenticado intacto.
- React Query: `retry: false` em preview (não há razão pra retry quando já caímos pro mock).
- `useAlertasOperacionais` continua delegando pra `useAdminView` (herda o mesmo tratamento).

**2. `src/pages/admin/VisaoGeralPage.tsx`** — já passa `previewMode` em todos os 8 hooks (verificado nas linhas 79–96). Nenhuma mudança necessária.

### Critérios de aceite

- `/vitrine/admin` sem login: renderiza página completa com mock (alertas, evolução, 2 pizzas, todas as tabelas, cards finais). Sem overlay de erro.
- `/admin` autenticado: continua chamando a Edge Function via `supabase.functions.invoke` e mostrando dados reais.
- Nenhum outro arquivo tocado.
