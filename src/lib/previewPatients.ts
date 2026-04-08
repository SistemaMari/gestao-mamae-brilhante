export interface PreviewConsulta {
  id: string;
  tipo: string;
  numero_sequencial: number;
  data: string;
  ig_semanas: number | null;
  ig_dias: number | null;
  observacoes: string | null;
  status_gerado: string | null;
}

export interface PreviewPaciente {
  id: string;
  nome: string;
  data_nascimento: string | null;
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
  consultas: PreviewConsulta[];
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
    data_nascimento: '1995-03-15',
    numero_identificacao: '12345678',
    dum: daysAgo(84),
    usg_data: null,
    usg_ig_semanas: null,
    usg_ig_dias: null,
    status_ficha: 'aguardando_gj',
    dmg_gestacao_anterior: false,
    data_ultima_consulta: daysAgo(3),
    data_proximo_retorno: null,
    tipo_retorno: null,
    consultas: [
      { id: 'c1-1', tipo: 'consulta_1', numero_sequencial: 1, data: daysAgo(3), ig_semanas: 12, ig_dias: 0, observacoes: 'Primeira consulta. Paciente sem queixas.', status_gerado: 'aguardando_gj' },
    ],
  },
  {
    id: 'demo-2',
    nome: 'Ana Carolina Souza',
    data_nascimento: '1990-07-22',
    numero_identificacao: '87654321',
    dum: daysAgo(140),
    usg_data: daysAgo(56),
    usg_ig_semanas: 12,
    usg_ig_dias: 3,
    status_ficha: 'aguardando_gtt',
    dmg_gestacao_anterior: false,
    data_ultima_consulta: daysAgo(7),
    data_proximo_retorno: null,
    tipo_retorno: null,
    consultas: [
      { id: 'c2-1', tipo: 'consulta_1', numero_sequencial: 1, data: daysAgo(60), ig_semanas: 12, ig_dias: 0, observacoes: null, status_gerado: 'aguardando_gj' },
    ],
  },
  {
    id: 'demo-3',
    nome: 'Juliana de Oliveira',
    data_nascimento: '1988-11-05',
    numero_identificacao: null,
    dum: daysAgo(210),
    usg_data: null,
    usg_ig_semanas: null,
    usg_ig_dias: null,
    status_ficha: 'dmg_afastado',
    dmg_gestacao_anterior: false,
    data_ultima_consulta: daysAgo(14),
    data_proximo_retorno: null,
    tipo_retorno: null,
    consultas: [
      { id: 'c3-1', tipo: 'consulta_1', numero_sequencial: 1, data: daysAgo(120), ig_semanas: 13, ig_dias: 0, observacoes: null, status_gerado: 'aguardando_gj' },
    ],
  },
  {
    id: 'demo-4',
    nome: 'Patrícia Almeida Santos',
    data_nascimento: '1993-01-30',
    numero_identificacao: '11223344',
    dum: daysAgo(196),
    usg_data: daysAgo(70),
    usg_ig_semanas: 18,
    usg_ig_dias: 2,
    status_ficha: 'dmg_confirmado',
    dmg_gestacao_anterior: true,
    data_ultima_consulta: daysAgo(5),
    data_proximo_retorno: daysFromNow(1),
    tipo_retorno: 'consulta',
    consultas: [
      { id: 'c4-1', tipo: 'consulta_1', numero_sequencial: 1, data: daysAgo(100), ig_semanas: 14, ig_dias: 0, observacoes: 'DMG em gestação anterior.', status_gerado: 'aguardando_gj' },
    ],
  },
  {
    id: 'demo-5',
    nome: 'Camila Rodrigues',
    data_nascimento: '1992-06-18',
    numero_identificacao: '55667788',
    dum: daysAgo(224),
    usg_data: null,
    usg_ig_semanas: null,
    usg_ig_dias: null,
    status_ficha: 'dmg_confirmado',
    dmg_gestacao_anterior: true,
    data_ultima_consulta: daysAgo(10),
    data_proximo_retorno: daysAgo(2),
    tipo_retorno: 'consulta',
    consultas: [
      { id: 'c5-1', tipo: 'consulta_1', numero_sequencial: 1, data: daysAgo(100), ig_semanas: 18, ig_dias: 0, observacoes: null, status_gerado: 'aguardando_gj' },
    ],
  },
  {
    id: 'demo-6',
    nome: 'Fernanda Costa Lima',
    data_nascimento: '1997-09-12',
    numero_identificacao: null,
    dum: daysAgo(252),
    usg_data: null,
    usg_ig_semanas: null,
    usg_ig_dias: null,
    status_ficha: 'resultado_parto',
    dmg_gestacao_anterior: false,
    data_ultima_consulta: daysAgo(1),
    data_proximo_retorno: null,
    tipo_retorno: null,
    consultas: [
      { id: 'c6-1', tipo: 'consulta_1', numero_sequencial: 1, data: daysAgo(150), ig_semanas: 15, ig_dias: 0, observacoes: null, status_gerado: 'aguardando_gj' },
    ],
  },
  {
    id: 'demo-7',
    nome: 'Beatriz Mendes',
    data_nascimento: '1994-04-25',
    numero_identificacao: '99887766',
    dum: daysAgo(182),
    usg_data: daysAgo(42),
    usg_ig_semanas: 20,
    usg_ig_dias: 0,
    status_ficha: 'encaminhada_endocrino',
    dmg_gestacao_anterior: false,
    data_ultima_consulta: daysAgo(2),
    data_proximo_retorno: null,
    tipo_retorno: null,
    consultas: [
      { id: 'c7-1', tipo: 'consulta_1', numero_sequencial: 1, data: daysAgo(80), ig_semanas: 15, ig_dias: 0, observacoes: null, status_gerado: 'aguardando_gj' },
    ],
  },
];

export function getPreviewPacientes(): PreviewPaciente[] {
  if (!canUseStorage()) return SEED_PATIENTS;

  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      savePreviewPacientes(SEED_PATIENTS);
      return SEED_PATIENTS;
    }
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return SEED_PATIENTS;
    // Ensure consultas array exists on each patient (backward compat)
    return parsed.map((p: any) => ({ ...p, consultas: p.consultas || [] }));
  } catch {
    return SEED_PATIENTS;
  }
}

export function savePreviewPacientes(pacientes: PreviewPaciente[]) {
  if (!canUseStorage()) return;
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(pacientes));
}

export function addPreviewPaciente(
  paciente: Omit<PreviewPaciente, 'id' | 'status_ficha' | 'data_proximo_retorno' | 'tipo_retorno'>
): PreviewPaciente {
  const current = getPreviewPacientes();
  const newPaciente: PreviewPaciente = {
    id: crypto.randomUUID(),
    status_ficha: 'aguardando_gj',
    data_proximo_retorno: null,
    tipo_retorno: null,
    ...paciente,
  };
  const next = [newPaciente, ...current];
  savePreviewPacientes(next);
  return newPaciente;
}

export function getPreviewPacienteById(id: string): PreviewPaciente | undefined {
  return getPreviewPacientes().find((p) => p.id === id);
}

export function updatePreviewPaciente(id: string, updates: Partial<PreviewPaciente>) {
  const all = getPreviewPacientes();
  const idx = all.findIndex((p) => p.id === id);
  if (idx === -1) return;
  all[idx] = { ...all[idx], ...updates };
  savePreviewPacientes(all);
}
