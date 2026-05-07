import CardInfoTooltip from './CardInfoTooltip';
import type { PainelOperacao } from '@/lib/painelEstrategicoTypes';

interface Props {
  distribuicao: PainelOperacao['distribuicao_profissionais'];
}

const TOOLTIP =
  'Total de gestantes ativas que cada profissional da sua equipe está acompanhando atualmente. Útil para identificar profissionais ociosos ou sobrecarregados e redistribuir a carga quando necessário.';

export default function DistribuicaoProfissionais({ distribuicao }: Props) {
  const max = Math.max(...distribuicao.map(p => p.total_pacientes_ativos), 1);
  return (
    <div className="rounded-xl border border-border bg-card p-5">
      <div className="mb-3 flex items-center gap-1.5">
        <h3 className="text-sm font-semibold text-foreground">
          Distribuição de gestantes ativas por profissional
        </h3>
        <CardInfoTooltip text={TOOLTIP} />
      </div>
      {distribuicao.length === 0 ? (
        <p className="text-sm text-muted-foreground">Nenhum profissional vinculado.</p>
      ) : (
        <ul className="space-y-2">
          {distribuicao.map(p => {
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
  );
}
