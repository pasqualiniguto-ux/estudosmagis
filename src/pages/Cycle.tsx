import { useState } from 'react';
import AppNavigation from '@/components/AppNavigation';
import StudyTimer from '@/components/StudyTimer';
import { useStudy } from '@/contexts/StudyContext';
import { CycleEntry } from '@/types/study';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Progress } from '@/components/ui/progress';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { Play, Plus, Clock, ClipboardList, Trash2, ArrowRight, ArrowLeft, RotateCw, RotateCcw, BookOpen, Pencil, MessageSquare } from 'lucide-react';
import StudyStreak from '@/components/StudyStreak';
import FixedCycleItems from '@/components/FixedCycleItems';

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

import { todayStr as getTodayStr } from '@/lib/dateUtils';

export default function Cycle() {
  const { subjects, cycleEntries, activeCycleIndex, completedCyclesCount, studyLogs, updateStudyLog, addCycleEntry, removeCycleEntry, addStudiedTime, addStudyLog, getProgressForEntry, advanceCycle, regressCycle, setCompletedCyclesCount } = useStudy();

  // Observation editor
  const [editObsLog, setEditObsLog] = useState<{ id: string; topicName: string; notes: string } | null>(null);
  const [obsText, setObsText] = useState('');

  const todayStr = getTodayStr();

  // Add block state
  const [addSubjectId, setAddSubjectId] = useState('');
  const [addHours, setAddHours] = useState(1);
  const [addMinutes, setAddMinutes] = useState(0);

  // Timer
  const [timerEntry, setTimerEntry] = useState<CycleEntry | null>(null);

  // Manual time
  const [manualEntry, setManualEntry] = useState<CycleEntry | null>(null);
  const [manualHours, setManualHours] = useState(0);
  const [manualMins, setManualMins] = useState(0);

  // Manual log
  const [logEntry, setLogEntry] = useState<CycleEntry | null>(null);
  const [logTopicId, setLogTopicId] = useState('');
  const [logCorrect, setLogCorrect] = useState(0);
  const [logWrong, setLogWrong] = useState(0);
  const [logTimeH, setLogTimeH] = useState(0);
  const [logTimeM, setLogTimeM] = useState(0);

  const handleAddBlock = () => {
    if (!addSubjectId) return;
    const totalMin = addHours * 60 + addMinutes;
    if (totalMin <= 0) return;
    addCycleEntry(addSubjectId, totalMin);
    setAddSubjectId('');
    setAddHours(1);
    setAddMinutes(0);
  };

  const handleManualTime = () => {
    if (!manualEntry) return;
    const totalSec = manualHours * 3600 + manualMins * 60;
    if (totalSec > 0) addStudiedTime(manualEntry.id, todayStr, totalSec);
    setManualEntry(null);
    setManualHours(0);
    setManualMins(0);
  };

  const handleManualLog = () => {
    if (!logEntry) return;
    const subject = subjects.find(s => s.id === logEntry.subjectId);
    const topic = subject?.topics.find(t => t.id === logTopicId);
    const timeSec = logTimeH * 3600 + logTimeM * 60;
    if (timeSec > 0) addStudiedTime(logEntry.id, todayStr, timeSec);
    addStudyLog({
      subjectId: logEntry.subjectId,
      topicId: logTopicId || '',
      topicName: topic?.name || '',
      date: todayStr,
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
    <div className="min-h-screen bg-background pb-20 md:pb-0">
      <AppNavigation />
      <main className="container py-6">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-2xl font-bold text-foreground">Ciclo de Estudos</h1>
          <StudyStreak />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Adicionar Bloco e Gerenciamento */}
          <div className="col-span-1 border rounded-xl p-4 h-fit bg-card">
            <h2 className="text-lg font-semibold mb-4">Adicionar ao Ciclo</h2>
            {subjects.length === 0 ? (
              <p className="text-sm text-muted-foreground">Adicione matérias na aba "Matérias" primeiro.</p>
            ) : (
              <div className="space-y-4">
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
                <Button className="w-full" onClick={handleAddBlock} disabled={!addSubjectId}>
                  <Plus className="h-4 w-4 mr-1" /> Adicionar Bloco
                </Button>
              </div>
            )}
          </div>

          {/* Listagem do Ciclo */}
          <div className="col-span-1 lg:col-span-2">
            <FixedCycleItems />
            <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-4 gap-2">
              <h2 className="text-lg font-semibold text-center sm:text-left">Seu Ciclo (Ordem)</h2>
              <div className="flex items-center gap-2 self-center sm:self-auto">
                <div className="text-sm font-medium text-muted-foreground bg-muted/50 px-3 py-1.5 rounded-full border">
                  Ciclos concluídos: <span className="text-foreground font-bold ml-1">{completedCyclesCount}</span>
                </div>
                {completedCyclesCount > 0 && (
                  <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-foreground border" onClick={() => setCompletedCyclesCount(0)} title="Zerar contagem">
                    <RotateCcw className="h-4 w-4" />
                  </Button>
                )}
              </div>
            </div>
            {cycleEntries.length === 0 ? (
              <div className="border border-dashed rounded-xl p-10 flex flex-col items-center justify-center text-muted-foreground">
                <p>O seu ciclo está vazio.</p>
                <p className="text-sm">Adicione blocos ao lado para começar seu ciclo de estudos!</p>
              </div>
            ) : (
              <div className="space-y-3">
                {cycleEntries.map((entry, index) => {
                  const subject = subjects.find(s => s.id === entry.subjectId);
                  const isActive = index === activeCycleIndex;
                  const studied = getProgressForEntry(entry.id, todayStr);
                  const plannedSec = entry.plannedMinutes * 60;
                  const progress = plannedSec > 0 ? Math.min(studied / plannedSec, 1) : 0;

                  return (
                    <div
                      key={entry.id}
                      className={`relative flex flex-col sm:flex-row sm:items-center gap-4 p-4 rounded-xl border transition-all ${
                        isActive ? 'bg-primary/5 border-primary shadow-sm scale-[1.01]' : 'bg-card border-border hover:bg-muted/10'
                      }`}
                      style={subject?.color ? { borderLeft: `6px solid ${subject.color}` } : undefined}
                    >
                      {isActive && (
                        <div className="absolute top-2 right-2 flex items-center gap-1 text-[10px] font-bold text-primary uppercase tracking-wider bg-primary/10 px-2 py-0.5 rounded-full">
                          <span>Estudando</span>
                        </div>
                      )}

                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="flex items-center justify-center bg-muted text-muted-foreground font-medium text-xs rounded-full h-5 w-5">
                            {index + 1}
                          </span>
                          <h3 className={`font-semibold ${isActive ? 'text-primary' : 'text-foreground'}`}>
                            {subject?.name || '—'}
                          </h3>
                        </div>
                        <div className="flex flex-col sm:flex-row sm:items-center gap-2 text-xs text-muted-foreground mt-2">
                          <span>Tempo: {fmtTime(studied)} / {fmtPlanned(entry.plannedMinutes)}</span>
                          <Progress value={progress * 100} className="h-1.5 w-full sm:w-24" />
                        </div>
                      </div>

                      <div className="flex items-center gap-2 mt-2 sm:mt-0 justify-end">
                        <Button variant="outline" size="icon" className="h-8 w-8 text-primary" onClick={() => setTimerEntry(entry)} title="Cronômetro">
                          <Play className="h-4 w-4" />
                        </Button>
                        <Button variant="outline" size="icon" className="h-8 w-8 text-muted-foreground" onClick={() => { setManualEntry(entry); setManualHours(0); setManualMins(0); }} title="Tempo manual">
                          <Clock className="h-4 w-4" />
                        </Button>
                        <Button variant="outline" size="icon" className="h-8 w-8 text-muted-foreground" onClick={() => { setLogEntry(entry); resetLogForm(); }} title="Registrar estudo">
                          <ClipboardList className="h-4 w-4" />
                        </Button>
                        
                        {isActive && (
                          <>
                            <Button
                              variant="outline"
                              size="sm"
                              className="ml-2 gap-1 px-3"
                              onClick={regressCycle}
                              disabled={activeCycleIndex === 0 && completedCyclesCount === 0}
                              title="Voltar ao bloco anterior"
                            >
                              <ArrowLeft className="h-4 w-4" /> Voltar
                            </Button>
                            {index === cycleEntries.length - 1 ? (
                              <Button size="sm" className="gap-1 px-3 bg-primary text-primary-foreground hover:bg-primary/90" onClick={advanceCycle}>
                                Recomeçar Ciclo <RotateCw className="h-3.5 w-3.5" />
                              </Button>
                            ) : (
                              <Button size="sm" className="gap-1 px-3" onClick={advanceCycle}>
                                Avançar <ArrowRight className="h-4 w-4" />
                              </Button>
                            )}
                          </>
                        )}
                        <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-destructive ml-1" onClick={() => removeCycleEntry(entry.id)} title="Remover bloco">
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </main>

      {/* Reusing Timer Dialog - Pass entry and today's date */}
      {timerEntry && (
        <StudyTimer entry={timerEntry} date={todayStr} open={!!timerEntry} onClose={() => setTimerEntry(null)} />
      )}

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
