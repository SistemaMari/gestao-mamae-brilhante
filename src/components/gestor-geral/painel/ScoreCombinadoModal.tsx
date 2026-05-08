import { useMemo } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import type { RankingUnidade } from "@/hooks/usePainelGestorGeral";
import { METRICAS, scoreCombinado, type MetricaKey } from "./utils/heatmap";

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  rows: RankingUnidade[];
  metricasSelecionadas: MetricaKey[];
}

export default function ScoreCombinadoModal({
  open,
  onOpenChange,
  rows,
  metricasSelecionadas,
}: Props) {
  const metricasObjs = METRICAS.filter((m) => metricasSelecionadas.includes(m.key));
  const direcionais = metricasObjs.filter((m) => m.direcao !== "neutra");

  const scores = useMemo(() => {
    if (direcionais.length === 0) return [];
    return rows
      .map((r) => ({
        nome: r.unidade_nome,
        score: scoreCombinado(r, rows, metricasObjs),
      }))
      .filter((x) => x.score !== null)
      .sort((a, b) => (b.score ?? 0) - (a.score ?? 0)) as { nome: string; score: number }[];
  }, [rows, metricasObjs, direcionais.length]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle style={{ fontFamily: "Sora, sans-serif" }}>
            Score combinado
          </DialogTitle>
          <DialogDescription>
            Média normalizada (0-100) das métricas direcionais selecionadas. Métricas neutras (Taxa
            DMG) não entram no cálculo.
          </DialogDescription>
        </DialogHeader>

        {direcionais.length === 0 ? (
          <div className="rounded-md border border-[#FDE68A] bg-[#FEF3C7] p-4 text-sm text-[#92400E]">
            Selecione ao menos uma métrica direcional para gerar score.
          </div>
        ) : scores.length === 0 ? (
          <p className="text-sm text-[#64748B] py-4">
            Nenhuma unidade tem dados suficientes para o cálculo.
          </p>
        ) : (
          <div className="space-y-2 max-h-96 overflow-y-auto">
            {scores.map((s, idx) => (
              <div key={s.nome} className="flex items-center gap-3">
                <span className="w-6 text-xs font-medium text-[#94A3B8]">{idx + 1}.</span>
                <span className="flex-1 text-sm text-[#1E293B] truncate">{s.nome}</span>
                <div className="flex-[2] h-3 bg-[#F1F5F9] rounded-full overflow-hidden">
                  <div
                    className="h-full bg-gradient-to-r from-[#9b87f5] to-[#7E69AB]"
                    style={{ width: `${Math.max(2, s.score)}%` }}
                  />
                </div>
                <span className="w-12 text-right text-xs font-medium text-[#475569]">
                  {s.score.toFixed(0)}
                </span>
              </div>
            ))}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
