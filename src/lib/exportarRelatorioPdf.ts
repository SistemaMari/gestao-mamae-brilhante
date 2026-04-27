import html2canvas from 'html2canvas';
import jsPDF from 'jspdf';
import { supabase } from '@/integrations/supabase/client';

interface ExportarParams {
  elementId: string;
  unidadeId: string;
  gestorId: string;
  periodoInicio: string; // YYYY-MM-DD
  periodoFim: string;
  metricasResumo: Record<string, unknown>;
  filename?: string;
}

export async function exportarRelatorioPdf({
  elementId,
  unidadeId,
  gestorId,
  periodoInicio,
  periodoFim,
  metricasResumo,
  filename = 'relatorio-gestao.pdf',
}: ExportarParams): Promise<{ ok: boolean; error?: string }> {
  const el = document.getElementById(elementId);
  if (!el) return { ok: false, error: 'Elemento não encontrado' };

  // Render canvas
  const canvas = await html2canvas(el, {
    scale: 2,
    backgroundColor: '#ffffff',
    useCORS: true,
    logging: false,
  });

  const imgData = canvas.toDataURL('image/png');
  const pdf = new jsPDF({ orientation: 'portrait', unit: 'pt', format: 'a4' });
  const pageWidth = pdf.internal.pageSize.getWidth();
  const pageHeight = pdf.internal.pageSize.getHeight();
  const ratio = canvas.width / pageWidth;
  const imgHeight = canvas.height / ratio;

  let y = 0;
  let remaining = imgHeight;
  while (remaining > 0) {
    pdf.addImage(imgData, 'PNG', 0, y === 0 ? 0 : -y, pageWidth, imgHeight);
    remaining -= pageHeight;
    y += pageHeight;
    if (remaining > 0) pdf.addPage();
  }

  const blob = pdf.output('blob');

  // Download local
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);

  // Salvar via edge function
  try {
    const fd = new FormData();
    fd.append('pdf_file', blob, filename);
    fd.append('unidade_id', unidadeId);
    fd.append('gestor_id', gestorId);
    fd.append('periodo_inicio', periodoInicio);
    fd.append('periodo_fim', periodoFim);
    fd.append('metricas_resumo', JSON.stringify(metricasResumo));

    const { error } = await supabase.functions.invoke('salvar-relatorio', { body: fd });
    if (error) return { ok: false, error: error.message };
    return { ok: true };
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : 'Falha ao salvar relatório';
    return { ok: false, error: msg };
  }
}
