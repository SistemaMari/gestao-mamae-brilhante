import { Stethoscope } from 'lucide-react';
import CardInfoTooltip from './CardInfoTooltip';

export interface ProfissionalEquipe {
  id: string;
  nome: string;
  especialidade: string | null;
  perfil_clinico?: string | null;
}

type Categoria = 'gineco' | 'endo' | 'enfermeira' | 'nutri' | 'outros';

function classificar(p: ProfissionalEquipe): Categoria {
  const esp = (p.especialidade || '').toLowerCase();
  const pc = (p.perfil_clinico || '').toLowerCase();
  if (/ginec|obstetr/.test(esp)) return 'gineco';
  if (/endocrin/.test(esp)) return 'endo';
  if (pc === 'enfermeira' || /enferm/.test(esp)) return 'enfermeira';
  if (pc === 'nutricionista' || /nutri/.test(esp)) return 'nutri';
  return 'outros';
}

const LABELS: Record<Categoria, string> = {
  gineco: 'Ginecologistas/Obstetras',
  endo: 'Endocrinologistas',
  enfermeira: 'Enfermeiras',
  nutri: 'Nutricionistas',
  outros: 'Outros',
};

const ORDEM: Categoria[] = ['gineco', 'endo', 'enfermeira', 'nutri', 'outros'];

interface Props {
  profissionais: ProfissionalEquipe[];
  loading?: boolean;
  erro?: boolean;
}

export default function ComposicaoClinica({ profissionais, loading, erro }: Props) {
  const counts: Record<Categoria, number> = {
    gineco: 0, endo: 0, enfermeira: 0, nutri: 0, outros: 0,
  };
  profissionais.forEach(p => { counts[classificar(p)] += 1; });
  const max = Math.max(...ORDEM.map(c => counts[c]), 1);
  const semEndo = counts.endo === 0;

  return (
    <div className="rounded-xl border border-border bg-card p-6 shadow-sm">
      <div className="mb-4 flex items-center gap-2">
        <Stethoscope className="h-5 w-5 text-primary" />
        <h2 className="font-heading text-lg font-semibold text-foreground">
          Composição clínica da equipe
        </h2>
        <CardInfoTooltip text="Distribuição da sua equipe por especialidade clínica. Útil para identificar lacunas de cobertura — por exemplo, equipe sem endocrinologista pode ter dificuldade em casos com insulinoterapia." />
      </div>

      {loading ? (
        <div className="space-y-3">
          {ORDEM.map(c => (
            <div key={c} className="h-5 animate-pulse rounded bg-muted" />
          ))}
        </div>
      ) : erro ? (
        <p className="text-sm text-muted-foreground">Erro ao carregar composição.</p>
      ) : (
        <>
          <div className="space-y-3">
            {ORDEM.map(cat => {
              const v = counts[cat];
              const pct = max > 0 ? (v / max) * 100 : 0;
              return (
                <div key={cat} className="flex items-center gap-3">
                  <span className="w-[180px] shrink-0 text-sm text-foreground">
                    {LABELS[cat]}
                  </span>
                  <div className="h-[18px] flex-1 overflow-hidden rounded-full bg-slate-100">
                    <div
                      className="h-full rounded-full transition-all"
                      style={{ width: `${pct}%`, backgroundColor: '#7F77DD' }}
                    />
                  </div>
                  <span
                    className="w-6 shrink-0 text-right text-base tabular-nums"
                    style={{ fontWeight: 500 }}
                  >
                    {v}
                  </span>
                </div>
              );
            })}
          </div>
          {semEndo && (
            <div
              className="mt-4 rounded-r-md text-sm"
              style={{
                backgroundColor: '#FAEEDA',
                borderLeft: '3px solid #BA7517',
                color: '#633806',
                padding: '10px 12px',
              }}
            >
              ⚠️ Nenhum endocrinologista na equipe. Considere convidar um para apoio em casos de DMG com insulinoterapia.
            </div>
          )}
        </>
      )}
    </div>
  );
}
