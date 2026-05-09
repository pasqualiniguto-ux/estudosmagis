import { useEffect, useRef, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Progress } from '@/components/ui/progress';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Play, Pause, Square, Clock, Pin } from 'lucide-react';
import { todayStr as getTodayStr } from '@/lib/dateUtils';

interface FixedItem {
  key: string;
  name: string;
  plannedMinutes: number;
  color: string;
}

const FIXED_ITEMS: FixedItem[] = [
  { key: 'flashcards', name: 'Flashcards', plannedMinutes: 30, color: 'hsl(var(--primary))' },
  { key: 'lei_seca', name: 'Lei Seca', plannedMinutes: 30, color: 'hsl(var(--accent))' },
];

const STORAGE_KEY = 'fixed_cycle_progress_v1';

type ProgressMap = Record<string, Record<string, number>>; // date -> key -> seconds

function loadProgress(): ProgressMap {
  try { return JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}'); } catch { return {}; }
}
function saveProgress(p: ProgressMap) { localStorage.setItem(STORAGE_KEY, JSON.stringify(p)); }

function fmt(seconds: number): string {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  if (h > 0 && m > 0) return `${h}h${String(m).padStart(2, '0')}min`;
  if (h > 0) return `${h}h`;
  return `${m}min`;
}

function fmtClock(s: number) {
  const m = Math.floor(s / 60);
  const sec = s % 60;
  return `${String(m).padStart(2, '0')}:${String(sec).padStart(2, '0')}`;
}

export default function FixedCycleItems() {
  const today = getTodayStr();
  const [progress, setProgress] = useState<ProgressMap>(() => loadProgress());
  const [timerItem, setTimerItem] = useState<FixedItem | null>(null);
  const [manualItem, setManualItem] = useState<FixedItem | null>(null);
  const [manualMin, setManualMin] = useState(0);

  const todayProgress = progress[today] || {};

  const addSeconds = (key: string, seconds: number) => {
    setProgress(prev => {
      const next = { ...prev };
      const day = { ...(next[today] || {}) };
      day[key] = (day[key] || 0) + seconds;
      next[today] = day;
      saveProgress(next);
      return next;
    });
  };

  return (
    <div className="space-y-3 mb-4">
      <div className="flex items-center gap-2 text-xs text-muted-foreground uppercase tracking-wider">
        <Pin className="h-3 w-3" /> Fixos diariamente
      </div>
      {FIXED_ITEMS.map(item => {
        const studied = todayProgress[item.key] || 0;
        const plannedSec = item.plannedMinutes * 60;
        const pct = plannedSec > 0 ? Math.min(studied / plannedSec, 1) * 100 : 0;
        return (
          <div
            key={item.key}
            className="flex flex-col sm:flex-row sm:items-center gap-3 p-4 rounded-xl border bg-card border-dashed"
            style={{ borderLeft: `6px solid ${item.color}` }}
          >
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-1">
                <Pin className="h-3.5 w-3.5 text-muted-foreground" />
                <h3 className="font-semibold text-foreground">{item.name}</h3>
                <span className="text-[10px] font-medium text-muted-foreground bg-muted px-2 py-0.5 rounded-full">
                  Fixo
                </span>
              </div>
              <div className="flex flex-col sm:flex-row sm:items-center gap-2 text-xs text-muted-foreground mt-2">
                <span>Hoje: {fmt(studied)} / {fmt(plannedSec)}</span>
                <Progress value={pct} className="h-1.5 w-full sm:w-32" />
              </div>
            </div>
            <div className="flex items-center gap-2 justify-end">
              <Button variant="outline" size="icon" className="h-8 w-8 text-primary" onClick={() => setTimerItem(item)} title="Cronômetro">
                <Play className="h-4 w-4" />
              </Button>
              <Button variant="outline" size="icon" className="h-8 w-8 text-muted-foreground" onClick={() => { setManualItem(item); setManualMin(0); }} title="Tempo manual">
                <Clock className="h-4 w-4" />
              </Button>
            </div>
          </div>
        );
      })}

      {timerItem && (
        <FixedTimerDialog
          item={timerItem}
          alreadyStudied={todayProgress[timerItem.key] || 0}
          onClose={(addedSec) => {
            if (addedSec > 0) addSeconds(timerItem.key, addedSec);
            setTimerItem(null);
          }}
        />
      )}

      <Dialog open={!!manualItem} onOpenChange={o => { if (!o) setManualItem(null); }}>
        <DialogContent className="sm:max-w-xs">
          <DialogHeader>
            <DialogTitle>Adicionar tempo — {manualItem?.name}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div>
              <label className="text-xs text-muted-foreground mb-1 block">Minutos</label>
              <Input type="number" min={0} value={manualMin} onChange={e => setManualMin(Number(e.target.value))} />
            </div>
            <Button className="w-full" onClick={() => {
              if (manualItem && manualMin > 0) addSeconds(manualItem.key, manualMin * 60);
              setManualItem(null);
            }}>Adicionar</Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function FixedTimerDialog({ item, alreadyStudied, onClose }: { item: FixedItem; alreadyStudied: number; onClose: (addedSec: number) => void }) {
  const initialRemaining = Math.max(item.plannedMinutes * 60 - alreadyStudied, 0);
  const [secondsLeft, setSecondsLeft] = useState(initialRemaining || item.plannedMinutes * 60);
  const [isRunning, setIsRunning] = useState(false);
  const [elapsed, setElapsed] = useState(0);
  const startRef = useRef<number | null>(null);
  const baseElapsedRef = useRef(0);
  const baseRemainingRef = useRef(secondsLeft);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    if (isRunning) {
      startRef.current = Date.now();
      const tick = () => {
        const run = Math.floor((Date.now() - (startRef.current || Date.now())) / 1000);
        setElapsed(baseElapsedRef.current + run);
        setSecondsLeft(Math.max(baseRemainingRef.current - run, 0));
      };
      tick();
      intervalRef.current = setInterval(tick, 500);
    } else if (startRef.current !== null) {
      const run = Math.floor((Date.now() - startRef.current) / 1000);
      baseElapsedRef.current += run;
      baseRemainingRef.current = Math.max(baseRemainingRef.current - run, 0);
      startRef.current = null;
    }
    return () => { if (intervalRef.current) clearInterval(intervalRef.current); };
  }, [isRunning]);

  const stop = () => {
    setIsRunning(false);
    onClose(elapsed + (startRef.current ? Math.floor((Date.now() - startRef.current) / 1000) : 0));
  };

  return (
    <Dialog open onOpenChange={(o) => { if (!o) onClose(elapsed); }}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{item.name}</DialogTitle>
        </DialogHeader>
        <div className="flex flex-col items-center gap-6 py-4">
          <div className="text-6xl font-mono font-bold text-primary tabular-nums">{fmtClock(secondsLeft)}</div>
          <p className="text-sm text-muted-foreground">Tempo desta sessão: {fmtClock(elapsed)}</p>
          <div className="flex gap-3">
            {!isRunning ? (
              <Button onClick={() => setIsRunning(true)}><Play className="h-4 w-4 mr-1" /> Iniciar</Button>
            ) : (
              <Button variant="secondary" onClick={() => setIsRunning(false)}><Pause className="h-4 w-4 mr-1" /> Pausar</Button>
            )}
            <Button variant="destructive" onClick={stop} disabled={elapsed === 0 && !isRunning}>
              <Square className="h-4 w-4 mr-1" /> Encerrar
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
