import { useState, useEffect, useRef } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Play, Pause, Square, Plus, Sparkles } from 'lucide-react';
import { useStudy } from '@/contexts/StudyContext';
import { ScheduleEntry, CycleEntry } from '@/types/study';

interface Props {
  entry: ScheduleEntry | CycleEntry;
  date: string;
  open: boolean;
  onClose: () => void;
}

type Phase = 'timer' | 'log';

interface LoggedTopic {
  topicId: string;
  topicName: string;
  questionsCorrect: number;
  questionsWrong: number;
}

export default function StudyTimer({ entry, date, open, onClose }: Props) {
  const { subjects, addStudiedTime, addStudyLog, getProgressForEntry, studyLogs } = useStudy();
  const subject = subjects.find(s => s.id === entry.subjectId);

  const currentProgress = getProgressForEntry(entry.id, date);
  const remainingPlanned = Math.max((entry.plannedMinutes * 60) - currentProgress, 0);
  const [secondsLeft, setSecondsLeft] = useState(remainingPlanned);
  const [isRunning, setIsRunning] = useState(false);
  const [elapsed, setElapsed] = useState(0);
  const [phase, setPhase] = useState<Phase>('timer');

  const [topicId, setTopicId] = useState('');
  const [questionsCorrect, setQuestionsCorrect] = useState(0);
  const [questionsWrong, setQuestionsWrong] = useState(0);
  const [loggedTopics, setLoggedTopics] = useState<LoggedTopic[]>([]);

  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const prevOpenRef = useRef(false);
  // Timestamp-based tracking to survive background tab throttling
  const startTimestampRef = useRef<number | null>(null);
  const elapsedBeforePauseRef = useRef(0);
  const initialSecondsLeftRef = useRef(remainingPlanned);
  const originalTitleRef = useRef(document.title);

  useEffect(() => {
    // Only reset when dialog opens (transition from closed to open)
    if (open && !prevOpenRef.current) {
      const prog = getProgressForEntry(entry.id, date);
      const rem = Math.max((entry.plannedMinutes * 60) - prog, 0);
      setSecondsLeft(rem);
      initialSecondsLeftRef.current = rem;
      setIsRunning(false);
      setElapsed(0);
      setPhase('timer');
      setTopicId('');
      setQuestionsCorrect(0);
      setQuestionsWrong(0);
      setLoggedTopics([]);
      startTimestampRef.current = null;
      elapsedBeforePauseRef.current = 0;
    }
    prevOpenRef.current = open;
  }, [open, entry.id, entry.plannedMinutes, date, getProgressForEntry]);

  // Restore document title on unmount or close
  useEffect(() => {
    const savedTitle = document.title;
    originalTitleRef.current = savedTitle;
    return () => {
      document.title = originalTitleRef.current;
    };
  }, []);

  useEffect(() => {
    if (isRunning) {
      startTimestampRef.current = Date.now();
      const tick = () => {
        const now = Date.now();
        const runningSeconds = Math.floor((now - (startTimestampRef.current || now)) / 1000);
        const totalElapsed = elapsedBeforePauseRef.current + runningSeconds;
        const remaining = Math.max(initialSecondsLeftRef.current - totalElapsed + elapsedBeforePauseRef.current, 0);
        
        // Recalculate: remaining = initialSecondsLeft - totalElapsed relative to start
        const newRemaining = Math.max(initialSecondsLeftRef.current - runningSeconds, 0);
        
        setElapsed(totalElapsed);
        setSecondsLeft(newRemaining);

        // Update browser tab title
        document.title = `⏱ ${fmt(newRemaining)} — Estudando`;

        if (newRemaining <= 0) {
          setIsRunning(false);
          playChime();
        }
      };
      tick(); // immediate first tick
      intervalRef.current = setInterval(tick, 500); // 500ms for snappier updates after returning from background
    } else {
      // When pausing, accumulate elapsed time
      if (startTimestampRef.current !== null) {
        const runningSeconds = Math.floor((Date.now() - startTimestampRef.current) / 1000);
        elapsedBeforePauseRef.current += runningSeconds;
        initialSecondsLeftRef.current = Math.max(initialSecondsLeftRef.current - runningSeconds, 0);
        startTimestampRef.current = null;
      }
    }
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [isRunning]);

  // When timer finishes naturally
  useEffect(() => {
    if (secondsLeft === 0 && elapsed > 0 && !isRunning) {
      handleStop();
    }
  }, [secondsLeft, elapsed, isRunning]);

  const playChime = () => {
    try {
      const ctx = new AudioContext();
      const notes = [523.25, 659.25, 783.99]; // C5, E5, G5 chord
      notes.forEach((freq, i) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'sine';
        osc.frequency.value = freq;
        gain.gain.setValueAtTime(0.08, ctx.currentTime + i * 0.15);
        gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + i * 0.15 + 0.8);
        osc.connect(gain).connect(ctx.destination);
        osc.start(ctx.currentTime + i * 0.15);
        osc.stop(ctx.currentTime + i * 0.15 + 0.8);
      });
    } catch {}
  };

  const handleStop = () => {
    setIsRunning(false);
    document.title = originalTitleRef.current;
    if (elapsed > 0) {
      addStudiedTime(entry.id, date, elapsed);
      setPhase('log');
    }
  };

  const handleCancel = () => {
    setIsRunning(false);
    document.title = originalTitleRef.current;
    onClose();
  };

  const saveCurrentLog = () => {
    const topic = subject?.topics.find(t => t.id === topicId);
    addStudyLog({
      subjectId: entry.subjectId,
      topicId: topicId || '',
      topicName: topic?.name || '',
      date,
      timeStudiedSeconds: elapsed,
      questionsCorrect,
      questionsWrong,
      scheduleEntryId: entry.id,
    });
    return { topicId: topicId || '', topicName: topic?.name || '', questionsCorrect, questionsWrong };
  };

  const handleSubmitLog = () => {
    saveCurrentLog();
    document.title = originalTitleRef.current;
    onClose();
  };

  const handleAddAnotherTopic = () => {
    const logged = saveCurrentLog();
    setLoggedTopics(prev => [...prev, logged]);
    setTopicId('');
    setQuestionsCorrect(0);
    setQuestionsWrong(0);
  };

  const handleSkipLog = () => {
    document.title = originalTitleRef.current;
    onClose();
  };

  const fmt = (s: number) => {
    const h = Math.floor(s / 3600);
    const m = Math.floor((s % 3600) / 60);
    const sec = s % 60;
    const parts: string[] = [];
    if (h > 0) parts.push(String(h).padStart(2, '0'));
    parts.push(String(m).padStart(2, '0'));
    parts.push(String(sec).padStart(2, '0'));
    return parts.join(':');
  };

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o) { if (isRunning) { handleStop(); } else { onClose(); } } }}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="text-foreground">{subject?.name || 'Estudo'}</DialogTitle>
        </DialogHeader>

        {phase === 'timer' && (
          <div className="flex flex-col items-center gap-6 py-4">
            <div className="text-6xl font-mono font-bold text-primary tabular-nums">
              {fmt(secondsLeft)}
            </div>
            <p className="text-sm text-muted-foreground">
              Tempo estudado nesta sessão: {fmt(elapsed)}
            </p>
            <div className="flex items-center gap-2">
              <span className="text-xs text-muted-foreground">Adicionar:</span>
              {[1, 5, 15].map(m => (
                <Button
                  key={m}
                  variant="outline"
                  size="sm"
                  className="text-xs h-7 px-2"
                  onClick={() => { setSecondsLeft(prev => prev + m * 60); initialSecondsLeftRef.current += m * 60; }}
                >
                  <Plus className="h-3 w-3 mr-0.5" />+{m}min
                </Button>
              ))}
            </div>
            <div className="flex gap-3">
              {!isRunning ? (
                <Button onClick={() => setIsRunning(true)} disabled={secondsLeft === 0 && elapsed === 0}>
                  <Play className="h-4 w-4 mr-1" /> Iniciar
                </Button>
              ) : (
                <Button variant="secondary" onClick={() => setIsRunning(false)}>
                  <Pause className="h-4 w-4 mr-1" /> Pausar
                </Button>
              )}
              <Button variant="destructive" onClick={handleStop} disabled={elapsed === 0}>
                <Square className="h-4 w-4 mr-1" /> Encerrar
              </Button>
              <Button variant="ghost" onClick={handleCancel} className="text-muted-foreground">
                Cancelar
              </Button>
            </div>
          </div>
        )}

        {phase === 'log' && (
          <div className="space-y-4 py-2">
            <p className="text-sm text-muted-foreground">
              Você estudou <span className="text-primary font-medium">{fmt(elapsed)}</span>. Registre os detalhes:
            </p>

            {loggedTopics.length > 0 && (
              <div className="space-y-1">
                <label className="text-xs text-muted-foreground block">Assuntos já registrados:</label>
                {loggedTopics.map((lt, i) => (
                  <div key={i} className="flex items-center gap-2 text-xs text-foreground bg-primary/5 rounded px-2 py-1">
                    <span className="text-primary">✓</span>
                    <span className="font-medium">{lt.topicName || 'Sem assunto'}</span>
                    {(lt.questionsCorrect > 0 || lt.questionsWrong > 0) && (
                      <span className="text-muted-foreground ml-auto">{lt.questionsCorrect}✓ {lt.questionsWrong}✗</span>
                    )}
                  </div>
                ))}
              </div>
            )}

            {subject && subject.topics.length > 0 && (() => {
              const loggedIds = new Set(loggedTopics.map(lt => lt.topicId));
              const sortedTopics = [...subject.topics].sort((a, b) => {
                const aLogs = studyLogs.filter(l => l.topicId === a.id && (l.questionsCorrect > 0 || l.questionsWrong > 0));
                const bLogs = studyLogs.filter(l => l.topicId === b.id && (l.questionsCorrect > 0 || l.questionsWrong > 0));
                const aLastDate = aLogs.length > 0 ? aLogs.sort((x, y) => y.date.localeCompare(x.date))[0].date : '';
                const bLastDate = bLogs.length > 0 ? bLogs.sort((x, y) => y.date.localeCompare(x.date))[0].date : '';
                if (!aLastDate && bLastDate) return -1;
                if (aLastDate && !bLastDate) return 1;
                return aLastDate.localeCompare(bLastDate);
              });
              const recommendedId = sortedTopics.find(t => !loggedIds.has(t.id))?.id;
              return (
              <div>
                <label className="text-xs text-muted-foreground mb-1 block">Assunto</label>
                <Select value={topicId} onValueChange={setTopicId}>
                  <SelectTrigger><SelectValue placeholder="Selecione o assunto" /></SelectTrigger>
                  <SelectContent>
                    {sortedTopics.map(t => {
                      const isRecommended = t.id === recommendedId;
                      return (
                        <SelectItem key={t.id} value={t.id}>
                          <span className="flex items-center gap-1.5">
                            {t.name}
                            {isRecommended && (
                              <span className="inline-flex items-center gap-0.5 text-[10px] font-medium text-primary">
                                <Sparkles className="h-3 w-3" /> Sugerido
                              </span>
                            )}
                          </span>
                        </SelectItem>
                      );
                    })}
                  </SelectContent>
                </Select>
              </div>
              );
            })()}

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs text-muted-foreground mb-1 block">Questões certas</label>
                <Input type="number" min={0} value={questionsCorrect} onChange={e => setQuestionsCorrect(Number(e.target.value))} />
              </div>
              <div>
                <label className="text-xs text-muted-foreground mb-1 block">Questões erradas</label>
                <Input type="number" min={0} value={questionsWrong} onChange={e => setQuestionsWrong(Number(e.target.value))} />
              </div>
            </div>

            <div className="flex gap-2 justify-end">
              <Button variant="ghost" onClick={handleSkipLog}>
                {loggedTopics.length > 0 ? 'Finalizar' : 'Pular'}
              </Button>
              {subject && subject.topics.length > 0 && (
                <Button variant="outline" onClick={handleAddAnotherTopic}>
                  <Plus className="h-3 w-3 mr-1" /> Outro assunto
                </Button>
              )}
              <Button onClick={handleSubmitLog}>Salvar</Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
