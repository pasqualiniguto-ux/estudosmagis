import { useState, useMemo } from 'react';
import AppNavigation from '@/components/AppNavigation';
import StudyTimer from '@/components/StudyTimer';
import ExamReminders from '@/components/ExamReminders';
import { useStudy } from '@/contexts/StudyContext';
import { ScheduleEntry } from '@/types/study';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Progress } from '@/components/ui/progress';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Label } from '@/components/ui/label';
import { Play, Plus, Clock, ClipboardList, Trash2, ChevronLeft, ChevronRight } from 'lucide-react';
import StudyStreak from '@/components/StudyStreak';

const DAY_NAMES = ['Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb', 'Dom'];
const DAY_NAMES_FULL = ['segunda-feira', 'terça-feira', 'quarta-feira', 'quinta-feira', 'sexta-feira', 'sábado', 'domingo'];

function fmtTime(seconds: number): string {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  if (h > 0 && m > 0) return `${h}h${String(m).padStart(2, '0')}min`;
  if (h > 0) return `${h}h`;
  return `${m}min`;
}

function fmtPlanned(minutes: number): string {
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  if (h > 0 && m > 0) return `${h}h${String(m).padStart(2, '0')}`;
  if (h > 0) return `${h}h`;
  return `${m}min`;
}

import { toDateStr, nowBrasilia } from '@/lib/dateUtils';

function getWeekDates(weekOffset: number): Date[] {
  const today = nowBrasilia();
  today.setHours(12, 0, 0, 0);
  const jsDay = today.getDay();
  const diffToMonday = jsDay === 0 ? -6 : 1 - jsDay;
  const monday = new Date(today);
  monday.setDate(today.getDate() + diffToMonday + weekOffset * 7);
  return Array.from({ length: 7 }, (_, i) => {
    const d = new Date(monday);
    d.setDate(monday.getDate() + i);
    return d;
  });
}

function fmtDateShort(d: Date): string {
  return `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}`;
}

export default function Index() {
  const { subjects, addScheduleEntry, removeScheduleEntry, addStudiedTime, addStudyLog, getEntriesForDate, getProgressForEntry } = useStudy();

  const [weekOffset, setWeekOffset] = useState(0);
  const weekDates = useMemo(() => getWeekDates(weekOffset), [weekOffset]);
  const todayStr = toDateStr(nowBrasilia());

  // Add entry dialog
  const [addDate, setAddDate] = useState<Date | null>(null);
  const [addSubjectId, setAddSubjectId] = useState('');
  const [addHours, setAddHours] = useState(0);
  const [addMinutes, setAddMinutes] = useState(30);
  const [addRecurring, setAddRecurring] = useState<'once' | 'recurring' | 'daily'>('once');

  // Timer
  const [timerEntry, setTimerEntry] = useState<{ entry: ScheduleEntry; date: string } | null>(null);

  // Manual time
  const [manualState, setManualState] = useState<{ entry: ScheduleEntry; date: string } | null>(null);
  const [manualHours, setManualHours] = useState(0);
  const [manualMins, setManualMins] = useState(0);

  // Manual log
  const [logState, setLogState] = useState<{ entry: ScheduleEntry; date: string } | null>(null);
  const [logTopicId, setLogTopicId] = useState('');
  const [logCorrect, setLogCorrect] = useState(0);
  const [logWrong, setLogWrong] = useState(0);
  const [logTimeH, setLogTimeH] = useState(0);
  const [logTimeM, setLogTimeM] = useState(0);

  const handleAddEntry = async () => {
    if (!addDate || !addSubjectId) return;
    const totalMin = addHours * 60 + addMinutes;
    if (totalMin <= 0) return;
    const ourDay = (addDate.getDay() + 6) % 7;
    if (addRecurring === 'daily') {
      for (let d = 0; d < 7; d++) {
        await addScheduleEntry(addSubjectId, totalMin, true, d);
      }
    } else {
      addScheduleEntry(addSubjectId, totalMin, addRecurring === 'recurring', ourDay, toDateStr(addDate));
    }
    setAddDate(null);
  };

  const handleManualTime = () => {
    if (!manualState) return;
    const totalSec = manualHours * 3600 + manualMins * 60;
    if (totalSec > 0) addStudiedTime(manualState.entry.id, manualState.date, totalSec);
    setManualState(null);
    setManualHours(0);
    setManualMins(0);
  };

  const handleManualLog = () => {
    if (!logState) return;
    const subject = subjects.find(s => s.id === logState.entry.subjectId);
    const topic = subject?.topics.find(t => t.id === logTopicId);
    const timeSec = logTimeH * 3600 + logTimeM * 60;
    if (timeSec > 0) addStudiedTime(logState.entry.id, logState.date, timeSec);
    addStudyLog({
      subjectId: logState.entry.subjectId,
      topicId: logTopicId || '',
      topicName: topic?.name || '',
      date: logState.date,
      timeStudiedSeconds: timeSec,
      questionsCorrect: logCorrect,
      questionsWrong: logWrong,
      scheduleEntryId: logState.entry.id,
    });
    setLogState(null);
    resetLogForm();
  };

  const resetLogForm = () => {
    setLogTopicId('');
    setLogCorrect(0);
    setLogWrong(0);
    setLogTimeH(0);
    setLogTimeM(0);
  };

  return (
    <div className="min-h-screen bg-background pb-20 md:pb-0">
      <AppNavigation />
      <main className="container py-6">
        <h1 className="text-2xl font-bold text-foreground mb-4">Planejamento Semanal</h1>
        <div className="mb-5">
          <StudyStreak />
        </div>

        {/* Week Navigation */}
        <div className="flex items-center justify-center gap-3 mb-5">
          <Button variant="ghost" size="icon" onClick={() => setWeekOffset(o => o - 1)}>
            <ChevronLeft className="h-5 w-5" />
          </Button>
          <span className="text-sm font-medium text-foreground min-w-[140px] text-center">
            {fmtDateShort(weekDates[0])} — {fmtDateShort(weekDates[6])}
          </span>
          <Button variant="ghost" size="icon" onClick={() => setWeekOffset(o => o + 1)}>
            <ChevronRight className="h-5 w-5" />
          </Button>
          {weekOffset !== 0 && (
            <Button variant="outline" size="sm" onClick={() => setWeekOffset(0)}>Hoje</Button>
          )}
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-7 gap-3">
          {weekDates.map((dateObj, i) => {
            const dateStr = toDateStr(dateObj);
            const isToday = dateStr === todayStr;
            const dayEntries = getEntriesForDate(dateStr);

            return (
              <div key={dateStr} className={`rounded-xl border p-3 flex flex-col ${isToday ? 'bg-primary/5 border-primary/30' : 'bg-card border-border'}`}>
                <h3 className={`text-sm font-semibold text-center mb-3 pb-2 border-b ${isToday ? 'text-primary border-primary/20' : 'text-foreground border-border'}`}>
                  {DAY_NAMES[i]} {fmtDateShort(dateObj)}
                </h3>
                <div className="space-y-2 flex-1">
                  {dayEntries.map(entry => {
                    const subject = subjects.find(s => s.id === entry.subjectId);
                    const studied = getProgressForEntry(entry.id, dateStr);
                    const plannedSec = entry.plannedMinutes * 60;
                    const progress = plannedSec > 0 ? Math.min(studied / plannedSec, 1) : 0;
                    const isCompleted = progress >= 1;
                    const hasProgress = studied > 0 && !isCompleted;

                    return (
                      <div
                        key={entry.id + dateStr}
                        className={`p-2.5 rounded-lg border transition-all ${
                          isCompleted ? 'border-primary/20 bg-primary/5 opacity-60'
                          : hasProgress ? 'border-primary/40 bg-primary/5'
                          : 'border-border bg-secondary/30'
                        }`}
                        style={subject?.color ? { borderLeft: `4px solid ${subject.color}` } : undefined}
                      >
                        <div className="flex items-center justify-between mb-1">
                          <span className={`text-xs font-semibold truncate ${isCompleted ? 'line-through text-muted-foreground' : 'text-foreground'}`}>
                            {subject?.name || '—'}
                          </span>
                          {!entry.recurring && (
                            <Button variant="ghost" size="icon" className="h-5 w-5 text-muted-foreground hover:text-destructive" onClick={() => removeScheduleEntry(entry.id)}>
                              <Trash2 className="h-3 w-3" />
                            </Button>
                          )}
                          {entry.recurring && (
                            <Button variant="ghost" size="icon" className="h-5 w-5 text-muted-foreground hover:text-destructive" onClick={() => removeScheduleEntry(entry.id)} title="Remover recorrência">
                              <Trash2 className="h-3 w-3" />
                            </Button>
                          )}
                        </div>
                        {entry.recurring && (
                          <p className="text-[9px] text-muted-foreground mb-0.5 italic">↻ Recorrente</p>
                        )}
                        <p className="text-[10px] text-muted-foreground mb-1.5">
                          {fmtTime(studied)} / {fmtPlanned(entry.plannedMinutes)}
                        </p>
                        <Progress value={progress * 100} className="h-1.5 mb-2" />
                        <div className="flex gap-1">
                          <Button variant="ghost" size="icon" className="h-6 w-6 text-primary hover:bg-primary/10" onClick={() => setTimerEntry({ entry, date: dateStr })} title="Cronômetro">
                            <Play className="h-3 w-3" />
                          </Button>
                          <Button variant="ghost" size="icon" className="h-6 w-6 text-muted-foreground hover:bg-muted/50" onClick={() => { setManualState({ entry, date: dateStr }); setManualHours(0); setManualMins(0); }} title="Tempo manual">
                            <Clock className="h-3 w-3" />
                          </Button>
                          <Button variant="ghost" size="icon" className="h-6 w-6 text-muted-foreground hover:bg-muted/50" onClick={() => { setLogState({ entry, date: dateStr }); resetLogForm(); }} title="Registrar estudo">
                            <ClipboardList className="h-3 w-3" />
                          </Button>
                        </div>
                      </div>
                    );
                  })}
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  className="w-full mt-3 text-xs text-muted-foreground hover:text-primary"
                  onClick={() => { setAddDate(dateObj); setAddSubjectId(''); setAddHours(0); setAddMinutes(30); setAddRecurring('once'); }}
                >
                  <Plus className="h-3 w-3 mr-1" /> Adicionar
                </Button>
              </div>
            );
          })}
        </div>

        <ExamReminders />
      </main>

      {/* Timer Dialog */}
      {timerEntry && (
        <StudyTimer entry={timerEntry.entry} date={timerEntry.date} open={!!timerEntry} onClose={() => setTimerEntry(null)} />
      )}

      {/* Add Schedule Entry Dialog */}
      <Dialog open={!!addDate} onOpenChange={o => { if (!o) setAddDate(null); }}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>
              Adicionar matéria — {addDate ? `${DAY_NAMES[(addDate.getDay() + 6) % 7]} ${fmtDateShort(addDate)}` : ''}
            </DialogTitle>
          </DialogHeader>
          {subjects.length === 0 ? (
            <p className="text-sm text-muted-foreground py-4">Nenhuma matéria cadastrada. Vá para a página de Matérias para adicionar.</p>
          ) : (
            <div className="space-y-4 py-2">
              <div>
                <label className="text-xs text-muted-foreground mb-1 block">Matéria</label>
                <Select value={addSubjectId} onValueChange={setAddSubjectId}>
                  <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                  <SelectContent>
                    {subjects.map(s => <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs text-muted-foreground mb-1 block">Horas</label>
                  <Input type="number" min={0} max={23} value={addHours} onChange={e => setAddHours(Number(e.target.value))} />
                </div>
                <div>
                  <label className="text-xs text-muted-foreground mb-1 block">Minutos</label>
                  <Input type="number" min={0} max={59} value={addMinutes} onChange={e => setAddMinutes(Number(e.target.value))} />
                </div>
              </div>
              <div>
                <label className="text-xs text-muted-foreground mb-2 block">Frequência</label>
                <RadioGroup value={addRecurring} onValueChange={(v) => setAddRecurring(v as 'once' | 'recurring' | 'daily')}>
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="once" id="freq-once" />
                    <Label htmlFor="freq-once" className="text-sm">Apenas nesta data</Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="recurring" id="freq-recurring" />
                    <Label htmlFor="freq-recurring" className="text-sm">
                      Repetir toda {addDate ? DAY_NAMES_FULL[(addDate.getDay() + 6) % 7] : ''}
                    </Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="daily" id="freq-daily" />
                    <Label htmlFor="freq-daily" className="text-sm">Repetir todos os dias</Label>
                  </div>
                </RadioGroup>
              </div>
              <Button className="w-full" onClick={handleAddEntry} disabled={!addSubjectId}>Adicionar</Button>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Manual Time Dialog */}
      <Dialog open={!!manualState} onOpenChange={o => { if (!o) setManualState(null); }}>
        <DialogContent className="sm:max-w-xs">
          <DialogHeader>
            <DialogTitle>Adicionar tempo manual</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs text-muted-foreground mb-1 block">Horas</label>
                <Input type="number" min={0} value={manualHours} onChange={e => setManualHours(Number(e.target.value))} />
              </div>
              <div>
                <label className="text-xs text-muted-foreground mb-1 block">Minutos</label>
                <Input type="number" min={0} max={59} value={manualMins} onChange={e => setManualMins(Number(e.target.value))} />
              </div>
            </div>
            <Button className="w-full" onClick={handleManualTime}>Adicionar</Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Manual Study Log Dialog */}
      <Dialog open={!!logState} onOpenChange={o => { if (!o) setLogState(null); }}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>Registrar estudo manual</DialogTitle>
          </DialogHeader>
          {logState && (() => {
            const subject = subjects.find(s => s.id === logState.entry.subjectId);
            return (
              <div className="space-y-4 py-2">
                <p className="text-sm text-muted-foreground">Matéria: <span className="text-foreground font-medium">{subject?.name}</span></p>
                {subject && subject.topics.length > 0 && (
                  <div>
                    <label className="text-xs text-muted-foreground mb-1 block">Assunto</label>
                    <Select value={logTopicId} onValueChange={setLogTopicId}>
                      <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                      <SelectContent>
                        {subject.topics.map(t => <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                )}
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs text-muted-foreground mb-1 block">Tempo (horas)</label>
                    <Input type="number" min={0} value={logTimeH} onChange={e => setLogTimeH(Number(e.target.value))} />
                  </div>
                  <div>
                    <label className="text-xs text-muted-foreground mb-1 block">Tempo (min)</label>
                    <Input type="number" min={0} max={59} value={logTimeM} onChange={e => setLogTimeM(Number(e.target.value))} />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs text-muted-foreground mb-1 block">Questões certas</label>
                    <Input type="number" min={0} value={logCorrect} onChange={e => setLogCorrect(Number(e.target.value))} />
                  </div>
                  <div>
                    <label className="text-xs text-muted-foreground mb-1 block">Questões erradas</label>
                    <Input type="number" min={0} value={logWrong} onChange={e => setLogWrong(Number(e.target.value))} />
                  </div>
                </div>
                <Button className="w-full" onClick={handleManualLog}>Salvar</Button>
              </div>
            );
          })()}
        </DialogContent>
      </Dialog>
    </div>
  );
}
