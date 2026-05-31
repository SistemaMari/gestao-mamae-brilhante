import { FileSearch, ExternalLink, AlertCircle } from 'lucide-react';
import { formatDateBR } from '@/lib/dateUtils';

/**
 * ContextoClinicoCard — card readonly no topo das fichas de retorno
 * (Prompt 34B seção 3.8).
 *
 * Exibe dados do Caso Novo da paciente extraídos da view
 * `v_ficha_retorno_contexto`. O caller (Retorno1Form, etc.) faz a query e
 * passa os dados como props.
 *
 * Estados:
 *   - loading: mostra placeholder
 *   - erro/null: "Dados do Caso Novo não localizados ou incompletos."
 *   - sucesso: glicemia + tipo de exame + data + badge POSITIVO (se aplicável)
 *
 * Sempre readonly — nenhum input editável.
 */

interface Props {
  loading?: boolean;
  /** Dados vindos da view v_ficha_retorno_contexto. null se nada localizado. */
  contexto: {
    data_caso_novo: string | null;
    glicemia_jejum_caso_novo: number | null;
    tipo_exame_caso_novo: string | null;
    data_exame_caso_novo: string | null;
    /** "1", "2", etc. Veja src/lib/laudoMapping.ts. */
    cenario_caso_novo: string | null;
  } | null;
  /** Callback para "Ver Caso Novo completo" — abre modal/aba/navegação. Opcional. */
  onVerCasoNovo?: () => void;
  className?: string;
}

const TIPO_EXAME_LABEL: Record<string, string> = {
  plasmatica: 'Plasmática (laboratório)',
  plasmatica_venosa: 'Plasmática venosa',
  capilar: 'Capilar (ponta de dedo)',
};

function ehDmgPositivo(contexto: NonNullable<Props['contexto']>): boolean {
  // DMG por glicemia: GJ ≥ 92 mg/dL = DMG confirmado pelo Caso Novo.
  // O cenário '1' do Caso Novo é "aguardando GTT" (DMG não confirmado por GJ).
  const gj = contexto.glicemia_jejum_caso_novo;
  if (gj != null && gj >= 92) return true;
  return false;
}

export default function ContextoClinicoCard({
  loading = false,
  contexto,
  onVerCasoNovo,
  className = '',
}: Props) {
  if (loading) {
    return (
      <div
        className={`rounded-xl border-l-4 border-l-[#7C4DBA] border border-border bg-gray-50 p-4 ${className}`}
      >
        <p className="text-xs text-muted-foreground italic">Carregando contexto clínico…</p>
      </div>
    );
  }

  const semDados =
    !contexto ||
    (!contexto.data_caso_novo &&
      contexto.glicemia_jejum_caso_novo == null &&
      !contexto.data_exame_caso_novo);
  if (semDados) {
    return (
      <div
        className={`flex items-start gap-3 rounded-xl border-l-4 border-l-amber-400 border border-amber-200 bg-amber-50 p-4 ${className}`}
        role="status"
      >
        <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-amber-600" aria-hidden />
        <div className="text-xs text-amber-900">
          <p className="font-semibold">Contexto clínico — Caso Novo</p>
          <p className="mt-1">
            Dados do Caso Novo não localizados ou incompletos. Verificar consulta anterior.
          </p>
        </div>
      </div>
    );
  }

  const dmgPositivo = ehDmgPositivo(contexto);
  const tipoExameLabel = contexto.tipo_exame_caso_novo
    ? (TIPO_EXAME_LABEL[contexto.tipo_exame_caso_novo] ?? contexto.tipo_exame_caso_novo)
    : '—';

  return (
    <div
      className={`rounded-xl border-l-4 border-l-[#7C4DBA] border border-border bg-gray-50 p-4 space-y-3 ${className}`}
      role="region"
      aria-label="Contexto clínico do Caso Novo"
    >
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-center gap-2">
          <FileSearch className="h-4 w-4 text-[#7C4DBA]" aria-hidden />
          <h3 className="text-sm font-bold text-[#5B21B6]">
            Contexto clínico — Caso Novo
            {contexto.data_caso_novo && (
              <span className="ml-1 font-normal text-foreground">
                ({formatDateBR(contexto.data_caso_novo)})
              </span>
            )}
          </h3>
        </div>
        {dmgPositivo && (
          <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 px-2.5 py-0.5 text-xs font-semibold text-emerald-800 border border-emerald-300">
            POSITIVO — DMG
          </span>
        )}
      </div>

      <dl className="grid grid-cols-1 gap-2 text-xs sm:grid-cols-3">
        <div>
          <dt className="text-muted-foreground">Glicemia de jejum</dt>
          <dd className="font-semibold text-foreground">
            {contexto.glicemia_jejum_caso_novo != null
              ? `${contexto.glicemia_jejum_caso_novo} mg/dL`
              : '—'}
          </dd>
        </div>
        <div>
          <dt className="text-muted-foreground">Tipo de exame</dt>
          <dd className="font-semibold text-foreground">{tipoExameLabel}</dd>
        </div>
        <div>
          <dt className="text-muted-foreground">Data do exame</dt>
          <dd className="font-semibold text-foreground">
            {contexto.data_exame_caso_novo ? formatDateBR(contexto.data_exame_caso_novo) : '—'}
          </dd>
        </div>
      </dl>

      {onVerCasoNovo && (
        <button
          type="button"
          onClick={onVerCasoNovo}
          className="inline-flex items-center gap-1 text-xs text-[#7C4DBA] hover:underline"
        >
          <ExternalLink className="h-3 w-3" aria-hidden />
          Ver Caso Novo completo
        </button>
      )}
    </div>
  );
}
