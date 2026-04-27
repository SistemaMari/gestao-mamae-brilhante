import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.58.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

function jsonResponse(body: Record<string, unknown>, status: number) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }
  if (req.method !== 'POST') {
    return jsonResponse({ status: 'erro', mensagem: 'Método não permitido.' }, 405);
  }

  try {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return jsonResponse({ status: 'erro', mensagem: 'Não autorizado.' }, 401);
    }

    const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
    const ANON = Deno.env.get('SUPABASE_ANON_KEY')!;
    const SERVICE_ROLE = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

    // Cliente do usuário (para validar identidade)
    const userClient = createClient(SUPABASE_URL, ANON, {
      global: { headers: { Authorization: authHeader } },
    });

    const { data: userData, error: userErr } = await userClient.auth.getUser();
    if (userErr || !userData.user) {
      return jsonResponse({ status: 'erro', mensagem: 'Sessão inválida.' }, 401);
    }
    const callerId = userData.user.id;

    // Cliente service role para validações e mutações
    const admin = createClient(SUPABASE_URL, SERVICE_ROLE);

    // Parse multipart/form-data
    let form: FormData;
    try {
      form = await req.formData();
    } catch {
      return jsonResponse({ status: 'erro', mensagem: 'Body inválido (esperado multipart/form-data).' }, 400);
    }

    const pdfFile = form.get('pdf_file');
    const unidadeId = (form.get('unidade_id') as string | null)?.trim() ?? null;
    const gestorId = (form.get('gestor_id') as string | null)?.trim() ?? null;
    const periodoInicio = (form.get('periodo_inicio') as string | null)?.trim() ?? null;
    const periodoFim = (form.get('periodo_fim') as string | null)?.trim() ?? null;
    const metricasResumoRaw = form.get('metricas_resumo') as string | null;

    if (!pdfFile || !(pdfFile instanceof File)) {
      return jsonResponse({ status: 'erro', mensagem: 'PDF não recebido.' }, 400);
    }
    if (!unidadeId || !gestorId || !periodoInicio || !periodoFim) {
      return jsonResponse(
        { status: 'erro', mensagem: 'Parâmetros obrigatórios ausentes (unidade_id, gestor_id, periodo_inicio, periodo_fim).' },
        400,
      );
    }

    // Segurança extra: o gestor que está chamando precisa ser o gestor_id informado
    if (gestorId !== callerId) {
      return jsonResponse({ status: 'erro', mensagem: 'gestor_id não corresponde ao usuário autenticado.' }, 403);
    }

    // Validar que o gestor pertence à unidade e tem perfil 'gestor'
    const { data: prof, error: profErr } = await admin
      .from('profissionais')
      .select('id, unidade_id, perfil_institucional')
      .eq('user_id', gestorId)
      .maybeSingle();

    if (profErr) {
      console.error('Erro ao buscar profissional:', profErr);
      return jsonResponse({ status: 'erro', mensagem: 'Falha ao validar gestor.' }, 500);
    }

    if (!prof || prof.unidade_id !== unidadeId || prof.perfil_institucional !== 'gestor') {
      return jsonResponse({ status: 'erro', mensagem: 'Gestor não pertence a esta unidade.' }, 403);
    }

    // Path do arquivo: {unidade_id}/{ano-mes}/{timestamp}.pdf  (bucket = relatorios)
    const timestamp = Date.now();
    const anoMes = new Date().toISOString().slice(0, 7); // 'YYYY-MM'
    const path = `${unidadeId}/${anoMes}/${timestamp}.pdf`;

    // Upload
    const { error: uploadErr } = await admin.storage
      .from('relatorios')
      .upload(path, pdfFile, {
        contentType: 'application/pdf',
        upsert: false,
      });

    if (uploadErr) {
      console.error('Erro upload storage:', uploadErr);
      return jsonResponse({ status: 'erro', mensagem: 'Falha ao salvar arquivo.' }, 500);
    }

    const tamanho = pdfFile.size;

    // Parse das métricas — se inválido, salva como NULL
    let metricas: Record<string, unknown> | null = null;
    if (metricasResumoRaw) {
      try {
        const parsed = JSON.parse(metricasResumoRaw);
        if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
          metricas = parsed;
        }
      } catch {
        metricas = null;
      }
    }

    // Inserir registro
    const { data: inserted, error: dbErr } = await admin
      .from('relatorios_unidade')
      .insert({
        unidade_id: unidadeId,
        gestor_id: gestorId,
        periodo_inicio: periodoInicio,
        periodo_fim: periodoFim,
        tipo: 'dashboard_gestao',
        arquivo_path: path,
        arquivo_tamanho_bytes: tamanho,
        metricas_resumo: metricas,
      })
      .select('id')
      .single();

    if (dbErr) {
      console.error('Erro insert relatorios_unidade:', dbErr);
      // Limpeza: tenta deletar o arquivo do storage
      await admin.storage.from('relatorios').remove([path]).catch(() => {});
      return jsonResponse({ status: 'erro', mensagem: 'Falha ao registrar relatório.' }, 500);
    }

    return jsonResponse(
      {
        status: 'salvo',
        relatorio_id: inserted.id,
        arquivo_path: path,
      },
      200,
    );
  } catch (err) {
    console.error('salvar-relatorio erro inesperado:', err);
    const mensagem = err instanceof Error ? err.message : 'Erro interno.';
    return jsonResponse({ status: 'erro', mensagem }, 500);
  }
});
