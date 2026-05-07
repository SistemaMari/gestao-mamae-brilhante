import { Activity, Clock, FileText } from 'lucide-react';
import { format } from 'date-fns';
import CardInfoTooltip from './CardInfoTooltip';

export interface AtividadeItem {
  id: string;
  tipo: 'consulta' | 'laudo';
  descricao: string;
  profissional_nome: string;
  data: string;
}

interface Props {
  atividades: AtividadeItem[];
}

const TOOLTIP =
  'Últimos eventos registrados pela sua equipe na unidade — laudos gerados, primeiras consultas e retornos. Útil para acompanhar o ritmo de trabalho e identificar dias sem registros.';

export default function AtividadeRecente({ atividades }: Props) {
  return (
    <div className="rounded-xl border border-border bg-card p-5">
      <div className="mb-4 flex items-center gap-1.5">
        <h2 className="font-heading text-lg font-semibold text-foreground">Atividade recente</h2>
        <CardInfoTooltip text={TOOLTIP} />
      </div>
      {atividades.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-8 text-center">
          <Clock className="mb-3 h-10 w-10 text-muted-foreground/30" />
          <p className="text-sm text-muted-foreground">Nenhuma atividade registrada</p>
        </div>
      ) : (
        <div className="space-y-3">
          {atividades.map(a => (
            <div key={a.id} className="flex items-center gap-3 rounded-lg border border-border p-3">
              <div
                className={`flex h-8 w-8 items-center justify-center rounded-lg ${
                  a.tipo === 'consulta' ? 'bg-primary/10' : 'bg-secondary/20'
                }`}
              >
                {a.tipo === 'consulta' ? (
                  <FileText className="h-4 w-4 text-primary" />
                ) : (
                  <Activity className="h-4 w-4 text-secondary-foreground" />
                )}
              </div>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium text-foreground">{a.descricao}</p>
                <p className="text-xs text-muted-foreground">{a.profissional_nome}</p>
              </div>
              <span className="whitespace-nowrap text-xs text-muted-foreground">
                {new Date(format(new Date(a.data), 'yyyy-MM-dd')).toLocaleDateString('pt-BR')}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
