import { HeartPulse, Syringe, Activity, CalendarClock } from 'lucide-react';
import type { PainelPerfilClinico } from '@/lib/painelEstrategicoTypes';

interface Props {
  data: PainelPerfilClinico;
  loading?: boolean;
  error?: string | null;
}

function formatIg(dias: number | null) {
  if (dias == null) return '—';
  const w = Math.floor(dias / 7);
  const d = dias % 7;
  return `${w}s ${d}d`;
}

export default function BlocoPerfilClinico({ data, loading, error }: Props) {
  const dentroDoBenchmark =
    data.prevalencia_pct >= data.benchmark_min_pct &&
    data.prevalencia_pct <= data.benchmark_max_pct;
  const acima = data.prevalencia_pct > data.benchmark_max_pct;

  return (
    <section className="space-y-3">
      <h2 className="font-heading text-lg font-semibold text-foreground">
        Perfil clínico das pacientes
      </h2>
      {error ? (
        <div className="rounded-xl border border-destructive/40 bg-destructive/5 p-4 text-sm text-destructive">
          {error}
        </div>
      ) : loading ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {[0, 1, 2, 3].map(i => (
            <div key={i} className="h-28 animate-pulse rounded-xl bg-muted" />
          ))}
        </div>
      ) : data.total_acompanhadas === 0 ? (
        <div className="rounded-xl border border-border bg-card p-6 text-center text-sm text-muted-foreground">
          Sem gestantes ativas no momento.
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <div className="rounded-xl border border-border bg-card p-5">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Prevalência de DMG</p>
                <p className="mt-1 font-heading text-2xl font-bold text-foreground">
                  {data.prevalencia_pct}%
                </p>
                <p className="mt-0.5 text-xs text-muted-foreground">
                  {data.total_dmg_confirmadas} de {data.total_acompanhadas}
                </p>
                <p
                  className={`mt-1 text-xs font-medium ${
                    dentroDoBenchmark
                      ? 'text-emerald-600'
                      : acima
                        ? 'text-amber-600'
                        : 'text-muted-foreground'
                  }`}
                >
                  Benchmark: {data.benchmark_min_pct}–{data.benchmark_max_pct}%
                </p>
              </div>
              <div className="flex h-10 w-10 items-center justify-center rounded-lg" style={{ background: '#E8E0FF' }}>
                <HeartPulse className="h-5 w-5" style={{ color: '#7E69AB' }} />
              </div>
            </div>
          </div>

          <div className="rounded-xl border border-border bg-card p-5">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Em insulina</p>
                <p className="mt-1 font-heading text-2xl font-bold text-foreground">
                  {data.em_insulina}
                </p>
                <p className="mt-0.5 text-xs text-muted-foreground">
                  {data.em_insulina_pct}% das DMG
                </p>
              </div>
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
                <Syringe className="h-5 w-5 text-primary" />
              </div>
            </div>
          </div>

          <div className="rounded-xl border border-border bg-card p-5">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">DMG em gestação anterior</p>
                <p className="mt-1 font-heading text-2xl font-bold text-foreground">
                  {data.dmg_anterior}
                </p>
                <p className="mt-0.5 text-xs text-muted-foreground">
                  {data.dmg_anterior_pct}% das ativas
                </p>
              </div>
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
                <Activity className="h-5 w-5 text-primary" />
              </div>
            </div>
          </div>

          <div className="rounded-xl border border-border bg-card p-5">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">IG média ao diagnóstico</p>
                <p className="mt-1 font-heading text-2xl font-bold text-foreground">
                  {formatIg(data.ig_media_diagnostico_dias)}
                </p>
                <p className="mt-0.5 text-xs text-muted-foreground">últimos 90 dias</p>
              </div>
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
                <CalendarClock className="h-5 w-5 text-primary" />
              </div>
            </div>
          </div>
        </div>
      )}
    </section>
  );
}
