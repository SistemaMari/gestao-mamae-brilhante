import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface KpisPayload {
  periodo: { inicio: string; fim: string };
  unidades_total: number;
  totais: {
    pacientes_ativos: number;
    laudos_emitidos: number;
    taxa_dmg_positivo_pct: number;
    partos_registrados: number;
    profissionais_ativos: number;
  };
  variacao_periodo_anterior: {
    pacientes_ativos_pct: number | null;
    laudos_emitidos_pct: number | null;
    taxa_dmg_positivo_delta: number | null;
  };
}

export type StatusOperacional = "ativa" | "atencao" | "inativa" | "nao_iniciada";

export interface RankingUnidade {
  unidade_id: string;
  unidade_nome: string;
  pacientes_ativos: number | null;
  laudos_emitidos: number | null;
  taxa_dmg_positivo_pct: number | null;
  tempo_medio_fechamento_dias: number | null;
  profissionais_ativos?: number | null;
  ultima_atividade: string | null;
  dias_sem_atividade: number | null;
  status_operacional: StatusOperacional | string;
}

export interface Alerta {
  alerta_id: string;
  unidade_id: string;
  unidade_nome: string;
  tipo: string;
  severidade: "alta" | "media" | string;
  mensagem: string;
  detalhe_numerico: number | null;
}

interface FiltrosAplicados {
  dataInicio: string; // YYYY-MM-DD
  dataFim: string; // YYYY-MM-DD
  unidades: string[]; // empty = todas vinculadas
}

export function usePainelGestorGeral(filtros: FiltrosAplicados) {
  const qc = useQueryClient();
  const unidadesParam = filtros.unidades.length > 0 ? filtros.unidades : null;
  const baseKey = [
    filtros.dataInicio,
    filtros.dataFim,
    [...filtros.unidades].sort().join(","),
  ];

  const kpis = useQuery({
    queryKey: ["painel-gg", "kpis", ...baseKey],
    queryFn: async (): Promise<KpisPayload> => {
      const { data, error } = await supabase.rpc("get_metricas_consolidadas_gestor_geral", {
        p_data_inicio: filtros.dataInicio,
        p_data_fim: filtros.dataFim,
        p_unidades: unidadesParam ?? undefined,
      });
      if (error) throw error;
      return data as unknown as KpisPayload;
    },
    staleTime: 60_000,
  });

  const ranking = useQuery({
    queryKey: ["painel-gg", "ranking", ...baseKey],
    queryFn: async (): Promise<RankingUnidade[]> => {
      const { data, error } = await supabase.rpc("get_ranking_unidades_gestor_geral", {
        p_data_inicio: filtros.dataInicio,
        p_data_fim: filtros.dataFim,
        p_unidades: unidadesParam ?? undefined,
      });
      if (error) throw error;
      return (data ?? []) as RankingUnidade[];
    },
    staleTime: 60_000,
  });

  const alertas = useQuery({
    queryKey: ["painel-gg", "alertas", [...filtros.unidades].sort().join(",")],
    queryFn: async (): Promise<Alerta[]> => {
      const { data, error } = await supabase.rpc("get_alertas_gestor_geral", {
        p_unidades: unidadesParam ?? undefined,
      });
      if (error) throw error;
      return (data ?? []) as Alerta[];
    },
    staleTime: 60_000,
  });

  const refreshManual = async (): Promise<{ ok: boolean; error?: string }> => {
    const { error } = await supabase.rpc("refresh_mv_metricas_unidade_manual");
    if (error) return { ok: false, error: error.message };
    await qc.invalidateQueries({ queryKey: ["painel-gg"] });
    return { ok: true };
  };

  return { kpis, ranking, alertas, refreshManual };
}
