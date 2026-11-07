import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Clock } from 'lucide-react';

type Times = { start_time: string; break_start: string; break_end: string; end_time: string };
const EMPTY: Times = { start_time: '', break_start: '', break_end: '', end_time: '' };

export default function CycleEntryTimes({ entryId, subjectName }: { entryId: string; subjectName?: string }) {
  const [times, setTimes] = useState<Times>(EMPTY);
  const [draft, setDraft] = useState<Times>(EMPTY);
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    let active = true;
    supabase.from('cycle_entries').select('start_time, break_start, break_end, end_time').eq('id', entryId).maybeSingle()
      .then(({ data }) => {
        if (active && data) setTimes({
          start_time: data.start_time ?? '', break_start: data.break_start ?? '',
          break_end: data.break_end ?? '', end_time: data.end_time ?? '',
        });
      });
    return () => { active = false; };
  }, [entryId]);

  const hasAny = !!(times.start_time || times.break_start || times.break_end || times.end_time);

  const save = async () => {
    setSaving(true);
    const { error } = await supabase.from('cycle_entries').update({
      start_time: draft.start_time || null, break_start: draft.break_start || null,
      break_end: draft.break_end || null, end_time: draft.end_time || null,
    }).eq('id', entryId);
    setSaving(false);
    if (!error) { setTimes(draft); setOpen(false); }
  };

  return (
    <>
      <button type="button" onClick={() => { setDraft(times); setOpen(true); }}
        className="text-xs text-muted-foreground hover:text-primary flex items-center gap-1" title="Horários desta matéria">
        <Clock className="h-3 w-3" />
        {hasAny ? (
          <span>
            {times.start_time || '--:--'}
            {(times.break_start || times.break_end) && <> · intervalo {times.break_start || '--:--'}–{times.break_end || '--:--'}</>}
            {' · fim '}{times.end_time || '--:--'}
          </span>
        ) : <span>+ horários</span>}
      </button>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-xs">
          <DialogHeader><DialogTitle>Horários {subjectName ? `— ${subjectName}` : ''}</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div><Label className="text-xs">Início do estudo</Label>
              <Input type="time" value={draft.start_time} onChange={e => setDraft({ ...draft, start_time: e.target.value })} /></div>
            <div className="grid grid-cols-2 gap-2">
              <div><Label className="text-xs">Início do intervalo</Label>
                <Input type="time" value={draft.break_start} onChange={e => setDraft({ ...draft, break_start: e.target.value })} /></div>
              <div><Label className="text-xs">Fim do intervalo</Label>
                <Input type="time" value={draft.break_end} onChange={e => setDraft({ ...draft, break_end: e.target.value })} /></div>
            </div>
            <div><Label className="text-xs">Fim do estudo</Label>
              <Input type="time" value={draft.end_time} onChange={e => setDraft({ ...draft, end_time: e.target.value })} /></div>
          </div>
          <div className="flex justify-between gap-2 pt-1">
            <Button variant="ghost" size="sm" onClick={() => setDraft(EMPTY)}>Limpar</Button>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" onClick={() => setOpen(false)}>Cancelar</Button>
              <Button size="sm" onClick={save} disabled={saving}>Salvar</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
