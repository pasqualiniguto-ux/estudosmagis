import { useState } from 'react';
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
import { Play, Plus, Clock, ClipboardList, Trash2 } from 'lucide-react';

const DAYS = ['Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta', 'Sábado', 'Domingo'];

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

export default function Index() {
  const { subjects, scheduleEntries, addScheduleEntry, removeScheduleEntry, addStudiedTime, addStudyLog } = useStudy();

  const [addDay, setAddDay] = useState<number | null>(null);
  const [addSubjectId, setAddSubjectId] = useState('');
  const [addHours, setAddHours] = useState(0);
  const [addMinutes, setAddMinutes] = useState(30);

  const [timerEntry, setTimerEntry] = useState<ScheduleEntry | null>(null);

  const [manualEntry, setManualEntry] = useState<ScheduleEntry | null>(null);
  const [manualHours, setManualHours] = useState(0);
  const [manualMins, setManualMins] = useState(0);

  const [logEntry, setLogEntry] = useState<ScheduleEntry | null>(null);
  const [logTopicId, setLogTopicId] = useState('');
  const [logCorrect, setLogCorrect] = useState(0);
  const [logWrong, setLogWrong] = useState(0);
  const [logTimeH, setLogTimeH] = useState(0);
  const [logTimeM, setLogTimeM] = useState(0);

  const handleAddEntry = () => {
    if (addDay === null || !addSubjectId) return;
    const totalMin = addHours * 60 + addMinutes;
    if (totalMin <= 0) return;
    addScheduleEntry(addDay, addSubjectId, totalMin);
    setAddDay(null);
    setAddSubjectId('');
    setAddHours(0);
    setAddMinutes(30);
  };

  const handleManualTime = () => {
    if (!manualEntry) return;
    const totalSec = manualHours * 3600 + manualMins * 60;
    if (totalSec > 0) addStudiedTime(manualEntry.id, totalSec);
    setManualEntry(null);
    setManualHours(0);
    setManualMins(0);
  };

  const handleManualLog = () => {
    if (!logEntry) return;
    const subject = subjects.find(s => s.id === logEntry.subjectId);
    const topic = subject?.topics.find(t => t.id === logTopicId);
    const timeSec = logTimeH * 3600 + logTimeM * 60;
    if (timeSec > 0) addStudiedTime(logEntry.id, timeSec);
    addStudyLog({
      subjectId: logEntry.subjectId,
      topicId: logTopicId || '',
      topicName: topic?.name || '',
      date: new Date().toISOString().split('T')[0],
      timeStudiedSeconds: timeSec,
      questionsCorrect: logCorrect,
      questionsWrong: logWrong,
      scheduleEntryId: logEntry.id,
    });
    setLogEntry(null);
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
    <div className="min-h-screen bg-background">
      <AppNavigation />
      <main className="container py-6">
        <h1 className="text-2xl font-bold text-foreground mb-6">Planejamento Semanal</h1>

        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-7 gap-3">
          {DAYS.map((day, dayIndex) => {
            const dayEntries = scheduleEntries.filter(e => e.dayOfWeek === dayIndex);
            return (
              <div key={dayIndex} className="bg-card rounded-xl border border-border p-3 flex flex-col">
                <h3 className="text-sm font-semibold text-center text-foreground mb-3 pb-2 border-b border-border">{day}</h3>
                <div className="space-y-2 flex-1">
                  {dayEntries.map(entry => {
                    const subject = subjects.find(s => s.id === entry.subjectId);
                    const plannedSec = entry.plannedMinutes * 60;
                    const progress = plannedSec > 0 ? Math.min(entry.studiedSeconds / plannedSec, 1) : 0;
                    const isCompleted = progress >= 1;
                    const hasProgress = entry.studiedSeconds > 0 && !isCompleted;

                    return (
                      <div
                        key={entry.id}
                        className={`p-2.5 rounded-lg border transition-all ${
                          isCompleted
                            ? 'border-primary/20 bg-primary/5 opacity-60'
                            : hasProgress
                            ? 'border-primary/40 bg-primary/5'
                            : 'border-border bg-secondary/30'
                        }`}
                      >
                        <div className="flex items-center justify-between mb-1">
                          <span className={`text-xs font-semibold truncate ${isCompleted ? 'line-through text-muted-foreground' : 'text-foreground'}`}>
                            {subject?.name || '—'}
                          </span>
                          <Button variant="ghost" size="icon" className="h-5 w-5 text-muted-foreground hover:text-destructive" onClick={() => removeScheduleEntry(entry.id)}>
                            <Trash2 className="h-3 w-3" />
                          </Button>
                        </div>
                        <p className="text-[10px] text-muted-foreground mb-1.5">
                          {fmtTime(entry.studiedSeconds)} / {fmtPlanned(entry.plannedMinutes)}
                        </p>
                        <Progress value={progress * 100} className="h-1.5 mb-2" />
                        <div className="flex gap-1">
                          <Button variant="ghost" size="icon" className="h-6 w-6 text-primary hover:bg-primary/10" onClick={() => setTimerEntry(entry)} title="Cronômetro">
                            <Play className="h-3 w-3" />
                          </Button>
                          <Button variant="ghost" size="icon" className="h-6 w-6 text-muted-foreground hover:bg-muted/50" onClick={() => setManualEntry(entry)} title="Tempo manual">
                            <Clock className="h-3 w-3" />
                          </Button>
                          <Button variant="ghost" size="icon" className="h-6 w-6 text-muted-foreground hover:bg-muted/50" onClick={() => { setLogEntry(entry); resetLogForm(); }} title="Registrar estudo">
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
                  onClick={() => { setAddDay(dayIndex); setAddSubjectId(''); setAddHours(0); setAddMinutes(30); }}
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
        <StudyTimer entry={timerEntry} open={!!timerEntry} onClose={() => setTimerEntry(null)} />
      )}

      {/* Add Schedule Entry Dialog */}
      <Dialog open={addDay !== null} onOpenChange={o => { if (!o) setAddDay(null); }}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>Adicionar matéria — {addDay !== null ? DAYS[addDay] : ''}</DialogTitle>
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
              <Button className="w-full" onClick={handleAddEntry} disabled={!addSubjectId}>Adicionar</Button>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Manual Time Dialog */}
      <Dialog open={!!manualEntry} onOpenChange={o => { if (!o) setManualEntry(null); }}>
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
      <Dialog open={!!logEntry} onOpenChange={o => { if (!o) setLogEntry(null); }}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>Registrar estudo manual</DialogTitle>
          </DialogHeader>
          {logEntry && (() => {
            const subject = subjects.find(s => s.id === logEntry.subjectId);
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
