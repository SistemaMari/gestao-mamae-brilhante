export type PlanoSeveridade = 'suspenso' | 'expirado' | 'expirando' | 'ok';

export interface PlanoStatusInfo {
  severidade: PlanoSeveridade;
  diasRestantes: number | null;
  bloqueado: boolean;
  titulo: string;
  descricao: string;
}

const MS_DIA = 1000 * 60 * 60 * 24;

export function avaliarPlanoStatus(
  plano_status: string | null | undefined,
  plano_expira_em: string | null | undefined,
): PlanoStatusInfo {
  const status = (plano_status ?? 'ativo').toLowerCase();

  if (status === 'suspenso' || status === 'cancelado' || status === 'inativo') {
    return {
      severidade: 'suspenso',
      diasRestantes: null,
      bloqueado: true,
      titulo: 'Seu plano está suspenso.',
      descricao: 'A geração de laudos e novas fichas está bloqueada. Atualize o plano para continuar.',
    };
  }

  if (plano_expira_em) {
    const exp = new Date(plano_expira_em).getTime();
    const agora = Date.now();
    const dias = Math.ceil((exp - agora) / MS_DIA);

    if (dias < 0) {
      return {
        severidade: 'expirado',
        diasRestantes: dias,
        bloqueado: true,
        titulo: 'Seu plano expirou.',
        descricao: 'Renove o plano para retomar a geração de laudos e cadastro de novas pacientes.',
      };
    }

    if (dias <= 7) {
      return {
        severidade: 'expirando',
        diasRestantes: dias,
        bloqueado: false,
        titulo: dias === 0
          ? 'Seu plano expira hoje.'
          : `Seu plano expira em ${dias} ${dias === 1 ? 'dia' : 'dias'}.`,
        descricao: 'Renove agora para evitar interrupção do serviço.',
      };
    }
  }

  return {
    severidade: 'ok',
    diasRestantes: null,
    bloqueado: false,
    titulo: '',
    descricao: '',
  };
}
