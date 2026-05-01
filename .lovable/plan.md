## Diagnóstico

Os dois "erros" são, na verdade, **404s de rota**, não falhas de runtime nem de backend:

- `/vitrine/admin` — o `PreviewHubPage` tem um card que aponta para essa URL (linha 72), mas no `App.tsx` essa rota **não existe**. Cai no `<Route path="*" element={<NotFound />} />`. É exatamente o "404 Oops! Page not found" que você mandou no print.
- `/vitrine/dashboard/metricas` — o `PreviewAppShell` (sidebar do dashboard do consultório, item "Meu Dashboard", linha 22) navega para essa URL, mas ela também não existe. Por isso o dashboard do profissional liberal "quebra" ao clicar em Meu Dashboard, e o console registra:

  ```
  404 Error: User attempted to access non-existent route: /vitrine/dashboard/metricas
  ```

Backend está OK — a RPC `metricas_diagnosticos_admin` retorna `200` normalmente. Foi puro descasamento entre os links da vitrine e as rotas registradas. Provavelmente ficou pendente de quando criamos o painel admin (`/admin/*`) e o dashboard de métricas (`/dashboard/metricas`): os equivalentes de vitrine não foram registrados.

## O que vou mudar

Apenas **`src/App.tsx`** — adicionar as rotas de vitrine que faltam, reaproveitando as páginas que já existem (modo preview, sem auth).

### 1. Vitrine do admin

Adicionar dentro do bloco "Vitrine pública (sem login)" um grupo análogo ao painel admin real, **sem `ProtectedRoute`** (vitrine é pública):

```text
/vitrine/admin                  → VisaoGeralPage   (dentro de AdminLayout)
/vitrine/admin/diagnosticos     → DiagnosticosPage
/vitrine/admin/exportar         → ExportarPage
/vitrine/admin/admins           → AdminsPage
/vitrine/admin/institucionais   → InstitucionaisPage
```

Como `AdminLayout` (sidebar do admin) hoje provavelmente usa links absolutos `/admin/...`, vou checar e, se necessário, fazê-lo detectar `location.pathname.startsWith('/vitrine')` para prefixar — mesmo padrão que `DashboardPage` já usa (`isPreview`). Isso é uma edição pequena, isolada ao `AdminSidebar`.

### 2. Vitrine do dashboard de métricas (profissional liberal)

Adicionar dentro do grupo `<PreviewAppShell />`:

```text
/vitrine/dashboard/metricas     → DashboardMetricasPage
/vitrine/laudos                 → HistoricoLaudosPage
/vitrine/laudo/:id              → LaudoViewerPage
/vitrine/meus-cursos            → MeusCursosPage
```

Os três últimos são para evitar futuras 404 vindas dos itens "Histórico", "Meus cursos" etc. da sidebar de vitrine — incluo só os que de fato estão linkados pelo `PreviewAppShell` / `DashboardPage`. Se algum item ainda navegar para `/vitrine/...` sem rota, vou cobrir junto.

### 3. Verificações de coerência

- Garantir que `DashboardMetricasPage` lide com o caso de "vitrine sem dados reais" sem quebrar (provavelmente já lida — usa as mesmas queries do `DashboardPage`, que já funciona em vitrine). Se quebrar por falta de auth, aplico o mesmo padrão `isPreview` que `DashboardPage` usa.
- Não vou mexer na RPC, tabelas, RLS, nem em estilos.

## Fora de escopo

- Não vou remover os cards "Painel Admin" / "Meu Dashboard" da vitrine — você pediu mais cedo que a vitrine mostre todos os perfis para demonstração.
- Não vou tocar nas rotas autenticadas reais (`/admin`, `/dashboard/metricas`) — elas seguem funcionando.

## Resultado esperado

- Clicar em "Painel Admin" no `/vitrine` abre o `VisaoGeralPage` em modo demo, com a sidebar do admin navegável (Diagnósticos, Exportar, etc.).
- No dashboard do consultório em vitrine, clicar em "Meu Dashboard" abre `DashboardMetricasPage` sem 404.
- Console fica sem o erro `non-existent route: /vitrine/dashboard/metricas`.
