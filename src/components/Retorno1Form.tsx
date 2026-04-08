import { useState, useMemo } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useProfissionalData } from '@/hooks/useProfissionalData';
import { supabase } from '@/integrations/supabase/client';
import {
  updatePreviewPaciente,
  getPreviewPacienteById,
  type PreviewPaciente,
  type PreviewConsulta,
} from '@/lib/previewPatients';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Info, Loader2, AlertTriangle, CheckCircle2, XCircle, Printer } from 'lucide-react';
import { differenceInDays, addDays, format } from 'date-fns';

function todayISO() {
  return new Date().toISOString().slice(0, 10);
}

type DiagnosticoResult = {
  tipo: 'negativo' | 'positivo' | 'overt';
  label: string;
  texto: string;
  cor: string;
  bgColor: string;
  borderColor: string;
  iconColor: string;
  cenario: number | null;
  statusFicha: string;
};

function calcularDiagnostico(valor: number): DiagnosticoResult {
  if (valor < 92) {
    return {
      tipo: 'negativo',
      label: 'Resultado: NEGATIVO — Normoglicemia',
      texto: `Glicemia de jejum: ${valor} mg/dL. NÃO há diagnóstico de Diabete Mellitus Gestacional neste momento.`,
      cor: 'text-emerald-800',
      bgColor: 'bg-[#DCFCE7]',
      borderColor: 'border-emerald-200',
      iconColor: 'text-emerald-600',
      cenario: null,
      statusFicha: 'aguardando_gtt',
    };
  }
  if (valor < 126) {
    return {
      tipo: 'positivo',
      label: 'Resultado: POSITIVO — Diabete Mellitus Gestacional',
      texto: `Glicemia de jejum: ${valor} mg/dL. Diagnóstico CONFIRMADO de DMG.`,
      cor: 'text-orange-800',
      bgColor: 'bg-[#FEF3C7]',
      borderColor: 'border-orange-200',
      iconColor: 'text-orange-600',
      cenario: 1,
      statusFicha: 'dmg_confirmado',
    };
  }
  return {
    tipo: 'overt',
    label: 'Resultado: OVERT DIABETES — Diabete pré-existente',
    texto: `Glicemia de jejum: ${valor} mg/dL. Diagnóstico de Diabete pré-existente diagnosticado durante a gestação.`,
    cor: 'text-red-800',
    bgColor: 'bg-[#FEE2E2]',
    borderColor: 'border-red-200',
    iconColor: 'text-red-600',
    cenario: 8,
    statusFicha: 'dmg_confirmado',
  };
}

interface Retorno1FormProps {
  paciente: PreviewPaciente;
  primeiraConsulta: PreviewConsulta;
  isPreview: boolean;
  onSaved: () => void;
  onCancel: () => void;
}

export default function Retorno1Form({
  paciente,
  primeiraConsulta,
  isPreview,
  onSaved,
  onCancel,
}: Retorno1FormProps) {
  const { user } = useAuth();
  const { profissionalData } = useProfissionalData();

  const [valorGJ, setValorGJ] = useState('');
  const [tipoExame, setTipoExame] = useState('');
  const [dataExame, setDataExame] = useState(todayISO());
  const [igSemanas, setIgSemanas] = useState('');
  const [igDias, setIgDias] = useState('');
  const [saving, setSaving] = useState(false);
  const [touched, setTouched] = useState(false);

  // Result state
  const [resultado, setResultado] = useState<DiagnosticoResult | null>(null);
  const [showPopup, setShowPopup] = useState(false);

  const isCapilar = tipoExame === 'capilar';

  // Calculate current IG at exam date based on consulta 1
  const igCalculada = useMemo(() => {
    if (!primeiraConsulta || primeiraConsulta.ig_semanas == null) return null;
    const diasC1 = primeiraConsulta.ig_semanas * 7 + (primeiraConsulta.ig_dias || 0);
    const elapsed = differenceInDays(new Date(dataExame), new Date(primeiraConsulta.data));
    const totalDias = diasC1 + elapsed;
    if (totalDias < 0) return null;
    return { semanas: Math.floor(totalDias / 7), dias: totalDias % 7 };
  }, [primeiraConsulta, dataExame]);

  // DUM from consulta 1
  const dumCalculada = useMemo(() => {
    if (!primeiraConsulta || primeiraConsulta.ig_semanas == null) return null;
    const totalDias = primeiraConsulta.ig_semanas * 7 + (primeiraConsulta.ig_dias || 0);
    return addDays(new Date(primeiraConsulta.data), -totalDias);
  }, [primeiraConsulta]);

  // GTT window calc for negative result
  const janelaGTT = useMemo(() => {
    if (!dumCalculada) return null;
    const inicio = addDays(dumCalculada, 24 * 7);
    const fim = addDays(dumCalculada, 28 * 7);
    return { inicio, fim };
  }, [dumCalculada]);

  const igHoje = useMemo(() => {
    if (!primeiraConsulta || primeiraConsulta.ig_semanas == null) return null;
    const diasC1 = primeiraConsulta.ig_semanas * 7 + (primeiraConsulta.ig_dias || 0);
    const elapsed = differenceInDays(new Date(), new Date(primeiraConsulta.data));
    const totalDias = diasC1 + elapsed;
    return { semanas: Math.floor(totalDias / 7), dias: totalDias % 7 };
  }, [primeiraConsulta]);

  const igMaior24 = igHoje ? igHoje.semanas >= 24 : false;

  const valorNum = parseInt(valorGJ, 10);
  const valorValido = !isNaN(valorNum) && valorNum >= 1 && valorNum <= 400;
  const isValid = valorValido && tipoExame && dataExame;

  const igFinal = useMemo(() => {
    const s = parseInt(igSemanas, 10);
    if (!isNaN(s)) return { semanas: s, dias: parseInt(igDias, 10) || 0 };
    return igCalculada;
  }, [igSemanas, igDias, igCalculada]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setTouched(true);
    if (!isValid) {
      toast.error('Preencha todos os campos obrigatórios.');
      return;
    }

    setSaving(true);

    // Determine diagnosis
    const isDiagApplicable = tipoExame === 'plasmatica';
    const diag = isDiagApplicable ? calcularDiagnostico(valorNum) : null;
    const newStatus = isDiagApplicable && diag ? diag.statusFicha : paciente.status_ficha;

    if (isPreview) {
      // Preview mode: update localStorage
      const current = getPreviewPacienteById(paciente.id);
      if (current) {
        const newConsulta: PreviewConsulta = {
          id: crypto.randomUUID(),
          tipo: 'retorno_1',
          numero_sequencial: (current.consultas?.length || 1) + 1,
          data: dataExame,
          ig_semanas: igFinal?.semanas ?? null,
          ig_dias: igFinal?.dias ?? null,
          observacoes: isDiagApplicable && diag
            ? `GJ: ${valorNum} mg/dL (plasmática). ${diag.label}.`
            : `GJ: ${valorNum} mg/dL (capilar). Método não válido para diagnóstico. Aguardando glicemia plasmática.`,
          status_gerado: newStatus,
        };
        updatePreviewPaciente(paciente.id, {
          status_ficha: newStatus,
          data_ultima_consulta: dataExame,
          consultas: [...(current.consultas || []), newConsulta],
        });
        window.dispatchEvent(new Event('preview-pacientes-updated'));
      }

      setSaving(false);

      if (isDiagApplicable && diag) {
        setResultado(diag);
        setShowPopup(true);
      } else {
        toast.success('Retorno registrado. Aguardando glicemia plasmática para diagnóstico.');
        onSaved();
      }
      return;
    }

    // Real mode
    if (!profissionalData || !user) {
      toast.error('Você precisa estar logado.');
      setSaving(false);
      return;
    }

    const { data: consultaData, error: consErr } = await supabase
      .from('consultas')
      .insert({
        paciente_id: paciente.id,
        profissional_id: profissionalData.id,
        tipo: 'retorno_1',
        numero_sequencial: 2,
        data: dataExame,
        ig_semanas: igFinal?.semanas ?? null,
        ig_dias: igFinal?.dias ?? null,
        observacoes: isDiagApplicable && diag
          ? `GJ: ${valorNum} mg/dL (plasmática). ${diag.label}.`
          : `GJ: ${valorNum} mg/dL (capilar). Método não válido para diagnóstico.`,
        status_gerado: newStatus,
        cenario_clinico: isDiagApplicable && diag?.cenario ? String(diag.cenario) : null,
      } as any)
      .select('id')
      .single();

    if (consErr || !consultaData) {
      toast.error('Erro ao registrar consulta.');
      console.error(consErr);
      setSaving(false);
      return;
    }

    await supabase.from('exames_glicemia' as any).insert({
      consulta_id: consultaData.id,
      paciente_id: paciente.id,
      profissional_id: profissionalData.id,
      valor_mgdl: valorNum,
      tipo_exame: tipoExame,
      data_exame: dataExame,
      ig_semanas_na_data: igFinal?.semanas ?? null,
      ig_dias_na_data: igFinal?.dias ?? null,
    } as any);

    await supabase.from('pacientes').update({
      status_ficha: newStatus,
      data_ultima_consulta: dataExame,
    }).eq('id', paciente.id);

    setSaving(false);

    if (isDiagApplicable && diag) {
      setResultado(diag);
      setShowPopup(true);
    } else {
      toast.success('Retorno registrado. Aguardando glicemia plasmática.');
      onSaved();
    }
  };

  const handlePopupClose = () => {
    setShowPopup(false);
    onSaved();
  };

  const fieldError = (valid: boolean) =>
    touched && !valid ? 'border-destructive ring-1 ring-destructive' : '';

  const errorMsg = (valid: boolean) =>
    touched && !valid ? (
      <span className="text-xs text-destructive">Campo obrigatório</span>
    ) : null;

  // If we have a result, show the result card
  if (resultado) {
    return (
      <div className="space-y-4">
        {/* Result card */}
        <div className={`rounded-xl border ${resultado.borderColor} ${resultado.bgColor} p-5 space-y-4`}>
          <div className="flex items-start gap-3">
            {resultado.tipo === 'negativo' ? (
              <CheckCircle2 className={`h-6 w-6 shrink-0 ${resultado.iconColor}`} />
            ) : (
              <AlertTriangle className={`h-6 w-6 shrink-0 ${resultado.iconColor}`} />
            )}
            <div>
              <h2 className={`text-base font-bold ${resultado.cor}`}>{resultado.label}</h2>
              <p className={`mt-1 text-sm ${resultado.cor}`}>{resultado.texto}</p>
            </div>
          </div>

          {/* Conduta */}
          <div className="rounded-lg bg-white/70 p-4 space-y-2">
            <p className={`text-sm font-semibold ${resultado.cor}`}>Conduta</p>

            {resultado.tipo === 'negativo' ? (
              <ul className={`list-disc pl-4 text-xs ${resultado.cor} space-y-1.5`}>
                <li>Não repetir glicemia de jejum.</li>
                <li>Seguir pré-natal normal.</li>
                <li>
                  Realizar GTT 75g o mais próximo possível de 24 semanas — impreterivelmente antes de 28 semanas.
                  {janelaGTT && !igMaior24 && (
                    <> O GTT 75g deverá ser realizado o mais próximo possível da 24ª semana (entre{' '}
                      <strong>{format(janelaGTT.inicio, 'dd/MM/yyyy')}</strong> e{' '}
                      <strong>{format(janelaGTT.fim, 'dd/MM/yyyy')}</strong>).</>
                  )}
                  {igMaior24 && ' O GTT 75g já está na janela — solicitar o mais breve possível.'}
                </li>
              </ul>
            ) : (
              <ul className={`list-disc pl-4 text-xs ${resultado.cor} space-y-1.5`}>
                <li>Iniciar tratamento imediato — dieta + atividade física.</li>
                <li>Solicitar perfil glicêmico de 4 pontos diários por 7 a 10 dias (jejum + 1h pós café + 1h pós almoço + 1h pós jantar).</li>
                <li>Retorno em 7 a 10 dias com o perfil glicêmico preenchido.</li>
                <li>Solicitar ultrassom obstétrico{igHoje && igHoje.semanas < 20 ? ' para datar a gestação.' : ' para referência de crescimento fetal.'}</li>
              </ul>
            )}
          </div>

          {/* Placeholder Blocos 2 e 3 */}
          <div className="rounded-lg border border-dashed border-border bg-muted/30 p-4">
            <p className="text-xs text-muted-foreground italic">
              Justificativa científica e conduta personalizada serão geradas em breve.
            </p>
          </div>
        </div>

        {/* Notas técnicas */}
        <div className="rounded-xl border border-border bg-[#F1F5F9] p-5">
          <p className="text-sm font-semibold text-foreground mb-2">Notas técnicas</p>
          <ul className="list-disc pl-4 text-xs text-muted-foreground space-y-1.5">
            <li>Não repetir glicemia de jejum para fins diagnósticos — em nenhum cenário, seja resultado positivo ou negativo.</li>
            <li>Glicemia plasmática é OBRIGATÓRIA para diagnóstico — glicemia capilar em ponta de dedo não é válida para este fim.</li>
            <li>Glicemia capilar de jejum e pós-prandiais são utilizadas exclusivamente para acompanhamento do perfil glicêmico — nunca para diagnóstico.</li>
            <li>Se diagnóstico confirmado: iniciar tratamento imediato. O diagnóstico oportuno e correto salva vidas. Não espere, não repita — trate.</li>
          </ul>
        </div>

        {/* Ctrl+P instruction */}
        <div className="flex items-center gap-2 text-xs text-[#94A3B8]">
          <Printer className="h-3.5 w-3.5" />
          <span>Para salvar ou imprimir este laudo em PDF: pressione Ctrl+P (Windows) ou Cmd+P (Mac) e escolha "Salvar como PDF".</span>
        </div>

        {/* Impact pop-up */}
        <AlertDialog open={showPopup}>
          <AlertDialogContent className={`border-2 ${resultado.tipo === 'negativo' ? 'border-[#9b87f5]' : resultado.tipo === 'positivo' ? 'border-orange-400' : 'border-red-400'}`}>
            <AlertDialogHeader>
              <AlertDialogTitle className="text-center text-lg">
                {resultado.tipo === 'negativo' ? (
                  <span className="flex items-center justify-center gap-2 text-[#9b87f5]">
                    <AlertTriangle className="h-5 w-5" />
                    Atenção
                  </span>
                ) : (
                  <span className={`flex items-center justify-center gap-2 ${resultado.tipo === 'positivo' ? 'text-orange-600' : 'text-red-600'}`}>
                    <XCircle className="h-5 w-5" />
                    Diagnóstico confirmado
                  </span>
                )}
              </AlertDialogTitle>
              <AlertDialogDescription className="text-center text-base font-medium text-foreground">
                {resultado.tipo === 'negativo'
                  ? 'Entregue o pedido do GTT agora. Não espere. Agende o mais próximo possível de 24 semanas.'
                  : 'Diagnóstico confirmado. Não repetir o exame. É hora de tratar. Comece agora.'}
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter className="sm:justify-center">
              <AlertDialogAction
                onClick={handlePopupClose}
                className={resultado.tipo === 'negativo' ? 'bg-[#9b87f5] hover:bg-[#7E69AB] text-white' : resultado.tipo === 'positivo' ? 'bg-orange-500 hover:bg-orange-600 text-white' : 'bg-red-500 hover:bg-red-600 text-white'}
              >
                {resultado.tipo === 'negativo' ? 'Entendi' : 'Entendi, vou iniciar o tratamento'}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-border bg-card p-6 shadow-sm">
      <h2 className="font-heading text-lg font-bold text-foreground">
        Retorno 1 — Resultado da Glicemia de Jejum
      </h2>
      <p className="mt-1 text-sm text-muted-foreground">
        Insira o resultado da glicemia de jejum para diagnóstico automático.
      </p>

      {/* Capilar alert */}
      {isCapilar && (
        <div className="mt-4 rounded-lg border border-red-300 bg-[#FEE2E2] p-4 flex items-start gap-3">
          <AlertTriangle className="h-5 w-5 shrink-0 text-red-600 mt-0.5" />
          <p className="text-sm font-medium text-red-800">
            ATENÇÃO: Glicemia capilar não é válida para diagnóstico de DMG. O protocolo exige glicemia plasmática. Oriente a paciente a refazer o exame com a metodologia correta.
          </p>
        </div>
      )}

      <form onSubmit={handleSubmit} className="mt-5 space-y-5">
        {/* Resultado GJ */}
        <div className="space-y-2">
          <FieldLabel htmlFor="valor-gj" required tooltip="Insira o valor numérico exato do resultado do exame laboratorial. Ex: 94. Não arredonde.">
            Resultado da glicemia de jejum (mg/dL)
          </FieldLabel>
          <Input
            id="valor-gj"
            type="number"
            min="1"
            max="400"
            value={valorGJ}
            onChange={(e) => setValorGJ(e.target.value)}
            placeholder="Ex: 94"
            className={fieldError(valorValido || !valorGJ)}
          />
          {touched && valorGJ && !valorValido && (
            <span className="text-xs text-destructive">Valor deve ser entre 1 e 400 mg/dL</span>
          )}
          {errorMsg(!valorGJ && !valorValido)}
        </div>

        {/* Tipo de exame */}
        <div className="space-y-2">
          <FieldLabel required tooltip="Glicemia PLASMÁTICA é o único método válido para diagnóstico de DMG pelo protocolo Febrasgo/MS/OMS. Glicemia capilar (ponta de dedo) e CGM não são aceitos para diagnóstico.">
            Tipo de exame realizado
          </FieldLabel>
          <Select value={tipoExame} onValueChange={setTipoExame}>
            <SelectTrigger className={fieldError(!!tipoExame)}>
              <SelectValue placeholder="Selecione o tipo" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="plasmatica">Plasmática (laboratório)</SelectItem>
              <SelectItem value="capilar">Capilar (ponta de dedo)</SelectItem>
            </SelectContent>
          </Select>
          {errorMsg(!!tipoExame)}
        </div>

        {/* Data do exame */}
        <div className="space-y-2">
          <FieldLabel htmlFor="data-exame" required tooltip="Data em que o exame foi coletado.">
            Data do exame
          </FieldLabel>
          <Input
            id="data-exame"
            type="date"
            value={dataExame}
            onChange={(e) => setDataExame(e.target.value)}
            className={fieldError(!!dataExame)}
          />
          {errorMsg(!!dataExame)}
        </div>

        {/* IG na data do exame */}
        <div className="space-y-2">
          <FieldLabel tooltip="Se a idade gestacional mudou desde a Consulta 1, atualize aqui. Caso contrário, deixe em branco — o sistema usa a IG calculada automaticamente.">
            IG na data do exame
          </FieldLabel>
          {igCalculada && (
            <p className="text-xs text-muted-foreground">
              IG calculada: {igCalculada.semanas}s {igCalculada.dias}d
            </p>
          )}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label className="text-xs text-muted-foreground">Semanas</Label>
              <Input
                type="number"
                min="0"
                max="42"
                value={igSemanas}
                onChange={(e) => setIgSemanas(e.target.value)}
                placeholder={igCalculada ? String(igCalculada.semanas) : '—'}
              />
            </div>
            <div className="space-y-1">
              <Label className="text-xs text-muted-foreground">Dias</Label>
              <Input
                type="number"
                min="0"
                max="6"
                value={igDias}
                onChange={(e) => setIgDias(e.target.value)}
                placeholder={igCalculada ? String(igCalculada.dias) : '0'}
              />
            </div>
          </div>
        </div>

        {/* Buttons */}
        <div className="flex flex-col-reverse gap-3 pt-2 sm:flex-row sm:justify-end">
          <Button type="button" variant="outline" onClick={onCancel}>
            Cancelar
          </Button>
          <Button
            type="submit"
            disabled={saving}
            className="bg-[#9b87f5] hover:bg-[#7E69AB] text-white"
          >
            {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Salvar resultado
          </Button>
        </div>
      </form>
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
        {children} {required && <span className="text-destructive">*</span>}
      </Label>
      <Tooltip>
        <TooltipTrigger asChild>
          <Info className="h-3.5 w-3.5 text-muted-foreground cursor-help" />
        </TooltipTrigger>
        <TooltipContent className="max-w-xs">{tooltip}</TooltipContent>
      </Tooltip>
    </div>
  );
}
