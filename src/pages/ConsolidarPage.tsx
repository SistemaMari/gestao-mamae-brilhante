import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";

import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

import PainelHeader from "@/components/gestor-geral/painel/PainelHeader";
import FiltrosGlobais, {
  calcularPeriodo,
  type FiltrosState,
  type UnidadeOpt,
} from "@/components/gestor-geral/painel/FiltrosGlobais";
import BlocoKpis from "@/components/gestor-geral/painel/BlocoKpis";
import BlocoRanking from "@/components/gestor-geral/painel/BlocoRanking";
import BlocoAlertas from "@/components/gestor-geral/painel/BlocoAlertas";
import BlocoComparador from "@/components/gestor-geral/painel/BlocoComparador";
import { exportarPainelCsv } from "@/components/gestor-geral/painel/utils/exportCsv";
import { usePainelGestorGeral } from "@/hooks/usePainelGestorGeral";

const REFRESH_KEY = "mari:painel-gg:lastRefresh";
const COOLDOWN_MS = 5 * 60 * 1000;

interface PerfilGG {
  id: string;
  nome: string | null;
}

interface ContratantesInfo {
  primeiro: string;
  outros: number;
}

export default function ConsolidarPage() {
  const { user } = useAuth();
  const navigate = useNavigate();

  const [carregandoPerfil, setCarregandoPerfil] = useState(true);
  const [gestor, setGestor] = useState<PerfilGG | null>(null);
  const [unidades, setUnidades] = useState<UnidadeOpt[]>([]);
  const [contratantes, setContratantes] = useState<ContratantesInfo>({
    primeiro: "",
    outros: 0,
  });

  const periodoInicial = calcularPeriodo("30d");
  const [filtros, setFiltros] = useState<FiltrosState>({
    unidades: [],
    preset: "30d",
    dataInicio: periodoInicial.inicio,
    dataFim: periodoInicial.fim,
  });

  const [refreshing, setRefreshing] = useState(false);
  const [cooldownSegundos, setCooldownSegundos] = useState(0);
  const [pageLoadedAt] = useState<number>(() => Date.now());
  const cooldownTimerRef = useRef<number | null>(null);

  // Redireciona perfis que não são gestor geral.
  useEffect(() => {
    if (!user?.id) return;
    let cancelado = false;
    (async () => {
      const { data: gg } = await supabase
        .from("gestores_gerais")
        .select("id, nome")
        .eq("user_id", user.id)
        .maybeSingle();

      if (cancelado) return;

      if (!gg) {
        // Redirect silencioso para a rota padrão do perfil.
        const { data: roles } = await supabase
          .from("user_roles")
          .select("role")
          .eq("user_id", user.id);
        const role = roles?.[0]?.role;
        const dest =
          role === "admin"
            ? "/admin"
            : role === "gestor"
              ? "/gestao"
              : "/dashboard";
        navigate(dest, { replace: true });
        return;
      }

      setGestor(gg as PerfilGG);

      // Unidades vinculadas
      const { data: vincs } = await supabase
        .from("gestores_gerais_unidades")
        .select("unidade_id, unidades:unidade_id(id, nome, contratante_id)")
        .eq("gestor_geral_id", gg.id);

      if (cancelado) return;

      type Vinc = {
        unidades: { id: string; nome: string; contratante_id: string } | null;
      };
      const list = ((vincs ?? []) as Vinc[])
        .map((v) => v.unidades)
        .filter(Boolean) as { id: string; nome: string; contratante_id: string }[];
      list.sort((a, b) => a.nome.localeCompare(b.nome, "pt-BR"));
      setUnidades(list.map((u) => ({ id: u.id, nome: u.nome })));

      // Contratantes (instituições)
      const contratantesIds = Array.from(new Set(list.map((u) => u.contratante_id))).filter(Boolean);
      if (contratantesIds.length > 0) {
        const { data: cts } = await supabase
          .from("contratantes")
          .select("id, nome")
          .in("id", contratantesIds);
        if (!cancelado && cts) {
          const ordenados = [...cts].sort((a, b) => a.nome.localeCompare(b.nome, "pt-BR"));
          setContratantes({
            primeiro: ordenados[0]?.nome ?? "",
            outros: Math.max(0, ordenados.length - 1),
          });
        }
      }

      setCarregandoPerfil(false);
    })();
    return () => {
      cancelado = true;
    };
  }, [user?.id, navigate]);

  // Cooldown timer
  useEffect(() => {
    const tick = () => {
      const last = Number(sessionStorage.getItem(REFRESH_KEY) ?? 0);
      const remaining = Math.max(0, COOLDOWN_MS - (Date.now() - last));
      setCooldownSegundos(Math.ceil(remaining / 1000));
    };
    tick();
    cooldownTimerRef.current = window.setInterval(tick, 1000);
    return () => {
      if (cooldownTimerRef.current) window.clearInterval(cooldownTimerRef.current);
    };
  }, []);

  const painel = usePainelGestorGeral({
    dataInicio: filtros.dataInicio,
    dataFim: filtros.dataFim,
    unidades: filtros.unidades,
  });

  const handleRefresh = async () => {
    if (cooldownSegundos > 0) return;
    setRefreshing(true);
    const res = await painel.refreshManual();
    setRefreshing(false);
    if (res.ok) {
      sessionStorage.setItem(REFRESH_KEY, String(Date.now()));
      toast.success("Dados atualizados.");
    } else {
      toast.error("Não foi possível atualizar agora.");
    }
  };

  const handleExportCsv = () => {
    exportarPainelCsv({
      kpis: painel.kpis.data ?? null,
      ranking: painel.ranking.data ?? [],
      alertas: painel.alertas.data ?? [],
      periodo: { inicio: filtros.dataInicio, fim: filtros.dataFim },
    });
  };

  const atualizadoHaMin = useMemo(() => {
    const last = Number(sessionStorage.getItem(REFRESH_KEY) ?? 0);
    const ref = last > 0 ? last : pageLoadedAt;
    return Math.floor((Date.now() - ref) / 60000);
  }, [pageLoadedAt, painel.kpis.dataUpdatedAt]);

  if (carregandoPerfil) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-[#7E69AB]" />
      </div>
    );
  }

  if (!gestor) return null;

  if (unidades.length === 0) {
    return (
      <div className="p-6 max-w-3xl mx-auto">
        <div className="rounded-xl border border-border bg-white p-8 text-center shadow-sm">
          <h1
            className="text-xl font-semibold text-[#1E293B]"
            style={{ fontFamily: "Sora, sans-serif" }}
          >
            Nenhuma unidade vinculada
          </h1>
          <p className="mt-2 text-sm text-[#64748B]">
            Você ainda não possui unidades vinculadas ao seu perfil de Gestor Geral. Contate o
            administrador para liberar o acesso.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-4 md:p-6 space-y-4 max-w-[1400px] mx-auto">
      <PainelHeader
        nome={gestor.nome ?? ""}
        cargo="Gestor Geral"
        instituicao={contratantes.primeiro}
        outrosContratantes={contratantes.outros}
        unidadesVinculadas={unidades.length}
        atualizadoHaMin={atualizadoHaMin}
        refreshing={refreshing}
        cooldownSegundos={cooldownSegundos}
        onRefresh={handleRefresh}
        onExportCsv={handleExportCsv}
      />

      <FiltrosGlobais
        unidadesDisponiveis={unidades}
        valor={filtros}
        onAplicar={setFiltros}
      />

      <BlocoKpis
        data={painel.kpis.data}
        isLoading={painel.kpis.isLoading}
        isError={painel.kpis.isError}
        onRetry={() => painel.kpis.refetch()}
      />

      <BlocoRanking
        data={painel.ranking.data}
        isLoading={painel.ranking.isLoading}
        isError={painel.ranking.isError}
        onRetry={() => painel.ranking.refetch()}
      />

      <BlocoAlertas
        data={painel.alertas.data}
        isLoading={painel.alertas.isLoading}
        isError={painel.alertas.isError}
        onRetry={() => painel.alertas.refetch()}
      />

      <BlocoComparador
        data={painel.ranking.data}
        isLoading={painel.ranking.isLoading}
        isError={painel.ranking.isError}
        onRetry={() => painel.ranking.refetch()}
      />
    </div>
  );
}
