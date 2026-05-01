## Problema

A `/vitrine/admin` (Visão Geral) mostra `0` em todos os cards porque a página faz `count('*', { head: true })` direto em `profissionais`, `unidades`, `pacientes` e `laudos`. Sem login, RLS bloqueia tudo e o count volta zero (sem erro — por isso não aparece toast vermelho como aconteceu em Diagnósticos).

Mesma estratégia já aplicada em `DiagnosticosPage`: detectar `/vitrine` e injetar mock localmente.

## Arquivos a alterar

### 1. `src/lib/mockVisaoGeral.ts` (novo)

```ts
export const mockVisaoGeral = {
  profissionais: 84,
  unidades: 12,
  pacientes: 1248,   // bate com total_gestantes do mock de Diagnósticos
  laudos: 3672,
};
```

### 2. `src/pages/admin/VisaoGeralPage.tsx`

- Importar `useLocation` e `mockVisaoGeral`.
- `const isPreview = pathname.startsWith('/vitrine')`.
- No `useEffect`:
  - Se `isPreview` → `setResumo(mockVisaoGeral)`, `setLoading(false)`, `return` (sem chamar Supabase).
  - Senão → fluxo atual permanece (4 queries em paralelo).
- `PlaceholderSecao "Métricas gerais — em breve"` permanece igual nos dois modos.

## O que não muda

- Rota `/admin` real continua usando queries com RLS — admin de verdade vê dados de verdade.
- Sem migração, sem mexer em RLS, sem novas RPCs.
- Outras páginas admin vazias (Institucionais, Admins, Exportar) ficam para um próximo passe — não fazem parte deste plano.

## Resultado esperado

`/vitrine/admin` exibe:
- Total de profissionais: **84**
- Total de unidades: **12**
- Total de pacientes: **1.248**
- Total de laudos gerados: **3.672**
- Card "Métricas gerais — em breve" mantido abaixo.

`/admin` (autenticado): inalterado.