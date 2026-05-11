## Reorganizar fluxo de "peso → dose → justificativa" na Ficha A/C inadequada

Escopo único: `src/components/FichaACResultCard.tsx`. Sem mexer em Ficha B/D, GTT, laudo ou backend.

### Estado atual (screenshot)

1. Card "CONTROLE INADEQUADO" (amarelo)
2. Card amarelo com input de peso + botão **"Confirmar peso e gerar laudo"** + preview inline pequeno da dose
3. Após confirmar: linha pequena `Peso registrado: X kg — dose inicial de NPH: Y UI/dia`
4. Mais abaixo na página: Justificativa clínica (laudo)

A dose aparece em fonte pequena, sem destaque, e o botão promete "gerar laudo" mas o laudo já vem em sequência de qualquer jeito.

### Mudanças

**1. Renomear botão.** `Confirmar peso e gerar laudo` → `Confirmar peso`.

**2. Substituir o resumo discreto pós-confirmação por um card de destaque.** Hoje (linhas 202-214) é uma linha de texto pequena. Vira um card grande logo abaixo do botão, com:

- Título: `Dose inicial de insulina NPH`
- Número grande (estilo `font-heading text-4xl font-bold`): `{doseTotal} UI/dia`
- Linha de apoio com a distribuição: `{doseManha} UI manhã + {doseNoite} UI 22h`
- Linha pequena com o peso registrado e a fórmula `(0,5 UI/kg/dia)`
- Cor: paleta lilás/roxo do projeto (`#7E69AB` / `bg-primary/10 border-primary/30`) — destaque clínico sem usar laranja/amarelo (o card de alerta acima já é amarelo).

**3. Remover o preview inline pequeno da dose (linhas 179-188).** Como agora vai existir o card de destaque grande **abaixo do botão**, mostrar a mesma informação duas vezes (uma em preview, outra em destaque) é ruído. Manter apenas o destaque grande, que aparece em ambos os estados:
- Antes de salvar: usa `calcDoseTotal` calculado em runtime (preview ao vivo enquanto digita).
- Depois de salvar: usa `doseTotal` persistido.

Assim a dose já "salta aos olhos" enquanto a médica digita o peso, e segue visível depois.

**4. Ordem final no card:**

```text
┌─ CONTROLE INADEQUADO — 0.0% ... (amarelo)
├─ Conduta: iniciar insulina. Dose e orientações no laudo completo abaixo.
│
├─ Card amarelo: Controle glicêmico abaixo da meta
│   ├─ Input: Peso atual (kg) ⓘ
│   └─ Botão: [Confirmar peso]
│
└─ ★ Card destaque (lilás): Dose inicial de insulina NPH
    ├─ {doseTotal} UI/dia  (grande)
    ├─ {doseManha} UI manhã + {doseNoite} UI 22h
    └─ Peso: {peso} kg • 0,5 UI/kg/dia

(em seguida, fora deste card, vem a Justificativa clínica do laudo)
```

### Fora do escopo

`FichaBDResultCard`, `GttResultCard`, geração/conteúdo do laudo, `gerar-laudo`, regras de cálculo da dose (0,5 UI/kg/dia • 2/3 manhã • 1/3 noite — mantidas). Sem queries novas, sem migration.

### Entrega

- Diff de `FichaACResultCard.tsx`.
- Print do fluxo: (a) antes de digitar peso, (b) digitando peso 70 com destaque vivo, (c) após confirmar.
- Confirmação de build.
