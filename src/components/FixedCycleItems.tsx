import { useState } from 'react';
import { Checkbox } from '@/components/ui/checkbox';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogTrigger,
} from '@/components/ui/dialog';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { Pin, Check, Plus, Pencil, Trash2 } from 'lucide-react';
import { todayStr as getTodayStr } from '@/lib/dateUtils';

interface FixedItem {
  key: string;
  name: string;
  color: string;
}

const DEFAULT_ITEMS: FixedItem[] = [
  { key: 'flashcards', name: 'Flashcards', color: 'hsl(var(--primary))' },
  { key: 'lei_seca', name: 'Lei Seca', color: 'hsl(var(--accent))' },
];

const STORAGE_KEY = 'fixed_cycle_checks_v1';
const ITEMS_KEY = 'fixed_cycle_items_v1';

const PALETTE = [
  'hsl(var(--primary))',
  'hsl(var(--accent))',
  '#ef4444', '#f97316', '#eab308', '#22c55e',
  '#06b6d4', '#3b82f6', '#8b5cf6', '#ec4899',
];

type ChecksMap = Record<string, Record<string, boolean>>;

function loadChecks(): ChecksMap {
  try { return JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}'); } catch { return {}; }
}
function saveChecks(c: ChecksMap) { localStorage.setItem(STORAGE_KEY, JSON.stringify(c)); }

function loadItems(): FixedItem[] {
  try {
    const raw = localStorage.getItem(ITEMS_KEY);
    if (!raw) return DEFAULT_ITEMS;
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed) && parsed.length >= 0) return parsed;
    return DEFAULT_ITEMS;
  } catch { return DEFAULT_ITEMS; }
}
function saveItems(items: FixedItem[]) { localStorage.setItem(ITEMS_KEY, JSON.stringify(items)); }

export default function FixedCycleItems() {
  const today = getTodayStr();
  const [checks, setChecks] = useState<ChecksMap>(() => loadChecks());
  const [items, setItems] = useState<FixedItem[]>(() => loadItems());
  const [editorOpen, setEditorOpen] = useState(false);
  const [editing, setEditing] = useState<FixedItem | null>(null);
  const [draftName, setDraftName] = useState('');
  const [draftColor, setDraftColor] = useState(PALETTE[0]);

  const todayChecks = checks[today] || {};

  const toggle = (key: string) => {
    setChecks(prev => {
      const next = { ...prev };
      const day = { ...(next[today] || {}) };
      day[key] = !day[key];
      next[today] = day;
      saveChecks(next);
      return next;
    });
  };

  const openNew = () => {
    setEditing(null);
    setDraftName('');
    setDraftColor(PALETTE[0]);
    setEditorOpen(true);
  };

  const openEdit = (item: FixedItem) => {
    setEditing(item);
    setDraftName(item.name);
    setDraftColor(item.color);
    setEditorOpen(true);
  };

  const saveItem = () => {
    const name = draftName.trim();
    if (!name) return;
    setItems(prev => {
      let next: FixedItem[];
      if (editing) {
        next = prev.map(i => i.key === editing.key ? { ...i, name, color: draftColor } : i);
      } else {
        const key = `custom_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
        next = [...prev, { key, name, color: draftColor }];
      }
      saveItems(next);
      return next;
    });
    setEditorOpen(false);
  };

  const deleteItem = (key: string) => {
    setItems(prev => {
      const next = prev.filter(i => i.key !== key);
      saveItems(next);
      return next;
    });
    // Also clear any stored checks for this item
    setChecks(prev => {
      const next: ChecksMap = {};
      for (const [date, dayMap] of Object.entries(prev)) {
        const { [key]: _, ...rest } = dayMap;
        next[date] = rest;
      }
      saveChecks(next);
      return next;
    });
  };

  return (
    <div className="space-y-2 mb-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2 text-xs text-muted-foreground uppercase tracking-wider">
          <Pin className="h-3 w-3" /> Fixos diariamente
        </div>
        <Button size="sm" variant="ghost" className="h-7 px-2 text-xs" onClick={openNew}>
          <Plus className="h-3.5 w-3.5 mr-1" /> Adicionar
        </Button>
      </div>

      {items.length === 0 && (
        <p className="text-xs text-muted-foreground italic px-1">
          Nenhum item fixo. Clique em "Adicionar" para criar um.
        </p>
      )}

      {items.map(item => {
        const done = !!todayChecks[item.key];
        return (
          <div
            key={item.key}
            className={`group flex items-center gap-3 p-3 rounded-xl border bg-card border-dashed transition-colors ${done ? 'bg-primary/5' : 'hover:bg-muted/30'}`}
            style={{ borderLeft: `6px solid ${item.color}` }}
          >
            <Checkbox
              id={`fixed-${item.key}`}
              checked={done}
              onCheckedChange={() => toggle(item.key)}
            />
            <label htmlFor={`fixed-${item.key}`} className="flex-1 flex items-center gap-2 cursor-pointer">
              <Pin className="h-3.5 w-3.5 text-muted-foreground" />
              <span className={`font-medium ${done ? 'line-through text-muted-foreground' : 'text-foreground'}`}>
                {item.name}
              </span>
              <span className="text-[10px] font-medium text-muted-foreground bg-muted px-2 py-0.5 rounded-full">
                Fixo
              </span>
            </label>
            {done && (
              <span className="hidden sm:flex items-center gap-1 text-xs text-primary font-medium">
                <Check className="h-3.5 w-3.5" /> Cumprido
              </span>
            )}
            <div className="flex items-center gap-1 opacity-60 group-hover:opacity-100 transition-opacity">
              <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => openEdit(item)}>
                <Pencil className="h-3.5 w-3.5" />
              </Button>
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button size="icon" variant="ghost" className="h-7 w-7 text-destructive hover:text-destructive">
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Excluir "{item.name}"?</AlertDialogTitle>
                    <AlertDialogDescription>
                      Este item fixo será removido junto com seu histórico de marcações.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Cancelar</AlertDialogCancel>
                    <AlertDialogAction onClick={() => deleteItem(item.key)}>
                      Excluir
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            </div>
          </div>
        );
      })}

      <Dialog open={editorOpen} onOpenChange={setEditorOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editing ? 'Editar item fixo' : 'Novo item fixo'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Nome</label>
              <Input
                value={draftName}
                onChange={(e) => setDraftName(e.target.value)}
                placeholder="Ex: Revisão, Leitura, Resumo..."
                autoFocus
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Cor</label>
              <div className="flex flex-wrap gap-2">
                {PALETTE.map(c => (
                  <button
                    key={c}
                    type="button"
                    onClick={() => setDraftColor(c)}
                    className={`h-8 w-8 rounded-full border-2 transition-transform ${draftColor === c ? 'border-foreground scale-110' : 'border-transparent'}`}
                    style={{ backgroundColor: c }}
                    aria-label={`Cor ${c}`}
                  />
                ))}
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditorOpen(false)}>Cancelar</Button>
            <Button onClick={saveItem} disabled={!draftName.trim()}>
              {editing ? 'Salvar' : 'Adicionar'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
