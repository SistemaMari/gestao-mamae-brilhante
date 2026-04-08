import { useState, useMemo } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { useProfissionalData } from '@/hooks/useProfissionalData';
import { supabase } from '@/integrations/supabase/client';
import { addPreviewPaciente } from '@/lib/previewPatients';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { Info, Loader2 } from 'lucide-react';
import { differenceInYears, addDays } from 'date-fns';

function todayISO() {
  return new Date().toISOString().slice(0, 10);
}

export default function Consulta1Form() {
  const navigate = useNavigate();
  const location = useLocation();
  const isPreview = location.pathname.startsWith('/vitrine');
  const { user } = useAuth();
  const { profissionalData } = useProfissionalData();

  const [nome, setNome] = useState('');
  const [dataNascimento, setDataNascimento] = useState('');
  const [numeroId, setNumeroId] = useState('');
  const [igSemanas, setIgSemanas] = useState('');
  const [igDias, setIgDias] = useState('');
  const [dataConsulta, setDataConsulta] = useState(todayISO());
  const [observacoes, setObservacoes] = useState('');
  const [dmgAnterior, setDmgAnterior] = useState<boolean | null>(null);
  const [saving, setSaving] = useState(false);
  const [touched, setTouched] = useState(false);

  const identificadorLabel = useMemo(() => {
    if (!profissionalData) return 'Número de identificação';
    const id = (profissionalData as any).identificador_padrao;
    if (id === 'cpf') return 'CPF';
    if (id === 'prontuario') return 'Prontuário';
    if (id === 'cns') return 'CNS';
    return 'Número de identificação';
  }, [profissionalData]);

  const idade = useMemo(() => {
    if (!dataNascimento) return null;
    return differenceInYears(new Date(), new Date(dataNascimento));
  }, [dataNascimento]);

  // Calculate IG at consultation date from IG entered
  const igAtConsulta = useMemo(() => {
    const s = parseInt(igSemanas, 10);
    const d = parseInt(igDias, 10) || 0;
    if (isNaN(s)) return null;
    return { semanas: s, dias: d };
  }, [igSemanas, igDias]);

  // Calculate DUM from IG + data consulta
  const dumCalculada = useMemo(() => {
    if (!igAtConsulta || !dataConsulta) return null;
    const totalDias = igAtConsulta.semanas * 7 + igAtConsulta.dias;
    return addDays(new Date(dataConsulta), -totalDias).toISOString().slice(0, 10);
  }, [igAtConsulta, dataConsulta]);


  const isValid = nome.trim() && dataNascimento && igSemanas && dataConsulta && dmgAnterior !== null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setTouched(true);

    if (!isValid) {
      toast.error('Preencha todos os campos obrigatórios.');
      return;
    }

    if (isPreview) {
      const consultaId = crypto.randomUUID();
      const newPaciente = addPreviewPaciente({
        nome: nome.trim(),
        data_nascimento: dataNascimento,
        numero_identificacao: numeroId.trim() || null,
        dum: dumCalculada,
        usg_data: null,
        usg_ig_semanas: null,
        usg_ig_dias: null,
        dmg_gestacao_anterior: dmgAnterior === true,
        data_ultima_consulta: dataConsulta,
        consultas: [
          {
            id: consultaId,
            tipo: 'consulta_1',
            numero_sequencial: 1,
            data: dataConsulta,
            ig_semanas: parseInt(igSemanas, 10),
            ig_dias: parseInt(igDias, 10) || 0,
            observacoes: observacoes.trim() || null,
            status_gerado: 'aguardando_gj',
          },
        ],
      });
      window.dispatchEvent(new Event('preview-pacientes-updated'));
      toast.success('Consulta 1 registrada com sucesso!');
      navigate(`/vitrine/paciente/${newPaciente.id}`);
      return;
    }

    // Real mode
    if (!profissionalData || !user) {
      toast.error('Você precisa estar logado.');
      return;
    }

    setSaving(true);

    // Check pode_criar_ficha
    const { data: podeCriar } = await supabase.rpc('pode_criar_ficha', {
      p_profissional_id: profissionalData.id,
    });

    if (!podeCriar) {
      toast.error('Limite de fichas atingido para o plano atual.');
      setSaving(false);
      return;
    }

    const pacientePayload: Record<string, unknown> = {
      nome: nome.trim(),
      profissional_id: profissionalData.id,
      data_nascimento: dataNascimento,
      numero_identificacao: numeroId.trim() || null,
      dum: dumCalculada,
      dmg_gestacao_anterior: dmgAnterior === true,
      data_ultima_consulta: dataConsulta,
      status_ficha: 'aguardando_gj',
    };

    if ('unidade_id' in profissionalData) {
      pacientePayload.unidade_id = (profissionalData as any).unidade_id || null;
    }

    const { data: pacienteData, error: pacErr } = await supabase
      .from('pacientes')
      .insert(pacientePayload as any)
      .select('id')
      .single();

    if (pacErr || !pacienteData) {
      toast.error('Erro ao criar paciente.');
      console.error(pacErr);
      setSaving(false);
      return;
    }

    const { error: consErr } = await supabase.from('consultas' as any).insert({
      paciente_id: pacienteData.id,
      profissional_id: profissionalData.id,
      tipo: 'consulta_1',
      numero_sequencial: 1,
      data: dataConsulta,
      ig_semanas: parseInt(igSemanas, 10),
      ig_dias: parseInt(igDias, 10) || 0,
      observacoes: observacoes.trim() || null,
      status_gerado: 'aguardando_gj',
    } as any);

    setSaving(false);

    if (consErr) {
      toast.error('Paciente criada, mas erro ao registrar consulta.');
      console.error(consErr);
    } else {
      toast.success('Consulta 1 registrada com sucesso!');
    }

    navigate(`/paciente/${pacienteData.id}`);
  };

  const fieldError = (valid: boolean) =>
    touched && !valid ? 'border-destructive ring-1 ring-destructive' : '';

  return (
    <div className="mx-auto max-w-lg">
      <div className="rounded-xl border border-border bg-card p-6 shadow-sm sm:p-8">
        <h1 className="font-heading text-xl font-bold text-foreground">Consulta 1 — Dados da Paciente</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Preencha os dados iniciais e abra a ficha clínica com pedido de exame.
        </p>

        <form onSubmit={handleSubmit} className="mt-6 space-y-5">
          {/* Nome completo */}
          <div className="space-y-2">
            <FieldLabel htmlFor="nome" required tooltip="Nome completo da gestante.">
              Nome completo
            </FieldLabel>
            <Input
              id="nome"
              value={nome}
              onChange={(e) => setNome(e.target.value)}
              placeholder="Nome da paciente"
              className={fieldError(!!nome.trim())}
            />
          </div>

          {/* Data de nascimento */}
          <div className="space-y-2">
            <FieldLabel htmlFor="data-nasc" required tooltip="Data de nascimento da gestante. A idade será calculada automaticamente.">
              Data de nascimento
            </FieldLabel>
            <div className="flex items-center gap-3">
              <Input
                id="data-nasc"
                type="date"
                value={dataNascimento}
                onChange={(e) => setDataNascimento(e.target.value)}
                className={`flex-1 ${fieldError(!!dataNascimento)}`}
              />
              {idade !== null && (
                <span className="whitespace-nowrap rounded-md bg-muted px-2.5 py-1 text-sm font-medium text-foreground">
                  {idade} anos
                </span>
              )}
            </div>
          </div>

          {/* Número de identificação (condicional) */}
          <div className="space-y-2">
            <FieldLabel htmlFor="numero-id" tooltip="Prontuário, CPF ou outro identificador configurado no seu perfil.">
              {identificadorLabel}
            </FieldLabel>
            <Input
              id="numero-id"
              value={numeroId}
              onChange={(e) => setNumeroId(e.target.value)}
              placeholder="Opcional"
            />
          </div>

          {/* Idade gestacional */}
          <fieldset className="space-y-3 rounded-lg border border-border p-4">
            <legend className="px-2 text-sm font-medium text-foreground flex items-center gap-1.5">
              Idade gestacional na consulta *
              <Tooltip>
                <TooltipTrigger asChild>
                  <Info className="h-3.5 w-3.5 text-muted-foreground cursor-help" />
                </TooltipTrigger>
                <TooltipContent>Informe a IG em semanas e dias no momento desta consulta. A DUM será calculada automaticamente.</TooltipContent>
              </Tooltip>
            </legend>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label htmlFor="ig-semanas">Semanas</Label>
                <Input
                  id="ig-semanas"
                  type="number"
                  min="0"
                  max="42"
                  value={igSemanas}
                  onChange={(e) => setIgSemanas(e.target.value)}
                  placeholder="Ex: 12"
                  className={fieldError(!!igSemanas)}
                />
              </div>
              <div className="space-y-1">
                <Label htmlFor="ig-dias">Dias</Label>
                <Input
                  id="ig-dias"
                  type="number"
                  min="0"
                  max="6"
                  value={igDias}
                  onChange={(e) => setIgDias(e.target.value)}
                  placeholder="0"
                />
              </div>
            </div>
          </fieldset>

          {/* Data da consulta */}
          <div className="space-y-2">
            <FieldLabel htmlFor="data-consulta" required tooltip="Data em que esta consulta está sendo realizada. Padrão: hoje.">
              Data da consulta
            </FieldLabel>
            <Input
              id="data-consulta"
              type="date"
              value={dataConsulta}
              onChange={(e) => setDataConsulta(e.target.value)}
              className={fieldError(!!dataConsulta)}
            />
          </div>

          {/* Observações */}
          <div className="space-y-2">
            <FieldLabel htmlFor="obs" tooltip="Anotações clínicas livres desta consulta.">
              Observações clínicas
            </FieldLabel>
            <Textarea
              id="obs"
              value={observacoes}
              onChange={(e) => setObservacoes(e.target.value)}
              placeholder="Opcional"
              rows={3}
            />
          </div>

          {/* DMG anterior */}
          <div className="space-y-2">
            <FieldLabel required tooltip="Marque se a paciente já teve diagnóstico de Diabete Mellitus Gestacional em gestação prévia.">
              DMG em gestação anterior
            </FieldLabel>
            <div className="flex gap-3">
              <button
                type="button"
                onClick={() => setDmgAnterior(true)}
                className={`flex-1 rounded-lg border-2 px-4 py-3 text-sm font-medium transition-colors ${
                  dmgAnterior === true
                    ? 'border-primary bg-primary/10 text-primary'
                    : 'border-border bg-card text-muted-foreground hover:border-primary/40'
                } ${touched && dmgAnterior === null ? 'border-destructive' : ''}`}
              >
                Sim
              </button>
              <button
                type="button"
                onClick={() => setDmgAnterior(false)}
                className={`flex-1 rounded-lg border-2 px-4 py-3 text-sm font-medium transition-colors ${
                  dmgAnterior === false
                    ? 'border-primary bg-primary/10 text-primary'
                    : 'border-border bg-card text-muted-foreground hover:border-primary/40'
                } ${touched && dmgAnterior === null ? 'border-destructive' : ''}`}
              >
                Não
              </button>
            </div>
          </div>

          {/* Botões */}
          <div className="flex flex-col-reverse gap-3 pt-2 sm:flex-row sm:justify-end">
            <Button
              type="button"
              variant="outline"
              onClick={() => navigate(isPreview ? '/vitrine/dashboard' : '/dashboard')}
            >
              Cancelar
            </Button>
            <Button type="submit" disabled={saving}>
              {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Registrar Consulta 1
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}

function FieldLabel({
  children,
  htmlFor,
  required,
  tooltip,
}: {
  children: React.ReactNode;
  htmlFor?: string;
  required?: boolean;
  tooltip: string;
}) {
  return (
    <div className="flex items-center gap-1.5">
      <Label htmlFor={htmlFor}>
        {children} {required && '*'}
      </Label>
      <Tooltip>
        <TooltipTrigger asChild>
          <Info className="h-3.5 w-3.5 text-muted-foreground cursor-help" />
        </TooltipTrigger>
        <TooltipContent>{tooltip}</TooltipContent>
      </Tooltip>
    </div>
  );
}
