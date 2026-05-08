import type { Alerta, KpisPayload, RankingUnidade } from "@/hooks/usePainelGestorGeral";

function csvEscape(v: unknown): string {
  if (v === null || v === undefined) return "";
  const s = String(v);
  if (/[",;\n]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
  return s;
}

function rowsToCsv(rows: (string | number | null)[][]): string {
  return rows.map((r) => r.map(csvEscape).join(";")).join("\n");
}

export function exportarPainelCsv(params: {
  kpis: KpisPayload | null;
  ranking: RankingUnidade[];
  alertas: Alerta[];
  periodo: { inicio: string; fim: string };
}): void {
  const { kpis, ranking, alertas, periodo } = params;
  const sections: string[] = [];

  sections.push(`Painel da Rede MARI — visão consolidada`);
  sections.push(`Período;${periodo.inicio};${periodo.fim}`);
  sections.push(`Gerado em;${new Date().toISOString()}`);
  sections.push("");

  if (kpis) {
    sections.push("== KPIs Agregados ==");
    sections.push(
      rowsToCsv([
        ["Métrica", "Valor", "Variação"],
        ["Pacientes ativos", kpis.totais.pacientes_ativos, kpis.variacao_periodo_anterior.pacientes_ativos_pct ?? ""],
        ["Laudos emitidos", kpis.totais.laudos_emitidos, kpis.variacao_periodo_anterior.laudos_emitidos_pct ?? ""],
        ["Taxa DMG positivo (%)", kpis.totais.taxa_dmg_positivo_pct, kpis.variacao_periodo_anterior.taxa_dmg_positivo_delta ?? ""],
        ["Partos registrados", kpis.totais.partos_registrados, ""],
        ["Profissionais ativos", kpis.totais.profissionais_ativos, ""],
      ]),
    );
    sections.push("");
  }

  sections.push("== Ranking de Unidades ==");
  sections.push(
    rowsToCsv([
      ["Unidade", "Pacientes", "Laudos", "Taxa DMG+ (%)", "Tempo médio (d)", "Última atividade", "Status"],
      ...ranking.map((r) => [
        r.unidade_nome,
        r.pacientes_ativos ?? 0,
        r.laudos_emitidos ?? 0,
        r.taxa_dmg_positivo_pct ?? "",
        r.tempo_medio_fechamento_dias ?? "",
        r.ultima_atividade ?? "nunca",
        r.status_operacional,
      ]),
    ]),
  );
  sections.push("");

  sections.push("== Alertas ==");
  sections.push(
    rowsToCsv([
      ["Unidade", "Severidade", "Tipo", "Mensagem", "Detalhe"],
      ...alertas.map((a) => [a.unidade_nome, a.severidade, a.tipo, a.mensagem, a.detalhe_numerico ?? ""]),
    ]),
  );

  const csv = "\uFEFF" + sections.join("\n");
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `painel-rede-mari-${periodo.inicio}_${periodo.fim}.csv`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
