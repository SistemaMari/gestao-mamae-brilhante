import { useNavigate } from 'react-router-dom';
import { AlertTriangle, Clock, ShieldAlert } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useProfissionalData } from '@/hooks/useProfissionalData';
import { avaliarPlanoStatus } from '@/lib/planoStatus';

/**
 * Banner global de status do plano:
 * - suspenso/cancelado: vermelho, bloqueia ações
 * - expirado: vermelho, bloqueia ações
 * - expirando em <=7 dias: amarelo, alerta
 * - ok: não renderiza
 */
export default function BannerStatusPlano() {
  const navigate = useNavigate();
  const { profissionalData, loading } = useProfissionalData();

  if (loading || !profissionalData) return null;

  const info = avaliarPlanoStatus(profissionalData.plano_status, profissionalData.plano_expira_em);
  if (info.severidade === 'ok') return null;

  const critico = info.bloqueado;
  const Icon = info.severidade === 'suspenso' ? ShieldAlert : info.severidade === 'expirado' ? AlertTriangle : Clock;

  return (
    <div
      className={
        'border-b px-6 py-3 print:hidden ' +
        (critico
          ? 'border-destructive/30 bg-destructive/10'
          : 'border-amber-300/50 bg-amber-50')
      }
      role="alert"
    >
      <div className="mx-auto flex max-w-[1200px] flex-wrap items-center gap-3">
        <Icon className={'h-5 w-5 shrink-0 ' + (critico ? 'text-destructive' : 'text-amber-600')} />
        <div className="flex-1 min-w-[220px]">
          <p className={'text-sm font-medium ' + (critico ? 'text-destructive' : 'text-amber-900')}>
            {info.titulo}
          </p>
          <p className={'text-xs ' + (critico ? 'text-destructive/80' : 'text-amber-800/80')}>
            {info.descricao}
          </p>
        </div>
        <Button
          size="sm"
          variant={critico ? 'destructive' : 'default'}
          onClick={() => navigate('/planos')}
        >
          {critico ? 'Renovar plano' : 'Ver planos'}
        </Button>
      </div>
    </div>
  );
}
