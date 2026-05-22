import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Clock, Pencil, Plus, Trash2 } from 'lucide-react';

const STORAGE_KEY = 'fixed_time_slots_v1';

export interface FixedSlot {
  id: string;
  start: string; // "HH:MM"
  end: string;   // "HH:MM"
  label: string;
}

type SlotsMap = Record<number, FixedSlot[]>; // 0=Mon ... 6=Sun

function loadSlots(): SlotsMap {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return {};
    return JSON.parse(raw);
  } catch {
    return {};
  }
}

function saveSlots(s: SlotsMap) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(s));
}

function sortByStart(arr: FixedSlot[]): FixedSlot[] {
  return [...arr].sort((a, b) => a.start.localeCompare(b.start));
}

interface Props {
  dayOfWeek: number; // 0=Mon ... 6=Sun
}

export default function FixedTimeSlots({ dayOfWeek }: Props) {
  const [allSlots, setAllSlots] = useState<SlotsMap>({});
  const [editorOpen, setEditorOpen] = useState(false);
  const [editing, setEditing] = useState<FixedSlot | null>(null);
  const [start, setStart] = useState('08:00');
  const [end, setEnd] = useState('09:00');
  const [label, setLabel] = useState('');

  useEffect(() => {
    setAllSlots(loadSlots());
    const handler = () => setAllSlots(loadSlots());
    window.addEventListener('storage', handler);
    return () => window.removeEventListener('storage', handler);
  }, []);

  const slots = sortByStart(allSlots[dayOfWeek] || []);

  const persist = (next: SlotsMap) => {
    saveSlots(next);
    setAllSlots(next);
  };

  const openNew = () => {
    setEditing(null);
    setStart('08:00');
    setEnd('09:00');
    setLabel('');
    setEditorOpen(true);
  };

  const openEdit = (slot: FixedSlot) => {
    setEditing(slot);
    setStart(slot.start);
    setEnd(slot.end);
    setLabel(slot.label);
    setEditorOpen(true);
  };

  const save = () => {
    if (!start || !end) return;
    const list = allSlots[dayOfWeek] ? [...allSlots[dayOfWeek]] : [];
    if (editing) {
      const idx = list.findIndex(s => s.id === editing.id);
      if (idx >= 0) list[idx] = { ...editing, start, end, label: label.trim() };
    } else {
      list.push({
        id: `slot_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
        start,
        end,
        label: label.trim(),
      });
    }
    persist({ ...allSlots, [dayOfWeek]: list });
    setEditorOpen(false);
  };

  const remove = (id: string) => {
    const list = (allSlots[dayOfWeek] || []).filter(s => s.id !== id);
    persist({ ...allSlots, [dayOfWeek]: list });
  };

  return (
    <div className="mb-2 pb-2 border-b border-dashed border-border/60">
      <div className="flex items-center justify-between mb-1">
        <span className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wide flex items-center gap-1">
          <Clock className="h-3 w-3" /> Horários
        </span>
        <Button variant="ghost" size="icon" className="h-5 w-5 text-muted-foreground hover:text-primary" onClick={openNew} title="Adicionar horário">
          <Plus className="h-3 w-3" />
        </Button>
      </div>
      {slots.length === 0 ? (
        <p className="text-[9px] text-muted-foreground/70 italic">Nenhum horário fixo</p>
      ) : (
        <div className="space-y-0.5">
          {slots.map(slot => (
            <div key={slot.id} className="group flex items-center gap-1 text-[10px] bg-secondary/30 rounded px-1.5 py-0.5">
              <span className="font-mono text-foreground">{slot.start}–{slot.end}</span>
              {slot.label && <span className="truncate text-muted-foreground flex-1" title={slot.label}>{slot.label}</span>}
              {!slot.label && <span className="flex-1" />}
              <Button variant="ghost" size="icon" className="h-4 w-4 opacity-0 group-hover:opacity-100 text-muted-foreground hover:text-primary" onClick={() => openEdit(slot)}>
                <Pencil className="h-2.5 w-2.5" />
              </Button>
              <Button variant="ghost" size="icon" className="h-4 w-4 opacity-0 group-hover:opacity-100 text-muted-foreground hover:text-destructive" onClick={() => remove(slot.id)}>
                <Trash2 className="h-2.5 w-2.5" />
              </Button>
            </div>
          ))}
        </div>
      )}

      <Dialog open={editorOpen} onOpenChange={setEditorOpen}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>{editing ? 'Editar horário' : 'Novo horário fixo'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-3 py-2">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs text-muted-foreground mb-1 block">Início</label>
                <Input type="time" value={start} onChange={e => setStart(e.target.value)} />
              </div>
              <div>
                <label className="text-xs text-muted-foreground mb-1 block">Fim</label>
                <Input type="time" value={end} onChange={e => setEnd(e.target.value)} />
              </div>
            </div>
            <div>
              <label className="text-xs text-muted-foreground mb-1 block">Descrição (opcional)</label>
              <Input value={label} onChange={e => setLabel(e.target.value)} placeholder="Ex: Aula de inglês" />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditorOpen(false)}>Cancelar</Button>
            <Button onClick={save}>Salvar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
