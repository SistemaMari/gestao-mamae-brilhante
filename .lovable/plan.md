## Etapa final — "Meus Cursos" no shell real + tornar o domínio raiz privado

### Parte A — Adicionar "Meus Cursos" no AppShellClinico (shell real)

Arquivo: `src/components/AppShellClinico.tsx`

1. Importar `GraduationCap` do `lucide-react` (linha de imports já tem `Users, UserPlus, CreditCard, ...`).
2. Adicionar item ao array `navItemsAdmin` (após `nav.profile`):
   ```ts
   { labelKey: 'nav.myCourses', icon: GraduationCap, path: '/meus-cursos' },
   ```
   Como `t('nav.myCourses')` ainda não existe nos JSON de i18n, o react-i18next cai no fallback e exibe a chave. Para evitar isso sem editar locales, vou usar string literal: passar `labelKey: 'Meus Cursos'` continua funcionando porque `t('Meus Cursos')` retorna a própria chave quando não há tradução. **Decisão**: usar `labelKey: 'Meus Cursos'` (literal), igual ao padrão já tolerado pelo projeto. Sem mexer em arquivos de tradução.
3. Em `useBreadcrumb()`, adicionar:
   ```ts
   if (path === '/meus-cursos') return { parent: null, current: 'Meus Cursos' };
   ```

Arquivo: `src/App.tsx` — a rota `/meus-cursos` **já está registrada** (linha 95). Nada a fazer aqui na Parte A.

### Parte B — Tornar o domínio raiz privado e remover a vitrine

**B.1 — Arquivos a DELETAR:**
- `src/pages/PreviewHubPage.tsx` (contém `PreviewHubPage`, `PreviewCompletarPerfilPage`, `PreviewGestaoEquipePage`, `PreviewCadastroConvitePage`)
- `src/components/PreviewAppShell.tsx`

**B.2 — Arquivo a MANTER (apesar do nome):**
- `src/lib/previewPatients.ts` — **NÃO deletar.** Apesar do nome, é usado por páginas/componentes reais autenticados:
  - `src/pages/DashboardPage.tsx`, `src/pages/FichaPacientePage.tsx`
  - `src/components/FichaACForm.tsx`, `FichaBDForm.tsx`, `FichaACResultCard.tsx`, `GttForm.tsx`, `GttResultCard.tsx`, `Consulta1Form.tsx`, `Retorno1Form.tsx`, `Retorno1ResultCard.tsx`, `RegistroPartoForm.tsx`, `RegistroPartoReadOnlyCard.tsx`
  - Esses arquivos importam tipos (`PreviewConsulta`, `PreviewPaciente`) e helpers que hoje fazem parte do fluxo real. Removê-lo quebraria o sistema autenticado. Renomear/refatorar fica fora do escopo desta etapa.

**B.3 — Rotas a REMOVER do `src/App.tsx`** (linhas 52–77):
- `<Route path="/" element={<PreviewHubPage />} />` (linha 53) → substituir por `<Route path="/" element={<Navigate to="/login" replace />} />`
- `<Route path="/vitrine" ... />` (54)
- `<Route path="/vitrine/completar-perfil" ... />` (55)
- `<Route path="/vitrine/gestao" ... />` (56)
- `<Route path="/vitrine/gestao/equipe" ... />` (57)
- `<Route path="/vitrine/consolidar" ... />` (58)
- `<Route path="/vitrine/cadastro-convite" ... />` (59)
- Bloco `<Route element={<PreviewAppShell />}>...</Route>` (62–68) — todas as 5 rotas `/vitrine/*` internas
- Redirects `/preview/*` (71–77) — todos os 7 redirects
- `<Route path="/convite/token-exemplo-preview" ... />` (84) — redirect para vitrine, perde o sentido

**B.4 — Imports órfãos a REMOVER do `src/App.tsx`:**
- Linhas 29–33: `import PreviewHubPage, { PreviewCompletarPerfilPage, PreviewGestaoEquipePage, PreviewCadastroConvitePage } from "./pages/PreviewHubPage";`
- Linha 34: `import PreviewAppShell from "./components/PreviewAppShell";`
- `Navigate` continua sendo usado (no novo redirect de `/` e no redirect de `/reset-password`), portanto mantém.

### Confirmações

1. **Páginas reais não tocadas**: `DashboardPage`, `DashboardMetricasPage`, `PlanosPage`, `PerfilPage`, `MeusCursosPage`, `PacientePage`, `HistoricoLaudosPage`, `LaudoViewerPage`, `GestaoPage`, `GestaoEquipePage`, `ConsolidarPage`, `CadastroConvitePage`, `CompletarPerfilPage`, `OnboardingPage`, todo o `admin/*`. Nenhum desses arquivos será modificado.
2. **Rotas autenticadas intactas**: blocos `<ProtectedRoute>` (linhas 88–134) permanecem byte-a-byte iguais.
3. **`/login` permanece funcional**: `LoginPage` continua importada e mapeada em `<Route path="/login" .../>`.
4. **Outras sidebars não tocadas**: `AdminSidebar`, `AppSidebar`, etc. permanecem inalteradas.
5. **Após mudança**: acessar `https://gestao-mamae-brilhante.lovable.app/` redireciona para `/login`. Acessar qualquer `/vitrine/*` ou `/preview/*` cai em `NotFound` (catch-all `*`).

### Resumo das alterações
- **Editar**: `src/components/AppShellClinico.tsx` (1 import + 1 item de nav + 1 linha breadcrumb), `src/App.tsx` (remover ~25 linhas de rotas + 2 imports, trocar rota `/`).
- **Deletar**: `src/pages/PreviewHubPage.tsx`, `src/components/PreviewAppShell.tsx`.
- **Manter**: `src/lib/previewPatients.ts` (dependência de código real — fora de escopo refatorar).

Aguardando aprovação para executar.