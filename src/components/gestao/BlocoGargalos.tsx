import { AlertTriangle, ArrowRight } from 'lucide-react';
import { useNavigate, useLocation } from 'react-router-dom';
import type { PainelGargalos } from '@/lib/painelEstrategicoTypes';

interface Props {
  data: PainelGargalos;
  loading?: boolean;
  error?: string | null;
}

export default function BlocoGargalos({ data, loading, error }: Props) {
  const navigate = useNavigate();
  const { pathname } = useLocation();
  const basePath = pathname.startsWith('/vitrine') ? '/vitrine/gestao' : '/gestao';

  const itens = [
    {
      key: 'sem_gj',
      titulo: 'Sem GJ na primeira consulta',
      descricao: 'Pacientes com atendimento mas sem glicemia de jejum registrada.',
      data: data.sem_gj_primeira_consulta,
    },
    {
      key: 'gtt',
      titulo: 'GTT em atraso',
      descricao: 'IG ≥ 28 semanas sem TTOG registrado.',
      data: data.atrasadas_gtt,
    },
    {
      key: 'sem_retorno',
      titulo: 'DMG confirmado sem retorno',
      descricao: 'Sem registro de atendimento há mais de 14 dias.',
      data: data.confirmadas_sem_retorno,
    },
  ];

  const total = itens.reduce((s, i) => s + i.data.count, 0);

  return (
    <section className="space-y-3">
      <h2 className="font-heading text-lg font-semibold text-foreground">
        Gargalos de cuidado
      </h2>
      {error ? (
        <div className="rounded-xl border border-destructive/40 bg-destructive/5 p-4 text-sm text-destructive">
          {error}
        </div>
      ) : loading ? (
        <div className="grid gap-4 sm:grid-cols-3">
          {[0, 1, 2].map(i => (
            <div key={i} className="h-32 animate-pulse rounded-xl bg-muted" />
          ))}
        </div>
      ) : total === 0 ? (
        <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-5 text-sm text-emerald-900">
          Nenhum gargalo identificado. A unidade está em dia com os fluxos críticos.
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-3">
          {itens.map(it => {
            const tem = it.data.count > 0;
            return (
              <div
                key={it.key}
                className={`rounded-xl border p-5 ${
                  tem ? 'border-amber-200 bg-amber-50' : 'border-border bg-card'
                }`}
              >
                <div className="flex items-start justify-between">
                  <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-amber-100">
                    <AlertTriangle className="h-5 w-5 text-amber-700" />
                  </div>
                  <span className="font-heading text-2xl font-bold text-foreground tabular-nums">
                    {it.data.count}
                  </span>
                </div>
                <p className="mt-3 text-sm font-semibold text-foreground">{it.titulo}</p>
                <p className="mt-1 text-xs text-muted-foreground">{it.descricao}</p>
                {tem && (
                  <button
                    onClick={() => navigate(`${basePath}/fichas`)}
                    className="mt-3 inline-flex items-center gap-1 text-xs font-medium text-primary hover:underline"
                  >
                    Ver pacientes <ArrowRight className="h-3 w-3" />
                  </button>
                )}
              </div>
            );
          })}
        </div>
      )}
    </section>
  );
}
