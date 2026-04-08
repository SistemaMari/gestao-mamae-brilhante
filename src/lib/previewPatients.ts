export interface PreviewPaciente {
  id: string;
  nome: string;
  numero_identificacao: string | null;
  dum: string | null;
  usg_data: string | null;
  usg_ig_semanas: number | null;
  usg_ig_dias: number | null;
  status_ficha: string;
  dmg_gestacao_anterior: boolean | null;
  data_ultima_consulta: string | null;
  data_proximo_retorno: string | null;
  tipo_retorno: string | null;
}

const STORAGE_KEY = 'dramari_preview_pacientes';

function canUseStorage() {
  return typeof window !== 'undefined' && typeof window.localStorage !== 'undefined';
}

function todayISO() {
  return new Date().toISOString().slice(0, 10);
}

function daysAgo(n: number) {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return d.toISOString().slice(0, 10);
}

function daysFromNow(n: number) {
  const d = new Date();
  d.setDate(d.getDate() + n);
  return d.toISOString().slice(0, 10);
}

const SEED_PATIENTS: PreviewPaciente[] = [
  {
    id: 'demo-1',
    nome: 'Maria Luísa Ferreira',
    numero_identificacao: '12345678',
    dum: daysAgo(84), // ~12 semanas
    usg_data: null,
    usg_ig_semanas: null,
    usg_ig_dias: null,
    status_ficha: 'aguardando_gj',
    dmg_gestacao_anterior: false,
    data_ultima_consulta: daysAgo(3),
    data_proximo_retorno: null,
    tipo_retorno: null,
  },
  {
    id: 'demo-2',
    nome: 'Ana Carolina Souza',
    numero_identificacao: '87654321',
    dum: daysAgo(140), // ~20 semanas
    usg_data: daysAgo(56),
    usg_ig_semanas: 12,
    usg_ig_dias: 3,
    status_ficha: 'aguardando_gtt',
    dmg_gestacao_anterior: false,
    data_ultima_consulta: daysAgo(7),
    data_proximo_retorno: null,
    tipo_retorno: null,
  },
  {
    id: 'demo-3',
    nome: 'Juliana de Oliveira',
    numero_identificacao: null,
    dum: daysAgo(210), // ~30 semanas
    usg_data: null,
    usg_ig_semanas: null,
    usg_ig_dias: null,
    status_ficha: 'dmg_afastado',
    dmg_gestacao_anterior: false,
    data_ultima_consulta: daysAgo(14),
    data_proximo_retorno: null,
    tipo_retorno: null,
  },
  {
    id: 'demo-4',
    nome: 'Patrícia Almeida Santos',
    numero_identificacao: '11223344',
    dum: daysAgo(196), // ~28 semanas
    usg_data: daysAgo(70),
    usg_ig_semanas: 18,
    usg_ig_dias: 2,
    status_ficha: 'dmg_confirmado',
    dmg_gestacao_anterior: true,
    data_ultima_consulta: daysAgo(5),
    data_proximo_retorno: daysFromNow(1), // retorno próximo
    tipo_retorno: 'consulta',
  },
  {
    id: 'demo-5',
    nome: 'Camila Rodrigues',
    numero_identificacao: '55667788',
    dum: daysAgo(224), // ~32 semanas
    usg_data: null,
    usg_ig_semanas: null,
    usg_ig_dias: null,
    status_ficha: 'dmg_confirmado',
    dmg_gestacao_anterior: true,
    data_ultima_consulta: daysAgo(10),
    data_proximo_retorno: daysAgo(2), // retorno vencido
    tipo_retorno: 'consulta',
  },
  {
    id: 'demo-6',
    nome: 'Fernanda Costa Lima',
    numero_identificacao: null,
    dum: daysAgo(252), // ~36 semanas
    usg_data: null,
    usg_ig_semanas: null,
    usg_ig_dias: null,
    status_ficha: 'resultado_parto',
    dmg_gestacao_anterior: false,
    data_ultima_consulta: daysAgo(1),
    data_proximo_retorno: null,
    tipo_retorno: null,
  },
  {
    id: 'demo-7',
    nome: 'Beatriz Mendes',
    numero_identificacao: '99887766',
    dum: daysAgo(182), // ~26 semanas
    usg_data: daysAgo(42),
    usg_ig_semanas: 20,
    usg_ig_dias: 0,
    status_ficha: 'encaminhada_endocrino',
    dmg_gestacao_anterior: false,
    data_ultima_consulta: daysAgo(2),
    data_proximo_retorno: null,
    tipo_retorno: null,
  },
];

export function getPreviewPacientes(): PreviewPaciente[] {
  if (!canUseStorage()) return SEED_PATIENTS;

  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      // First visit: seed with demo data
      savePreviewPacientes(SEED_PATIENTS);
      return SEED_PATIENTS;
    }
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : SEED_PATIENTS;
  } catch {
    return SEED_PATIENTS;
  }
}

export function savePreviewPacientes(pacientes: PreviewPaciente[]) {
  if (!canUseStorage()) return;
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(pacientes));
}

export function addPreviewPaciente(
  paciente: Omit<PreviewPaciente, 'id' | 'status_ficha' | 'data_ultima_consulta' | 'data_proximo_retorno' | 'tipo_retorno'>
) {
  const current = getPreviewPacientes();
  const next: PreviewPaciente[] = [
    {
      id: crypto.randomUUID(),
      status_ficha: 'aguardando_gj',
      data_ultima_consulta: todayISO(),
      data_proximo_retorno: null,
      tipo_retorno: null,
      ...paciente,
    },
    ...current,
  ];

  savePreviewPacientes(next);
  return next[0];
}
