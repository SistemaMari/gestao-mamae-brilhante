

## Plano: Padronizar headers da Consulta 1 e Retorno 1

### Problema
Consulta 1 e Retorno 1 usam header em card branco simples (h1/h2 + parágrafo), enquanto Retorno 2 (Ficha A/C) e Retorno 3 (Ficha B/D) usam um **painel lilás** com:
- Borda `#9b87f5`, fundo `#F1F0FB`, padding `p-4`, `rounded-xl`
- Título em `text-base font-bold text-[#5B21B6]` com ícone `FileText` à esquerda
- Subtítulo em `text-xs text-[#6D28D9]`

### Mudanças

**1. `src/components/Retorno1Form.tsx` (linhas 530–537)**

Substituir o header atual:
```tsx
<div className="rounded-xl border border-border bg-card p-6 shadow-sm">
  <h2 className="font-heading text-lg font-bold text-foreground">RETORNO 1 — ...</h2>
  <p className="mt-1 text-sm text-muted-foreground">Insira o resultado...</p>
```

Por:
```tsx
<div className="space-y-5">
  <div className="rounded-xl border border-[#9b87f5] bg-[#F1F0FB] p-4 space-y-1">
    <h2 className="text-base font-bold text-[#5B21B6] flex items-center gap-2">
      <FileText className="h-5 w-5" />
      RETORNO 1 — Resultado da Glicemia de Jejum
    </h2>
    <p className="text-xs text-[#6D28D9]">Insira o resultado da glicemia de jejum para diagnóstico automático.</p>
  </div>
  ...
```

Importar `FileText` de `lucide-react`. Ajustar fechamento do wrapper (remover `bg-card p-6 shadow-sm` externo, manter conteúdo do form em sequência).

**2. `src/components/Consulta1Form.tsx` (linhas 183–189)**

Substituir o header atual:
```tsx
<div className="rounded-xl border border-border bg-card p-6 shadow-sm sm:p-8">
  <h1 className="font-heading text-xl font-bold text-foreground">Consulta 1 — Dados da Paciente</h1>
  <p className="mt-1 text-sm text-muted-foreground">Preencha os dados iniciais...</p>
```

Por estrutura idêntica à do Retorno 1 (painel lilás com `FileText`):
```tsx
<div className="mx-auto max-w-lg space-y-5">
  <div className="rounded-xl border border-[#9b87f5] bg-[#F1F0FB] p-4 space-y-1">
    <h1 className="text-base font-bold text-[#5B21B6] flex items-center gap-2">
      <FileText className="h-5 w-5" />
      CONSULTA 1 — Dados da Paciente
    </h1>
    <p className="text-xs text-[#6D28D9]">Preencha os dados iniciais e abra a ficha clínica com pedido de exame.</p>
  </div>
  ...
```

Importar `FileText`. Reorganizar o wrapper (mover `<form>` e demais campos para fora do card branco original; manter os campos internos como hoje, apenas envolvendo num container `space-y-5`).

### Fora de escopo
- GTT mantido como está (usuário não citou).
- Cards de resultado, notas técnicas e popups permanecem inalterados.
- Sem mudanças de lógica, validação, estado ou rotas.

