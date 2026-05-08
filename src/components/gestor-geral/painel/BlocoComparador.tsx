import { useMemo, useState } from "react";
import { Info, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";
import type { RankingUnidade } from "@/hooks/usePainelGestorGeral";
import {
  calcularTercis,
  formatValor,
  METRICAS,
  tercilClasses,
  type MetricaKey,
} from "./utils/heatmap";
import ScoreCombinadoModal from "./ScoreCombinadoModal";

interface Props {
  data: RankingUnidade[] | undefined;
  isLoading: boolean;
  isError: boolean;
  onRetry: () => void;
}

const DEFAULT_SELECIONADAS: MetricaKey[] = [
  "pacientes_ativos",
  "laudos_emitidos",
  "taxa_dmg_positivo_pct",
  "tempo_medio_fechamento_dias",
];

export default function BlocoComparador({ data, isLoading, isError, onRetry }: Props) {
  const [selecionadas, setSelecionadas] = useState<MetricaKey[]>(DEFAULT_SELECIONADAS);
  const [apenasVermelhos, setApenasVermelhos] = useState(false);
  const [showScore, setShowScore] = useState(false);

  const metricasObjs = METRICAS.filter((m) => selecionadas.includes(m.key));

  const tercilsPorMetrica = useMemo(() => {
    const map = new Map<MetricaKey, ReturnType<typeof calcularTercis>>();
    if (!data) return map;
    metricasObjs.forEach((m) => map.set(m.key, calcularTercis(data, m)));
    return map;
  }, [data, metricasObjs]);

  const linhasVisiveis = useMemo(() => {
    if (!data) return [];
    const sorted = [...data];
    // Ordena pela primeira métrica selecionada (melhor → pior).
    const primeira = metricasObjs[0];
    if (primeira) {
      sorted.sort((a, b) => {
        const av = (a[primeira.key] as number | null) ?? -Infinity;
        const bv = (b[primeira.key] as number | null) ?? -Infinity;
        if (primeira.direcao === "menor") return (av as number) - (bv as number);
        return (bv as number) - (av as number);
      });
    }
    if (!apenasVermelhos) return sorted;
    return sorted.filter((r) =>
      metricasObjs.some((m) => tercilsPorMetrica.get(m.key)?.get(r.unidade_id) === "vermelho"),
    );
  }, [data, metricasObjs, tercilsPorMetrica, apenasVermelhos]);

  const toggleMetrica = (k: MetricaKey) => {
    setSelecionadas((s) => (s.includes(k) ? s.filter((x) => x !== k) : [...s, k]));
  };

  if (isError) {
    return (
      <div className="rounded-xl border border-[#FEE2E2] bg-[#FEF2F2] p-5">
        <p className="text-sm text-[#991B1B]">Não foi possível carregar o comparador.</p>
        <Button size="sm" variant="outline" className="mt-2" onClick={onRetry}>
          <RefreshCw className="mr-2 h-3.5 w-3.5" />
          Recarregar
        </Button>
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-border bg-white shadow-sm">
      <div className="px-5 py-4 border-b border-border">
        <h2
          className="text-base font-semibold text-[#1E293B]"
          style={{ fontFamily: "Sora, sans-serif" }}
        >
          Comparador de unidades
        </h2>
        <p className="text-xs text-[#64748B] mt-0.5">
          Selecione as métricas que você quer comparar lado a lado.
        </p>
      </div>

      <div className="p-5 space-y-5">
        {/* Seletor de métricas */}
        <div className="flex flex-wrap gap-x-6 gap-y-2">
          {METRICAS.map((m) => {
            const checked = selecionadas.includes(m.key);
            return (
              <label key={m.key} className="flex items-center gap-2 cursor-pointer">
                <Checkbox
                  checked={checked}
                  onCheckedChange={() => toggleMetrica(m.key)}
                />
                <span className="text-sm text-[#1E293B]">{m.label}</span>
                {m.direcao === "neutra" && (
                  <span className="text-[10px] uppercase tracking-wide text-[#94A3B8]">
                    neutra
                  </span>
                )}
                {m.tooltip && (
                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Info className="h-3.5 w-3.5 text-[#94A3B8]" />
                      </TooltipTrigger>
                      <TooltipContent className="max-w-xs">{m.tooltip}</TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                )}
              </label>
            );
          })}
        </div>

        <label className="flex items-center gap-2 cursor-pointer">
          <Checkbox
            checked={apenasVermelhos}
            onCheckedChange={(v) => setApenasVermelhos(Boolean(v))}
          />
          <span className="text-sm text-[#475569]">
            Mostrar apenas unidades com{" "}
            <span className="inline-block h-2 w-2 rounded-full bg-[#EF4444] align-middle" /> em
            alguma métrica selecionada
          </span>
        </label>

        {/* Heatmap */}
        {isLoading ? (
          <Skeleton className="h-48 w-full rounded-md" />
        ) : !data || data.length === 0 ? (
          <p className="text-sm text-[#64748B] text-center py-8">
            Selecione um período com atividade para comparar unidades.
          </p>
        ) : metricasObjs.length === 0 ? (
          <p className="text-sm text-[#64748B] text-center py-8">
            Selecione ao menos uma métrica para comparar.
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full border-separate border-spacing-1">
              <thead>
                <tr>
                  <th className="text-left text-xs font-medium text-[#64748B] px-2 py-1">
                    Unidade
                  </th>
                  {metricasObjs.map((m) => (
                    <th
                      key={m.key}
                      className="text-center text-xs font-medium text-[#64748B] px-2 py-1"
                    >
                      {m.label}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {linhasVisiveis.length === 0 ? (
                  <tr>
                    <td
                      colSpan={metricasObjs.length + 1}
                      className="text-center text-sm text-[#64748B] py-6"
                    >
                      Nenhuma unidade marcada como crítica nas métricas selecionadas.
                    </td>
                  </tr>
                ) : (
                  linhasVisiveis.map((r) => (
                    <tr key={r.unidade_id}>
                      <td className="text-sm font-medium text-[#1E293B] px-2 py-1.5 whitespace-nowrap">
                        {r.unidade_nome}
                      </td>
                      {metricasObjs.map((m) => {
                        const tercil = tercilsPorMetrica.get(m.key)?.get(r.unidade_id) ?? "vazio";
                        const val = r[m.key] as number | null;
                        const allValues = data
                          .map((x) => x[m.key] as number | null)
                          .filter((x) => x !== null && x !== undefined) as number[];
                        let posicao = "";
                        if (val !== null && val !== undefined && m.direcao !== "neutra") {
                          const sorted = [...allValues].sort((a, b) =>
                            m.direcao === "maior" ? b - a : a - b,
                          );
                          posicao = ` — Posição ${sorted.indexOf(val) + 1} de ${sorted.length}`;
                        }
                        return (
                          <TooltipProvider key={m.key} delayDuration={150}>
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <td
                                  className={cn(
                                    "text-center text-sm font-medium rounded-md px-3 py-2 cursor-default border border-transparent",
                                    tercilClasses(tercil),
                                  )}
                                >
                                  {formatValor(val, m)}
                                </td>
                              </TooltipTrigger>
                              <TooltipContent>
                                <span className="font-medium">{m.label}:</span>{" "}
                                {formatValor(val, m)}
                                {posicao}
                              </TooltipContent>
                            </Tooltip>
                          </TooltipProvider>
                        );
                      })}
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        )}

        <div className="flex justify-end">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowScore(true)}
            disabled={!data || data.length === 0 || metricasObjs.length === 0}
          >
            Gerar score combinado
          </Button>
        </div>
      </div>

      <ScoreCombinadoModal
        open={showScore}
        onOpenChange={setShowScore}
        rows={data ?? []}
        metricasSelecionadas={selecionadas}
      />
    </div>
  );
}
