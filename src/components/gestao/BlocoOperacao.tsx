import { Activity, FileText, Users } from 'lucide-react';
import StatCard from '@/components/StatCard';
import type { PainelOperacao } from '@/lib/painelEstrategicoTypes';

interface Props {
  data: PainelOperacao;
  loading?: boolean;
  error?: string | null;
}

export default function BlocoOperacao({ data, loading, error }: Props) {
  return (
    <section className="space-y-3">
      <h2 className="font-heading text-lg font-semibold text-foreground">
        Operação da unidade
      </h2>
      {error ? (
        <div className="rounded-xl border border-destructive/40 bg-destructive/5 p-4 text-sm text-destructive">
          {error}
        </div>
      ) : loading ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {[0, 1, 2].map(i => (
            <div key={i} className="h-24 animate-pulse rounded-xl bg-muted" />
          ))}
        </div>
      ) : (
        <>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <StatCard
              title="Gestantes ativas"
              value={data.gestantes_ativas}
              subtitle="DUM nos últimos 280 dias"
              icon={Users}
            />
            <StatCard
              title="Laudos nos últimos 30 dias"
              value={data.laudos_30d}
              subtitle="emitidos pela equipe"
              icon={FileText}
            />
            <StatCard
              title="Profissionais com paciente ativo"
              value={data.distribuicao_profissionais.filter(p => p.total_pacientes_ativos > 0).length}
              subtitle={`de ${data.distribuicao_profissionais.length} na unidade`}
              icon={Activity}
            />
          </div>

          <div className="rounded-xl border border-border bg-card p-5">
            <h3 className="mb-3 text-sm font-semibold text-foreground">
              Distribuição de gestantes ativas por profissional
            </h3>
            {data.distribuicao_profissionais.length === 0 ? (
              <p className="text-sm text-muted-foreground">Nenhum profissional vinculado.</p>
            ) : (
              <ul className="space-y-2">
                {data.distribuicao_profissionais.map(p => {
                  const max = Math.max(...data.distribuicao_profissionais.map(x => x.total_pacientes_ativos), 1);
                  const pct = (p.total_pacientes_ativos / max) * 100;
                  return (
                    <li key={p.profissional_id} className="flex items-center gap-3 text-sm">
                      <span className="w-44 shrink-0 truncate text-foreground">{p.nome}</span>
                      <div className="relative h-2 flex-1 overflow-hidden rounded-full bg-muted">
                        <div
                          className="absolute inset-y-0 left-0 rounded-full"
                          style={{ width: `${pct}%`, background: '#9b87f5' }}
                        />
                      </div>
                      <span className="w-8 text-right tabular-nums text-muted-foreground">
                        {p.total_pacientes_ativos}
                      </span>
                    </li>
                  );
                })}
              </ul>
            )}
          </div>
        </>
      )}
    </section>
  );
}
