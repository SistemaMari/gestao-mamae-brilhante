import { useEffect, useMemo, useState } from "react";
import { format, subDays, startOfYear } from "date-fns";
import type { DateRange } from "react-day-picker";
import { Calendar as CalendarIcon, Check, ChevronsUpDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

export interface UnidadeOpt {
  id: string;
  nome: string;
}

export type PresetPeriodo = "7d" | "30d" | "90d" | "12m" | "ano" | "custom";

export interface FiltrosState {
  unidades: string[]; // ids selecionados; [] = todas
  preset: PresetPeriodo;
  dataInicio: string; // YYYY-MM-DD
  dataFim: string;
}

const HOJE = () => new Date();

export function calcularPeriodo(preset: PresetPeriodo, custom?: DateRange): { inicio: string; fim: string } {
  const fim = HOJE();
  let inicio = subDays(fim, 30);
  switch (preset) {
    case "7d":
      inicio = subDays(fim, 7);
      break;
    case "30d":
      inicio = subDays(fim, 30);
      break;
    case "90d":
      inicio = subDays(fim, 90);
      break;
    case "12m":
      inicio = subDays(fim, 365);
      break;
    case "ano":
      inicio = startOfYear(fim);
      break;
    case "custom":
      if (custom?.from && custom?.to) {
        return {
          inicio: format(custom.from, "yyyy-MM-dd"),
          fim: format(custom.to, "yyyy-MM-dd"),
        };
      }
      break;
  }
  return { inicio: format(inicio, "yyyy-MM-dd"), fim: format(fim, "yyyy-MM-dd") };
}

interface Props {
  unidadesDisponiveis: UnidadeOpt[];
  valor: FiltrosState;
  onAplicar: (next: FiltrosState) => void;
}

export default function FiltrosGlobais({ unidadesDisponiveis, valor, onAplicar }: Props) {
  const [draft, setDraft] = useState<FiltrosState>(valor);
  const [custom, setCustom] = useState<DateRange | undefined>(
    valor.preset === "custom"
      ? { from: new Date(valor.dataInicio), to: new Date(valor.dataFim) }
      : undefined,
  );
  const [openUnidades, setOpenUnidades] = useState(false);

  useEffect(() => {
    setDraft(valor);
  }, [valor]);

  const todasIds = useMemo(() => unidadesDisponiveis.map((u) => u.id), [unidadesDisponiveis]);
  const todasSelecionadas = draft.unidades.length === 0 || draft.unidades.length === todasIds.length;
  const labelUnidades = todasSelecionadas
    ? `Todas as unidades (${todasIds.length})`
    : `${draft.unidades.length} de ${todasIds.length} selecionadas`;

  const toggleUnidade = (id: string) => {
    const set = new Set(draft.unidades.length === 0 ? todasIds : draft.unidades);
    if (set.has(id)) set.delete(id);
    else set.add(id);
    const arr = Array.from(set);
    setDraft({ ...draft, unidades: arr.length === todasIds.length ? [] : arr });
  };

  const aplicar = () => {
    const periodo = calcularPeriodo(draft.preset, custom);
    onAplicar({ ...draft, dataInicio: periodo.inicio, dataFim: periodo.fim });
  };

  return (
    <div className="rounded-xl border border-border bg-white p-4 shadow-sm">
      <div className="flex flex-col gap-3 md:flex-row md:items-end md:gap-4">
        {/* Unidades */}
        <div className="flex-1 min-w-0">
          <label className="mb-1 block text-xs font-medium text-muted-foreground">
            Unidades
          </label>
          <Popover open={openUnidades} onOpenChange={setOpenUnidades}>
            <PopoverTrigger asChild>
              <Button
                variant="outline"
                role="combobox"
                className="w-full justify-between bg-white"
              >
                <span className="truncate">{labelUnidades}</span>
                <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-[320px] p-0" align="start">
              <Command>
                <CommandInput placeholder="Buscar unidade…" />
                <CommandList>
                  <CommandEmpty>Nenhuma unidade encontrada.</CommandEmpty>
                  <CommandGroup>
                    <CommandItem
                      onSelect={() =>
                        setDraft({
                          ...draft,
                          unidades: todasSelecionadas ? todasIds.slice(0, 0) : [],
                        })
                      }
                    >
                      <Checkbox
                        checked={todasSelecionadas}
                        className="mr-2"
                        aria-label="Selecionar todas"
                      />
                      <span className="font-medium">Selecionar todas</span>
                    </CommandItem>
                    {unidadesDisponiveis.map((u) => {
                      const checked =
                        draft.unidades.length === 0 || draft.unidades.includes(u.id);
                      return (
                        <CommandItem key={u.id} onSelect={() => toggleUnidade(u.id)}>
                          <Checkbox checked={checked} className="mr-2" />
                          <span className="truncate">{u.nome}</span>
                          {checked && <Check className="ml-auto h-4 w-4 opacity-60" />}
                        </CommandItem>
                      );
                    })}
                  </CommandGroup>
                </CommandList>
              </Command>
            </PopoverContent>
          </Popover>
        </div>

        {/* Preset */}
        <div className="w-full md:w-56">
          <label className="mb-1 block text-xs font-medium text-muted-foreground">Período</label>
          <Select
            value={draft.preset}
            onValueChange={(v) => setDraft({ ...draft, preset: v as PresetPeriodo })}
          >
            <SelectTrigger className="bg-white">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="7d">Últimos 7 dias</SelectItem>
              <SelectItem value="30d">Últimos 30 dias</SelectItem>
              <SelectItem value="90d">Últimos 90 dias</SelectItem>
              <SelectItem value="12m">Últimos 12 meses</SelectItem>
              <SelectItem value="ano">Ano corrente</SelectItem>
              <SelectItem value="custom">Personalizado</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Custom range */}
        {draft.preset === "custom" && (
          <div className="w-full md:w-72">
            <label className="mb-1 block text-xs font-medium text-muted-foreground">Intervalo</label>
            <Popover>
              <PopoverTrigger asChild>
                <Button variant="outline" className="w-full justify-start bg-white">
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {custom?.from && custom?.to
                    ? `${format(custom.from, "dd/MM/yy")} – ${format(custom.to, "dd/MM/yy")}`
                    : "Selecione"}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar
                  mode="range"
                  selected={custom}
                  onSelect={setCustom}
                  numberOfMonths={2}
                  initialFocus
                />
              </PopoverContent>
            </Popover>
          </div>
        )}

        <Button
          onClick={aplicar}
          className="bg-[#7E69AB] hover:bg-[#6B5896] text-white shrink-0"
        >
          Aplicar
        </Button>
      </div>

      {!todasSelecionadas && (
        <div className="mt-3 flex flex-wrap gap-1.5">
          {draft.unidades.map((id) => {
            const u = unidadesDisponiveis.find((x) => x.id === id);
            if (!u) return null;
            return (
              <Badge
                key={id}
                variant="secondary"
                className={cn("bg-[#F1F0FB] text-[#7E69AB] border-[#E8E0FF]")}
              >
                {u.nome}
              </Badge>
            );
          })}
        </div>
      )}
    </div>
  );
}
