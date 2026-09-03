import { useCallback, useEffect, useRef, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Progress } from '@/components/ui/progress';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { toast } from '@/hooks/use-toast';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';

import { Scale, Plus, Trash2, Play, Pause, Upload, Loader2, Circle, CircleDashed, CheckCircle2, ChevronDown, ChevronRight } from 'lucide-react';

type ReadingStatus = 'pending' | 'partial' | 'done';

interface LawReadingItem {
  id: string;
  law: string;
  articles: string;
  plannedMinutes: number;
  readSeconds: number;
  status: ReadingStatus;
  sortOrder: number;
}

const STATUS_META: Record<ReadingStatus, { label: string; icon: typeof Circle; className: string }> = {
  pending: { label: 'Pendente', icon: Circle, className: 'text-muted-foreground' },
  partial: { label: 'Parcial', icon: CircleDashed, className: 'text-amber-500' },
  done: { label: 'Concluída', icon: CheckCircle2, className: 'text-primary' },
};

const NEXT_STATUS: Record<ReadingStatus, ReadingStatus> = {
  pending: 'partial',
  partial: 'done',
  done: 'pending',
};

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

export default function LawReading() {
  const [items, setItems] = useState<LawReadingItem[]>([]);
  const [adding, setAdding] = useState(false);
  const [newLaw, setNewLaw] = useState('');
  const [newArticles, setNewArticles] = useState('');
  const [newMinutes, setNewMinutes] = useState(15);
  const [runningId, setRunningId] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [editItem, setEditItem] = useState<LawReadingItem | null>(null);
  const [editLaw, setEditLaw] = useState('');
  const [editArticles, setEditArticles] = useState('');
  const [editMinutes, setEditMinutes] = useState(15);
  const fileRef = useRef<HTMLInputElement>(null);
  const [confirmClear, setConfirmClear] = useState(false);
  const [importMinutes, setImportMinutes] = useState(15);
  const [collapsed, setCollapsed] = useState(false);

  const load = useCallback(async () => {
    const { data, error } = await supabase
      .from('law_readings')
      .select('*')
      .order('sort_order', { ascending: true })
      .order('created_at', { ascending: true });
    if (error) return;
    setItems(
      (data ?? []).map(r => ({
        id: r.id,
        law: r.law,
        articles: r.articles,
        plannedMinutes: r.planned_minutes,
        readSeconds: r.read_seconds,
        status: (r.status as ReadingStatus) ?? 'pending',
        sortOrder: r.sort_order,
      })),
    );
  }, []);

  useEffect(() => { load(); }, [load]);

  const itemsRef = useRef(items);
  itemsRef.current = items;

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

  const stopTimer = async () => {
    if (!runningId) return;
    const current = itemsRef.current.find(i => i.id === runningId);
    setRunningId(null);
    if (current) await supabase.from('law_readings').update({ read_seconds: current.readSeconds }).eq('id', runningId);
  };

  const totalPlanned = items.reduce((s, i) => s + i.plannedMinutes, 0);
  const doneCount = items.filter(i => i.status === 'done').length;
  const partialCount = items.filter(i => i.status === 'partial').length;
  const pct = items.length > 0 ? ((doneCount + partialCount * 0.5) / items.length) * 100 : 0;

  const addItem = async () => {
    if (!newLaw.trim()) return;
    const { data: auth } = await supabase.auth.getUser();
    if (!auth.user) return;
    const { error } = await supabase.from('law_readings').insert({
      user_id: auth.user.id,
      date: '',
      law: newLaw.trim(),
      articles: newArticles.trim(),
      planned_minutes: Math.max(1, newMinutes),
      sort_order: items.length,
    });
    if (error) { toast({ title: 'Erro ao adicionar', variant: 'destructive' }); return; }
    setAdding(false);
    setNewLaw(''); setNewArticles(''); setNewMinutes(15);
    load();
  };

  const setStatus = async (item: LawReadingItem, status: ReadingStatus) => {
    setItems(prev => prev.map(i => (i.id === item.id ? { ...i, status } : i)));
    const { error } = await supabase
      .from('law_readings')
      .update({ status, done: status === 'done' })
      .eq('id', item.id);
    if (error) { toast({ title: 'Erro ao atualizar', variant: 'destructive' }); load(); }
  };

  const removeItem = async (id: string) => {
    if (runningId === id) setRunningId(null);
    setItems(prev => prev.filter(i => i.id !== id));
    await supabase.from('law_readings').delete().eq('id', id);
  };

  const clearAll = async () => {
    const count = items.length;
    setRunningId(null);
    setConfirmClear(false);
    const { data: auth } = await supabase.auth.getUser();
    if (!auth.user) { toast({ title: 'Sessão expirada', variant: 'destructive' }); return; }
    setItems([]);
    const { error } = await supabase.from('law_readings').delete().eq('user_id', auth.user.id);
    if (error) {
      toast({ title: 'Erro ao limpar', description: error.message, variant: 'destructive' });
      load();
    } else {
      toast({ title: 'Metas removidas', description: `${count} leituras apagadas.` });
    }
  };

  const openEdit = (item: LawReadingItem) => {
    setEditItem(item);
    setEditLaw(item.law);
    setEditArticles(item.articles);
    setEditMinutes(item.plannedMinutes);
  };

  const saveEdit = async () => {
    if (!editItem) return;
    const minutes = Math.max(1, Math.round(editMinutes || 1));
    const law = editLaw.trim() || editItem.law;
    const articles = editArticles.trim();
    setItems(prev =>
      prev.map(i => (i.id === editItem.id ? { ...i, law, articles, plannedMinutes: minutes } : i)),
    );
    setEditItem(null);
    const { error } = await supabase
      .from('law_readings')
      .update({ law, articles, planned_minutes: minutes })
      .eq('id', editItem.id);
    if (error) { toast({ title: 'Erro ao salvar', variant: 'destructive' }); load(); }
  };

  const handleFile = async (file: File) => {
    setUploading(true);
    try {
      let body: Record<string, unknown>;
      if (isPdf(file)) {
        const dataUrl = await fileToDataUrl(file);
        if (!dataUrl.includes(',') || dataUrl.split(',')[1].length < 100) throw new Error('PDF vazio ou ilegível');
        body = { pdf: dataUrl, filename: file.name };
      } else {
        const text = await file.text();
        if (!text.trim()) throw new Error('Arquivo vazio');
        body = { text };
      }
      const { data, error } = await supabase.functions.invoke('parse-law-plan', { body });
      if (error) {
        let detail = '';
        try { detail = ((await (error as any).context?.json?.()) ?? {})?.error ?? ''; } catch { /* ignore */ }
        throw new Error(detail || error.message);
      }
      const parsed: { law: string; articles: string; plannedMinutes: number }[] = data?.items ?? [];
      if (!parsed.length) { toast({ title: 'Nenhum item encontrado no roteiro', variant: 'destructive' }); return; }

      const { data: auth } = await supabase.auth.getUser();
      if (!auth.user) return;
      const minutes = Math.max(1, Math.round(importMinutes || 15));
      const rows = parsed.map((p, idx) => ({
        user_id: auth.user!.id,
        date: '',
        law: p.law,
        articles: p.articles ?? '',
        planned_minutes: minutes,
        sort_order: items.length + idx,
      }));
      const { error: insErr } = await supabase.from('law_readings').insert(rows);
      if (insErr) throw insErr;
      toast({ title: `${rows.length} metas importadas` });
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
      <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
        <button
          type="button"
          onClick={() => setCollapsed(c => !c)}
          className="flex items-center gap-1.5 text-sm font-semibold text-foreground hover:opacity-80"
          title={collapsed ? 'Expandir' : 'Recolher'}
        >
          {collapsed ? <ChevronRight className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
          <Scale className="h-4 w-4 text-primary" /> Lei seca — metas de leitura
          {items.length > 0 && (
            <span className="ml-1 rounded-full bg-muted px-1.5 py-0.5 text-[10px] font-medium text-muted-foreground">
              {doneCount}/{items.length}
            </span>
          )}
        </button>
        <div className="flex flex-wrap items-center gap-1">
          <input
            ref={fileRef}
            type="file"
            accept=".txt,.md,.csv,.pdf"
            className="hidden"
            onChange={e => { const f = e.target.files?.[0]; if (f) handleFile(f); }}
          />
          <div className="flex items-center gap-1">
            <input
              type="number"
              min={1}
              value={importMinutes}
              onChange={e => setImportMinutes(Number(e.target.value))}
              title="Minutos previstos por meta (usado na importação)"
              className="h-8 w-14 rounded-md border border-border bg-background px-1.5 text-xs"
            />
            <span className="text-xs text-muted-foreground">min/meta</span>
          </div>
          <Button variant="ghost" size="sm" className="text-xs" disabled={uploading} onClick={() => fileRef.current?.click()}>
            {uploading ? <Loader2 className="h-3.5 w-3.5 mr-1 animate-spin" /> : <Upload className="h-3.5 w-3.5 mr-1" />}
            Roteiro
          </Button>
          <Button variant="ghost" size="sm" className="text-xs" onClick={() => setAdding(true)}>
            <Plus className="h-3.5 w-3.5 mr-1" /> Adicionar
          </Button>
          <Button
            variant="ghost"
            size="sm"
            className="text-xs text-muted-foreground hover:text-destructive"
            disabled={items.length === 0}
            onClick={() => setConfirmClear(true)}
          >
            <Trash2 className="h-3.5 w-3.5 mr-1" /> Limpar tudo
          </Button>
        </div>
      </div>

      {!collapsed && items.length > 0 && (
        <div className="mb-3">
          <div className="flex justify-between text-xs text-muted-foreground mb-1">
            <span>{doneCount} concluídas · {partialCount} parciais · {items.length} metas</span>
            <span>{totalPlanned}min previstos</span>
          </div>
          <Progress value={pct} className="h-1.5" />
        </div>
      )}

      {!collapsed && (
        items.length === 0 ? (
          <p className="py-4 text-center text-xs text-muted-foreground">
            Nenhuma meta de leitura. Adicione manualmente ou importe um roteiro.
          </p>
        ) : (
          <ul className="space-y-2">
            {items.map(item => {
              const meta = STATUS_META[item.status];
              const StatusIcon = meta.icon;
              return (
                <li key={item.id} className="flex items-center gap-2 rounded-lg border border-border/60 bg-background px-3 py-2">
                  <button
                    type="button"
                    title={`${meta.label} — toque para alternar`}
                    onClick={() => setStatus(item, NEXT_STATUS[item.status])}
                    className={`shrink-0 ${meta.className}`}
                  >
                    <StatusIcon className="h-5 w-5" />
                  </button>
                  <div className="min-w-0 flex-1">
                    <p className={`truncate text-sm font-medium ${item.status === 'done' ? 'text-muted-foreground line-through' : 'text-foreground'}`}>
                      {item.law}
                    </p>
                    <p className="truncate text-xs text-muted-foreground">
                      {item.articles || 'Sem artigos definidos'} · {meta.label} · {fmt(item.readSeconds)} /{' '}
                      <button
                        type="button"
                        className="underline decoration-dotted underline-offset-2 hover:text-foreground"
                        title="Alterar lei, artigos e tempo previsto"
                        onClick={() => openEdit(item)}
                      >
                        {item.plannedMinutes}min
                      </button>
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
                  <Button variant="ghost" size="icon" className="h-8 w-8 shrink-0 text-muted-foreground hover:text-destructive" onClick={() => removeItem(item.id)}>
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </li>
              );
            })}
          </ul>
        )
      )}

      <Dialog open={!!editItem} onOpenChange={o => !o && setEditItem(null)}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>Editar meta de leitura</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div>
              <Label className="text-xs">Lei</Label>
              <Input value={editLaw} onChange={e => setEditLaw(e.target.value)} />
            </div>
            <div>
              <Label className="text-xs">Artigos</Label>
              <Input value={editArticles} onChange={e => setEditArticles(e.target.value)} placeholder="Ex: arts. 5º ao 11" />
            </div>
            <div>
              <Label className="text-xs">Minutos previstos</Label>
              <Input type="number" min={1} value={editMinutes} onChange={e => setEditMinutes(Number(e.target.value))} />
            </div>
            <Button className="w-full" onClick={saveEdit}>Salvar</Button>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={adding} onOpenChange={setAdding}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>Nova meta de lei seca</DialogTitle>
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

      <AlertDialog open={confirmClear} onOpenChange={setConfirmClear}>
        <AlertDialogContent className="sm:max-w-sm">
          <AlertDialogHeader>
            <AlertDialogTitle>Limpar todas as metas?</AlertDialogTitle>
            <AlertDialogDescription>
              Isso vai apagar todas as {items.length} metas de leitura de lei seca. Não dá para desfazer.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction className="bg-destructive text-destructive-foreground hover:bg-destructive/90" onClick={clearAll}>
              Limpar tudo
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
