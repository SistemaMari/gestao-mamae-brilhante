import { useMemo } from 'react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';

interface Props {
  fichas: { profissional_id: string; profissional_nome: string }[];
}

export default function PacientesPorProfissional({ fichas }: Props) {
  const counts = useMemo(() => {
    const map = new Map<string, { nome: string; count: number }>();
    fichas.forEach(f => {
      const cur = map.get(f.profissional_id);
      if (cur) cur.count += 1;
      else map.set(f.profissional_id, { nome: f.profissional_nome, count: 1 });
    });
    return Array.from(map.values()).sort((a, b) => b.count - a.count);
  }, [fichas]);

  return (
    <div className="rounded-xl border border-border bg-card p-5">
      <h2 className="mb-4 font-heading text-lg font-semibold text-foreground">Pacientes por profissional</h2>
      {counts.length === 0 ? (
        <p className="text-sm text-muted-foreground">Sem dados para o período selecionado.</p>
      ) : (
        <div className="overflow-hidden rounded-lg border border-border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Profissional</TableHead>
                <TableHead className="text-right">Pacientes</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {counts.map(c => (
                <TableRow key={c.nome}>
                  <TableCell className="font-medium">{c.nome}</TableCell>
                  <TableCell className="text-right">{c.count}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  );
}
