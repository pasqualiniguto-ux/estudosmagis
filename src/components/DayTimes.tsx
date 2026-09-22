import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Clock } from 'lucide-react';

type Times = {
  start_time: string | null;
  break_start: string | null;
  break_end: string | null;
  end_time: string | null;
};

const EMPTY: Times = { start_time: '', break_start: '', break_end: '', end_time: '' };

export default function DayTimes({ dayOfWeek, dayLabel }: { dayOfWeek: number; dayLabel?: string }) {
  const [times, setTimes] = useState<Times>(EMPTY);
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState<Times>(EMPTY);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    let active = true;
    (async () => {
      const { data } = await supabase
        .from('day_times')
        .select('start_time, break_start, break_end, end_time')
        .eq('day_of_week', dayOfWeek)
        .maybeSingle();
      if (active && data) setTimes({
        start_time: data.start_time ?? '',
        break_start: data.break_start ?? '',
        break_end: data.break_end ?? '',
        end_time: data.end_time ?? '',
      });
    })();
    return () => { active = false; };
  }, [dayOfWeek]);

  const hasAny = !!(times.start_time || times.break_start || times.break_end || times.end_time);

  const save = async () => {
    setSaving(true);
    const { data: userData } = await supabase.auth.getUser();
    const uid = userData.user?.id;
    if (!uid) { setSaving(false); return; }
    const payload = {
      user_id: uid,
      day_of_week: dayOfWeek,
      start_time: draft.start_time || null,
      break_start: draft.break_start || null,
      break_end: draft.break_end || null,
      end_time: draft.end_time || null,
    };
    const { error } = await supabase.from('day_times').upsert(payload, { onConflict: 'user_id,day_of_week' });
    setSaving(false);
    if (!error) {
      setTimes({
        start_time: draft.start_time || '',
        break_start: draft.break_start || '',
        break_end: draft.break_end || '',
        end_time: draft.end_time || '',
      });
      setOpen(false);
    }
  };

  return (
    <>
      <button
        type="button"
        onClick={() => { setDraft(times); setOpen(true); }}
        className="w-full text-[10px] text-muted-foreground hover:text-primary flex items-center justify-center gap-1 mb-2"
        title="Definir horários do dia"
      >
        <Clock className="h-3 w-3" />
        {hasAny ? (
          <span className="truncate">
            {times.start_time || '--:--'}
            {(times.break_start || times.break_end) && <> · int {times.break_start || '--:--'}–{times.break_end || '--:--'}</>}
            {' · '}{times.end_time || '--:--'}
          </span>
        ) : (
          <span>horários</span>
        )}
      </button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-xs">
          <DialogHeader>
            <DialogTitle>Horários {dayLabel ? `— ${dayLabel}` : ''}</DialogTitle>
          </DialogHeader>
          <p className="text-xs text-muted-foreground -mt-2">Valem para este dia em todas as semanas.</p>
          <div className="space-y-3">
            <div>
              <Label className="text-xs">Início do estudo</Label>
              <Input type="time" value={draft.start_time ?? ''} onChange={e => setDraft({ ...draft, start_time: e.target.value })} />
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <Label className="text-xs">Início do intervalo</Label>
                <Input type="time" value={draft.break_start ?? ''} onChange={e => setDraft({ ...draft, break_start: e.target.value })} />
              </div>
              <div>
                <Label className="text-xs">Fim do intervalo</Label>
                <Input type="time" value={draft.break_end ?? ''} onChange={e => setDraft({ ...draft, break_end: e.target.value })} />
              </div>
            </div>
            <div>
              <Label className="text-xs">Fim do estudo</Label>
              <Input type="time" value={draft.end_time ?? ''} onChange={e => setDraft({ ...draft, end_time: e.target.value })} />
            </div>
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
