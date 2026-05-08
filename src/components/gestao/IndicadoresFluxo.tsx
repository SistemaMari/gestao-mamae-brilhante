import { Check, AlertTriangle } from 'lucide-react';
import CardInfoTooltip from './CardInfoTooltip';

export interface Sobrecarregado {
  nome: string;
  pacientes: number;
}

interface Props {
  tempoMedioDias: number | null;
  sobrecarregados: Sobrecarregado[];
  loading?: boolean;
  erroTempo?: boolean;
  erroSobrecarga?: boolean;
}

function Skeleton() {
  return <div className="h-10 w-32 animate-pulse rounded bg-muted" />;
}

export default function IndicadoresFluxo({
  tempoMedioDias,
  sobrecarregados,
  loading,
  erroTempo,
  erroSobrecarga,
}: Props) {
  return (
    <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
      {/* Tempo médio até 1º laudo */}
      <div className="rounded-xl border border-border bg-card p-6 shadow-sm">
        <div className="mb-3 flex items-center gap-2">
          <h3 className="font-heading text-base font-semibold text-foreground">
            Tempo médio até 1º laudo
          </h3>
          <CardInfoTooltip text="Tempo médio (em dias) entre a primeira consulta de uma paciente da unidade e a emissão do primeiro laudo dela. Mede a agilidade da equipe em chegar ao diagnóstico. Tempos muito longos podem indicar gargalo no fluxo de rastreamento." />
        </div>
        {loading ? (
          <Skeleton />
        ) : erroTempo ? (
          <p className="text-sm text-muted-foreground">Erro ao carregar.</p>
        ) : tempoMedioDias === null ? (
          <>
            <div className="text-3xl font-semibold text-foreground">—</div>
            <p className="mt-1 text-xs text-muted-foreground">Sem dados no período</p>
          </>
        ) : (
          <>
            <div className="text-3xl font-semibold text-foreground tabular-nums">
              {tempoMedioDias.toFixed(1).replace('.', ',')} dias
            </div>
            <p className="mt-1 text-xs text-muted-foreground">desde 1ª consulta da paciente</p>
          </>
        )}
      </div>

      {/* Profissional sobrecarregado */}
      <div className="rounded-xl border border-border bg-card p-6 shadow-sm">
        <div className="mb-3 flex items-center gap-2">
          <h3 className="font-heading text-base font-semibold text-foreground">
            Profissional sobrecarregado
          </h3>
          <CardInfoTooltip text="Alerta automático quando algum profissional está com mais que o dobro da carga média de pacientes ativas da equipe. Carga desigual pode levar a atrasos e sobrecarga emocional. Considere redistribuir." />
        </div>
        {loading ? (
          <Skeleton />
        ) : erroSobrecarga ? (
          <p className="text-sm text-muted-foreground">Erro ao carregar.</p>
        ) : sobrecarregados.length === 0 ? (
          <div className="flex items-center gap-2 text-[13px] text-muted-foreground">
            <Check className="h-4 w-4" style={{ color: '#1D9E75' }} />
            Carga equilibrada na equipe
          </div>
        ) : (
          <div className="space-y-3">
            {sobrecarregados.map((s, i) => (
              <div key={i}>
                <div className="flex items-center gap-2 text-sm font-medium text-foreground">
                  <AlertTriangle className="h-4 w-4" style={{ color: '#BA7517' }} />
                  {s.nome} — {s.pacientes} pacientes
                </div>
                <p className="ml-6 mt-0.5 text-xs text-muted-foreground">
                  Considere redistribuir parte das pacientes.
                </p>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
