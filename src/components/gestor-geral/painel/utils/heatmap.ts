import type { RankingUnidade } from "@/hooks/usePainelGestorGeral";

export type Direcao = "maior" | "menor" | "neutra";
export type MetricaKey =
  | "pacientes_ativos"
  | "laudos_emitidos"
  | "taxa_dmg_positivo_pct"
  | "tempo_medio_fechamento_dias"
  | "profissionais_ativos";

export interface MetricaDef {
  key: MetricaKey;
  label: string;
  direcao: Direcao;
  unidade?: string;
  fracao?: number;
  tooltip?: string;
}

export const METRICAS: MetricaDef[] = [
  { key: "pacientes_ativos", label: "Pacientes ativos", direcao: "maior" },
  { key: "laudos_emitidos", label: "Laudos emitidos", direcao: "maior" },
  {
    key: "taxa_dmg_positivo_pct",
    label: "Taxa DMG positivo",
    direcao: "neutra",
    unidade: "%",
    fracao: 1,
    tooltip:
      "Taxa alta pode indicar boa captação ou população de risco — interprete no contexto da sua rede.",
  },
  {
    key: "tempo_medio_fechamento_dias",
    label: "Tempo médio de fechamento",
    direcao: "menor",
    unidade: "d",
    fracao: 1,
  },
  { key: "profissionais_ativos", label: "Profissionais ativos", direcao: "maior" },
];

export type Tercil = "verde" | "amarelo" | "vermelho" | "neutro" | "vazio";

/**
 * Bucket por tercis sobre a distribuição da métrica entre as unidades não-nulas.
 * - direcao "maior": top tercil = verde, meio = amarelo, base = vermelho.
 * - direcao "menor": invertido.
 * - direcao "neutra": sempre "neutro".
 * - valor null: "vazio".
 */
export function calcularTercis(
  rows: RankingUnidade[],
  metrica: MetricaDef,
): Map<string, Tercil> {
  const out = new Map<string, Tercil>();
  if (metrica.direcao === "neutra") {
    rows.forEach((r) => {
      const v = r[metrica.key];
      out.set(r.unidade_id, v === null || v === undefined ? "vazio" : "neutro");
    });
    return out;
  }
  const valores = rows
    .map((r) => ({ id: r.unidade_id, v: r[metrica.key] as number | null }))
    .filter((x) => x.v !== null && x.v !== undefined) as { id: string; v: number }[];

  if (valores.length === 0) {
    rows.forEach((r) => out.set(r.unidade_id, "vazio"));
    return out;
  }

  const sorted = [...valores].sort((a, b) =>
    metrica.direcao === "maior" ? b.v - a.v : a.v - b.v,
  );
  const n = sorted.length;
  const t1 = Math.ceil(n / 3); // top
  const t2 = Math.ceil((2 * n) / 3); // meio fim
  const tercilById = new Map<string, Tercil>();
  sorted.forEach((it, idx) => {
    tercilById.set(it.id, idx < t1 ? "verde" : idx < t2 ? "amarelo" : "vermelho");
  });
  rows.forEach((r) => {
    out.set(r.unidade_id, tercilById.get(r.unidade_id) ?? "vazio");
  });
  return out;
}

export function tercilClasses(t: Tercil): string {
  switch (t) {
    case "verde":
      return "bg-[#DCFCE7] text-[#065F46]";
    case "amarelo":
      return "bg-[#FEF3C7] text-[#92400E]";
    case "vermelho":
      return "bg-[#FEE2E2] text-[#7F1D1D]";
    case "neutro":
      return "bg-[#F1F0FB] text-[#475569]";
    case "vazio":
    default:
      return "bg-[#F8FAFC] text-[#94A3B8]";
  }
}

export function formatValor(v: number | null | undefined, m: MetricaDef): string {
  if (v === null || v === undefined) return "—";
  const frac = m.fracao ?? 0;
  const num = v.toLocaleString("pt-BR", {
    minimumFractionDigits: frac,
    maximumFractionDigits: frac,
  });
  return m.unidade ? `${num}${m.unidade}` : num;
}

/** Score normalizado 0-100 para uma única métrica direcional. Nulls → null. */
export function scoreMetrica(
  v: number | null,
  rows: RankingUnidade[],
  m: MetricaDef,
): number | null {
  if (v === null || v === undefined) return null;
  if (m.direcao === "neutra") return null;
  const arr = rows
    .map((r) => r[m.key] as number | null)
    .filter((x) => x !== null && x !== undefined) as number[];
  if (arr.length === 0) return null;
  const min = Math.min(...arr);
  const max = Math.max(...arr);
  if (max === min) return 100;
  return m.direcao === "maior"
    ? ((v - min) / (max - min)) * 100
    : ((max - v) / (max - min)) * 100;
}

export function scoreCombinado(
  row: RankingUnidade,
  rows: RankingUnidade[],
  metricas: MetricaDef[],
): number | null {
  const direcionais = metricas.filter((m) => m.direcao !== "neutra");
  if (direcionais.length === 0) return null;
  const scores = direcionais
    .map((m) => scoreMetrica(row[m.key] as number | null, rows, m))
    .filter((x) => x !== null) as number[];
  if (scores.length === 0) return null;
  return scores.reduce((a, b) => a + b, 0) / scores.length;
}
