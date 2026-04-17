

Padronizar a ordem das opções nos 3 selects para **Sim** sempre em cima e **Não** sempre embaixo:

- Intercorrências maternas
- Intercorrências neonatais
- Aleitamento materno na sala de parto

### Mudança
Em `src/components/RegistroPartoForm.tsx`, nos três `<Select>` listados, garantir que `<SelectItem value="sim">Sim</SelectItem>` venha antes de `<SelectItem value="nao">Não</SelectItem>` (apenas reordenar JSX).

### Arquivo afetado
- `src/components/RegistroPartoForm.tsx`

### Fora de escopo
Lógica condicional, validação, persistência, demais selects do formulário.

