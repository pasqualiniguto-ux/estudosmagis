import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Progress } from '@/components/ui/progress';
import { Checkbox } from '@/components/ui/checkbox';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { toast } from '@/hooks/use-toast';
import { toDateStr, todayStr } from '@/lib/dateUtils';
import { Scale, Plus, Trash2, Play, Pause, Upload, Loader2, Check } from 'lucide-react';

interface LawReadingItem {
  id: string;
  date: string;
  law: string;
  articles: string;
  plannedMinutes: number;
  readSeconds: number;
  done: boolean;
  sortOrder: number;
}

const DAY_LABELS = ['Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb', 'Dom'];

function fmt(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  if (m >= 60) {
    const h = Math.floor(m / 60);
    return `${h}h${String(m % 60).padStart(2, '0')}`;
  }
  return `${m}:${String(s).padStart(2, '0')}`;
}

function isPdf(file: File) {
  return file.type === 'application/pdf' || file.name.toLowerCase().endsWith('.pdf');
}

function fileToDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(new Error('Não consegui ler o arquivo'));
    reader.readAsDataURL(file);
  });
}

export default function LawReading({ weekDates }: { weekDates: Date[] }) {
  const today = todayStr();
  const initialDate = useMemo(() => {
    const match = weekDates.find(d => toDateStr(d) === today);
    return toDateStr(match ?? weekDates[0]);
  }, [weekDates, today]);

  const [selectedDate, setSelectedDate] = useState(initialDate);
  const [items, setItems] = useState<LawReadingItem[]>([]);
  const [adding, setAdding] = useState(false);
  const [newLaw, setNewLaw] = useState('');
  const [newArticles, setNewArticles] = useState('');
  const [newMinutes, setNewMinutes] = useState(15);
  const [runningId, setRunningId] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => setSelectedDate(initialDate), [initialDate]);

  const load = useCallback(async () => {
    const dates = weekDates.map(toDateStr);
    const { data, error } = await supabase
      .from('law_readings')
      .select('*')
      .in('date', dates)
      .order('sort_order', { ascending: true });
    if (error) return;
    setItems(
      (data ?? []).map(r => ({
        id: r.id,
        date: r.date,
        law: r.law,
        articles: r.articles,
        plannedMinutes: r.planned_minutes,
        readSeconds: r.read_seconds,
        done: r.done,
        sortOrder: r.sort_order,
      })),
    );
  }, [weekDates]);

  useEffect(() => { load(); }, [load]);

  // Local ticking timer, persisted every 15s and on stop
  useEffect(() => {
    if (!runningId) return;
    let acc = 0;
    const interval = setInterval(() => {
      acc++;
      setItems(prev => prev.map(i => (i.id === runningId ? { ...i, readSeconds: i.readSeconds + 1 } : i)));
      if (acc % 15 === 0) {
        const current = itemsRef.current.find(i => i.id === runningId);
        if (current) supabase.from('law_readings').update({ read_seconds: current.readSeconds }).eq('id', runningId);
      }
    }, 1000);
    return () => clearInterval(interval);
  }, [runningId]);

  const itemsRef = useRef(items);
  itemsRef.current = items;

  const stopTimer = async () => {
    if (!runningId) return;
    const current = itemsRef.current.find(i => i.id === runningId);
    setRunningId(null);
    if (current) await supabase.from('law_readings').update({ read_seconds: current.readSeconds }).eq('id', runningId);
  };

  const dayItems = items.filter(i => i.date === selectedDate);
  const totalPlanned = dayItems.reduce((s, i) => s + i.plannedMinutes, 0);
  const totalRead = dayItems.reduce((s, i) => s + i.readSeconds, 0);
  const pct = totalPlanned > 0 ? Math.min(100, (totalRead / (totalPlanned * 60)) * 100) : 0;

  const addItem = async () => {
    if (!newLaw.trim()) return;
    const { data: auth } = await supabase.auth.getUser();
    if (!auth.user) return;
    const { error } = await supabase.from('law_readings').insert({
      user_id: auth.user.id,
      date: selectedDate,
      law: newLaw.trim(),
      articles: newArticles.trim(),
      planned_minutes: Math.max(1, newMinutes),
      sort_order: dayItems.length,
    });
    if (error) { toast({ title: 'Erro ao adicionar', variant: 'destructive' }); return; }
    setAdding(false);
    setNewLaw(''); setNewArticles(''); setNewMinutes(15);
    load();
  };

  const toggleDone = async (item: LawReadingItem) => {
    setItems(prev => prev.map(i => (i.id === item.id ? { ...i, done: !i.done } : i)));
    await supabase.from('law_readings').update({ done: !item.done }).eq('id', item.id);
  };

  const removeItem = async (id: string) => {
    if (runningId === id) setRunningId(null);
    setItems(prev => prev.filter(i => i.id !== id));
    await supabase.from('law_readings').delete().eq('id', id);
  };

  const completePlanned = async (item: LawReadingItem) => {
    const seconds = item.plannedMinutes * 60;
    setItems(prev => prev.map(i => (i.id === item.id ? { ...i, readSeconds: seconds, done: true } : i)));
    await supabase.from('law_readings').update({ read_seconds: seconds, done: true }).eq('id', item.id);
  };

  const handleFile = async (file: File) => {
    setUploading(true);
    try {
      const text = await extractText(file);
      if (!text.trim()) throw new Error('Arquivo vazio');
      const { data, error } = await supabase.functions.invoke('parse-law-plan', { body: { text } });
      if (error) throw error;
      const parsed: { law: string; articles: string; plannedMinutes: number; day?: number | null }[] = data?.items ?? [];
      if (!parsed.length) { toast({ title: 'Nenhum item encontrado no roteiro', variant: 'destructive' }); return; }

      const { data: auth } = await supabase.auth.getUser();
      if (!auth.user) return;
      const start = new Date(`${selectedDate}T12:00:00`);
      const rows = parsed.map((p, idx) => {
        const dayIdx = (p.day ?? idx + 1) - 1;
        const d = new Date(start);
        d.setDate(start.getDate() + Math.max(0, dayIdx));
        return {
          user_id: auth.user!.id,
          date: toDateStr(d),
          law: p.law,
          articles: p.articles ?? '',
          planned_minutes: Math.max(1, Math.round(p.plannedMinutes || 15)),
          sort_order: idx,
        };
      });
      const { error: insErr } = await supabase.from('law_readings').insert(rows);
      if (insErr) throw insErr;
      toast({ title: `${rows.length} leituras importadas`, description: 'Distribuídas a partir do dia selecionado.' });
      load();
    } catch (e: any) {
      toast({ title: 'Não consegui importar o roteiro', description: e?.message ?? '', variant: 'destructive' });
    } finally {
      setUploading(false);
      if (fileRef.current) fileRef.current.value = '';
    }
  };

  return (
    <div className="mt-6 rounded-xl border border-border bg-card p-4">
      <div className="flex items-center justify-between gap-2 mb-3">
        <h2 className="flex items-center gap-2 text-sm font-semibold text-foreground">
          <Scale className="h-4 w-4 text-primary" /> Lei seca — leitura do dia
        </h2>
        <div className="flex items-center gap-1">
          <input
            ref={fileRef}
            type="file"
            accept=".txt,.md,.csv,.pdf"
            className="hidden"
            onChange={e => { const f = e.target.files?.[0]; if (f) handleFile(f); }}
          />
          <Button variant="ghost" size="sm" className="text-xs" disabled={uploading} onClick={() => fileRef.current?.click()}>
            {uploading ? <Loader2 className="h-3.5 w-3.5 mr-1 animate-spin" /> : <Upload className="h-3.5 w-3.5 mr-1" />}
            Roteiro
          </Button>
          <Button variant="ghost" size="sm" className="text-xs" onClick={() => setAdding(true)}>
            <Plus className="h-3.5 w-3.5 mr-1" /> Adicionar
          </Button>
        </div>
      </div>

      {/* Day selector */}
      <div className="flex gap-1 overflow-x-auto pb-2">
        {weekDates.map((d, i) => {
          const ds = toDateStr(d);
          const count = items.filter(it => it.date === ds).length;
          const active = ds === selectedDate;
          return (
            <button
              key={ds}
              onClick={() => setSelectedDate(ds)}
              className={`shrink-0 rounded-lg px-2.5 py-1.5 text-xs transition-colors ${
                active ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground hover:bg-accent'
              }`}
            >
              {DAY_LABELS[i]} {String(d.getDate()).padStart(2, '0')}
              {count > 0 && <span className="ml-1 opacity-80">({count})</span>}
            </button>
          );
        })}
      </div>

      {totalPlanned > 0 && (
        <div className="mt-2 mb-3">
          <div className="flex justify-between text-xs text-muted-foreground mb-1">
            <span>{fmt(totalRead)} lidos</span>
            <span>{totalPlanned}min previstos</span>
          </div>
          <Progress value={pct} className="h-1.5" />
        </div>
      )}

      {dayItems.length === 0 ? (
        <p className="py-4 text-center text-xs text-muted-foreground">
          Nenhuma leitura para este dia. Adicione manualmente ou importe um roteiro.
        </p>
      ) : (
        <ul className="space-y-2">
          {dayItems.map(item => (
            <li key={item.id} className="flex items-center gap-2 rounded-lg border border-border/60 bg-background px-3 py-2">
              <Checkbox checked={item.done} onCheckedChange={() => toggleDone(item)} />
              <div className="min-w-0 flex-1">
                <p className={`truncate text-sm font-medium ${item.done ? 'text-muted-foreground line-through' : 'text-foreground'}`}>
                  {item.law}
                </p>
                <p className="truncate text-xs text-muted-foreground">
                  {item.articles || 'Sem artigos definidos'} · {fmt(item.readSeconds)} / {item.plannedMinutes}min
                </p>
              </div>
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8 shrink-0"
                title={runningId === item.id ? 'Pausar leitura' : 'Cronometrar leitura'}
                onClick={() => (runningId === item.id ? stopTimer() : (stopTimer(), setRunningId(item.id)))}
              >
                {runningId === item.id ? <Pause className="h-4 w-4 text-primary" /> : <Play className="h-4 w-4" />}
              </Button>
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8 shrink-0"
                title={`Cumpri os ${item.plannedMinutes}min previstos`}
                onClick={() => completePlanned(item)}
              >
                <Check className="h-4 w-4" />
              </Button>
              <Button variant="ghost" size="icon" className="h-8 w-8 shrink-0 text-muted-foreground hover:text-destructive" onClick={() => removeItem(item.id)}>
                <Trash2 className="h-4 w-4" />
              </Button>
            </li>
          ))}
        </ul>
      )}

      <Dialog open={adding} onOpenChange={setAdding}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>Nova leitura de lei seca</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div>
              <Label className="text-xs">Lei</Label>
              <Input value={newLaw} onChange={e => setNewLaw(e.target.value)} placeholder="Ex: CF/88, Lei 8.112/90" />
            </div>
            <div>
              <Label className="text-xs">Artigos</Label>
              <Input value={newArticles} onChange={e => setNewArticles(e.target.value)} placeholder="Ex: arts. 5º ao 11" />
            </div>
            <div>
              <Label className="text-xs">Minutos previstos</Label>
              <Input type="number" min={1} value={newMinutes} onChange={e => setNewMinutes(Number(e.target.value))} />
            </div>
            <Button className="w-full" onClick={addItem} disabled={!newLaw.trim()}>Adicionar</Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
