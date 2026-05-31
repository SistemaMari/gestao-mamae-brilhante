import { AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';

/**
 * Modal de recuperação de rascunho local (Prompt 34B seção 3.5).
 *
 * Aparece quando a reconciliação detecta um draft em localStorage MAIS RECENTE
 * que os dados do servidor. Não tem botão "X" / "Cancelar" — o usuário precisa
 * escolher uma das duas opções pra evitar estado ambíguo (seção 3.5.2).
 *
 * Diagramação (revista):
 *  - max-w-lg dá espaço suficiente pros 2 botões em desktop sem cortar texto.
 *  - Em mobile, botões empilham com o PRIMÁRIO em cima (mais visível);
 *    em sm+ ficam lado a lado com primário à direita (convenção web).
 *  - Padding generoso no header e footer.
 */

interface Props {
  open: boolean;
  /** ISO 8601 do savedAt do rascunho local. */
  draftTimestamp: string;
  onRecover: () => void;
  onDiscard: () => void;
}

function formatDataHora(iso: string): string {
  try {
    const d = new Date(iso);
    const dd = String(d.getDate()).padStart(2, '0');
    const mm = String(d.getMonth() + 1).padStart(2, '0');
    const yyyy = d.getFullYear();
    const hh = String(d.getHours()).padStart(2, '0');
    const mi = String(d.getMinutes()).padStart(2, '0');
    return `${dd}/${mm}/${yyyy} às ${hh}:${mi}`;
  } catch {
    return iso;
  }
}

export default function DraftRecoveryModal({
  open,
  draftTimestamp,
  onRecover,
  onDiscard,
}: Props) {
  // O AlertDialog do shadcn é controlado: omitimos onOpenChange para impedir
  // fechamento por clique fora / ESC. Só sai via clique nos botões.
  return (
    <AlertDialog open={open}>
      <AlertDialogContent className="max-w-lg sm:max-w-xl">
        <AlertDialogHeader className="space-y-3">
          <AlertDialogTitle className="flex items-center gap-2.5 text-lg">
            <AlertCircle className="h-5 w-5 shrink-0 text-[#7C4DBA]" />
            Rascunho não salvo encontrado
          </AlertDialogTitle>
          <AlertDialogDescription className="text-sm leading-relaxed">
            Existe um rascunho desta ficha salvo localmente em{' '}
            <span className="font-semibold text-foreground">
              {formatDataHora(draftTimestamp)}
            </span>
            , que não foi enviado ao servidor.
            <br />
            Deseja recuperar ou descartar?
          </AlertDialogDescription>
        </AlertDialogHeader>

        {/* Botões: em mobile empilha com primário em cima (flex-col-reverse).
            Em sm+ fica lado a lado, primário à direita (convenção). */}
        <AlertDialogFooter className="mt-2 flex-col-reverse gap-2 sm:flex-row sm:justify-end sm:gap-3">
          <Button
            variant="outline"
            onClick={onDiscard}
            type="button"
            className="w-full sm:w-auto"
          >
            Descartar e usar dados do servidor
          </Button>
          <AlertDialogAction
            onClick={onRecover}
            className="w-full bg-[#7C4DBA] text-white hover:bg-[#7E69AB] sm:w-auto"
          >
            Recuperar rascunho
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
