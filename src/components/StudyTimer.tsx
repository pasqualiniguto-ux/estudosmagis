import { useState, useEffect, useRef } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Play, Pause, Square, Plus } from 'lucide-react';
import { useStudy } from '@/contexts/StudyContext';
import { ScheduleEntry, CycleEntry } from '@/types/study';

interface Props {
  entry: ScheduleEntry | CycleEntry;
  date: string;
  open: boolean;
  onClose: () => void;
}

type Phase = 'timer' | 'log';

export default function StudyTimer({ entry, date, open, onClose }: Props) {
  const { subjects, addStudiedTime, addStudyLog, getProgressForEntry } = useStudy();
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

  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    if (open) {
      const prog = getProgressForEntry(entry.id, date);
      const rem = Math.max((entry.plannedMinutes * 60) - prog, 0);
      setSecondsLeft(rem);
      setIsRunning(false);
      setElapsed(0);
      setPhase('timer');
      setTopicId('');
      setQuestionsCorrect(0);
      setQuestionsWrong(0);
    }
  }, [open, entry.id, entry.plannedMinutes, date, getProgressForEntry]);

  useEffect(() => {
    if (isRunning) {
      intervalRef.current = setInterval(() => {
        setSecondsLeft(prev => {
          if (prev <= 1) {
            setIsRunning(false);
            return 0;
          }
          return prev - 1;
        });
        setElapsed(prev => prev + 1);
      }, 1000);
    }
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [isRunning]);

  useEffect(() => {
    if (secondsLeft === 0 && elapsed > 0 && !isRunning) {
      handleStop();
    }
  }, [secondsLeft, elapsed, isRunning]);

  const handleStop = () => {
    setIsRunning(false);
    if (elapsed > 0) {
      addStudiedTime(entry.id, date, elapsed);
      setPhase('log');
    }
  };

  const handleSubmitLog = () => {
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
    onClose();
  };

  const handleSkipLog = () => {
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
            </div>
          </div>
        )}

        {phase === 'log' && (
          <div className="space-y-4 py-2">
            <p className="text-sm text-muted-foreground">
              Você estudou <span className="text-primary font-medium">{fmt(elapsed)}</span>. Registre os detalhes:
            </p>

            {subject && subject.topics.length > 0 && (
              <div>
                <label className="text-xs text-muted-foreground mb-1 block">Assunto</label>
                <Select value={topicId} onValueChange={setTopicId}>
                  <SelectTrigger><SelectValue placeholder="Selecione o assunto" /></SelectTrigger>
                  <SelectContent>
                    {subject.topics.map(t => (
                      <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

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
              <Button variant="ghost" onClick={handleSkipLog}>Pular</Button>
              <Button onClick={handleSubmitLog}>Salvar</Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
