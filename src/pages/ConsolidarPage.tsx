import { Loader2 } from "lucide-react";

/**
 * STUB temporário — Prompt 17D-B em construção.
 * As 5 abas (Visão Geral, Consolidador, Diagnóstico, Comparador, Configurações)
 * + drill-down readonly serão entregues nas próximas rodadas.
 */
export default function ConsolidarPage() {
  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center gap-3 p-6 text-center">
      <Loader2 className="h-8 w-8 animate-spin text-[#7E69AB]" />
      <h1
        className="text-xl font-semibold text-[#1E293B]"
        style={{ fontFamily: "Sora, sans-serif" }}
      >
        Painel da rede em reconstrução
      </h1>
      <p className="max-w-md text-sm text-[#64748B]">
        A nova estrutura em 5 abas está sendo finalizada. Em instantes você
        poderá acessar Visão Geral, Consolidador, Diagnóstico Operacional,
        Comparador e Configurações.
      </p>
    </div>
  );
}
