/**
 * Utilitários de data timezone-safe.
 *
 * PROBLEMA: `new Date('2025-10-01')` é interpretado como UTC meia-noite.
 * Em fusos negativos (BRT = UTC-3) isso vira 30/09 21:00 → perde 1 dia
 * ao formatar/exibir/salvar.
 *
 * SOLUÇÃO: Sempre tratar datas puras (YYYY-MM-DD) como datas locais.
 */

/**
 * Converte uma string 'YYYY-MM-DD' (vinda do Supabase ou input type="date")
 * em um objeto Date no fuso LOCAL (meia-noite local), evitando o shift UTC.
 *
 * Aceita também strings ISO completas — nesse caso retorna new Date normal.
 */
export function parseDateLocal(value: string | Date | null | undefined): Date | null {
  if (!value) return null;
  if (value instanceof Date) return value;

  // Match estrito YYYY-MM-DD (com possível 'T...' ignorado nas 10 primeiras chars)
  const match = /^(\d{4})-(\d{2})-(\d{2})/.exec(value);
  if (match) {
    const [, y, m, d] = match;
    return new Date(Number(y), Number(m) - 1, Number(d));
  }

  return new Date(value);
}

/**
 * Retorna a data de HOJE como string 'YYYY-MM-DD' no fuso LOCAL.
 * Substitui `new Date().toISOString().slice(0,10)` que pode pular 1 dia
 * à noite (depois das 21h em BRT).
 */
export function todayLocalISO(): string {
  return formatDateISO(new Date());
}

/**
 * Formata um Date como 'YYYY-MM-DD' usando componentes LOCAIS
 * (não UTC). Use sempre que for enviar datas puras ao Supabase.
 */
export function formatDateISO(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

/**
 * Formata uma data (Date ou 'YYYY-MM-DD') como 'dd/MM/yyyy' pt-BR
 * sem qualquer conversão de timezone.
 */
export function formatDateBR(value: string | Date | null | undefined): string {
  const d = parseDateLocal(value);
  if (!d) return '';
  const day = String(d.getDate()).padStart(2, '0');
  const month = String(d.getMonth() + 1).padStart(2, '0');
  return `${day}/${month}/${d.getFullYear()}`;
}

/**
 * Valida que uma string 'YYYY-MM-DD' representa uma data real do calendário
 * (sem rollover do JS). Bloqueia entradas como '2026-02-30', '2026-04-31',
 * '2026-11-31'. String vazia ou null é considerada "ainda não preenchida"
 * — não é inválida (o caller decide se é obrigatória).
 *
 * Retorna { valida: true } quando OK ou { valida: false, motivo } quando ruim.
 */
export function validarDataClinica(
  value: string | null | undefined,
): { valida: true } | { valida: false; motivo: string } {
  if (value == null || value === '') return { valida: true }; // vazio = aceito
  // Aceita só o formato YYYY-MM-DD (igual ao type="date" do HTML)
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  if (!match) return { valida: false, motivo: 'Formato inválido (use AAAA-MM-DD).' };
  const [, ys, ms, ds] = match;
  const y = Number(ys);
  const m = Number(ms);
  const d = Number(ds);
  if (y < 1900 || y > 2100) return { valida: false, motivo: 'Ano fora da faixa esperada.' };
  if (m < 1 || m > 12) return { valida: false, motivo: 'Mês deve ser entre 01 e 12.' };
  if (d < 1 || d > 31) return { valida: false, motivo: 'Dia deve ser entre 01 e 31.' };
  // Detecta rollover (ex.: 30/02 → 02/03)
  const obj = new Date(y, m - 1, d);
  if (
    obj.getFullYear() !== y ||
    obj.getMonth() !== m - 1 ||
    obj.getDate() !== d
  ) {
    return { valida: false, motivo: 'Data inválida. Verifique dia e mês.' };
  }
  return { valida: true };
}
