

# Plano: Vitrine com App Shell (sidebar + header com dados fictícios)

## Problema
As rotas `/vitrine/dashboard`, `/vitrine/planos`, `/vitrine/perfil` etc. renderizam as páginas "soltas", sem o App Shell (sidebar, header, breadcrumb). Isso impede de visualizar como o sistema final ficará.

## Solução
Criar um wrapper `PreviewAppShell` que replica o `AppShellClinico` mas com dados fictícios (sem autenticação). As rotas da vitrine passam a renderizar dentro desse shell.

### Etapas

**1. Criar componente `PreviewAppShell`**
- Arquivo: `src/components/PreviewAppShell.tsx`
- Cópia simplificada do `AppShellClinico` com dados hardcoded:
  - Nome: "Dra. Mari Exemplo"
  - Plano: "Plano Teste — 3/10 laudos"
  - Sidebar com os mesmos 4 itens mas apontando para rotas `/vitrine/*`
  - Breadcrumb funcional baseado na rota atual
  - Mobile hamburger funcional
  - Botão "Sair" redireciona para `/` (vitrine hub)
- Usa `<Outlet />` para renderizar o conteúdo interno

**2. Atualizar rotas da vitrine em `App.tsx`**
- Agrupar as rotas da vitrine dentro de um layout route usando `PreviewAppShell`:
  ```
  <Route element={<PreviewAppShell />}>
    <Route path="/vitrine/dashboard" element={<DashboardPage />} />
    <Route path="/vitrine/paciente/nova" element={<PacientePage />} />
    <Route path="/vitrine/planos" element={<PlanosPage />} />
    <Route path="/vitrine/perfil" element={<PerfilPage />} />
  </Route>
  ```
- Rotas que têm layout próprio (completar-perfil, gestao/equipe, cadastro-convite) continuam fora do shell

**3. Adicionar cards na vitrine hub**
- Adicionar card "Meu Perfil" apontando para `/vitrine/perfil`
- Atualizar card "Dashboard clínico" e "Planos" para ficarem dentro do shell

**4. Ajuste nas páginas**
- `DashboardPage`, `PlanosPage`, `PerfilPage` já funcionam sem auth (estado vazio/placeholder) — nenhuma mudança de lógica necessária

### Resultado
Ao clicar em "Dashboard clínico" na vitrine, o usuário verá a página completa com sidebar à esquerda, header no topo com saudação e badge de plano — exatamente como o sistema final ficará para um profissional logado.

