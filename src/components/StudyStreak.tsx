import { useMemo } from 'react';
import { useStudy } from '@/contexts/StudyContext';
import { nowBrasilia, toDateStr } from '@/lib/dateUtils';

const DAYS_TO_SHOW = 14;

export default function StudyStreak() {
  const { studyLogs, dailyProgress } = useStudy();

  const { days, currentStreak, gapDays, record } = useMemo(() => {
    const studiedDates = new Set<string>();

    dailyProgress.forEach(p => {
      if (p.studiedSeconds > 0) studiedDates.add(p.date);
    });

    studyLogs.forEach(log => {
      if (log.timeStudiedSeconds > 0 || log.questionsCorrect > 0 || log.questionsWrong > 0) {
        studiedDates.add(log.date);
      }
    });

    const today = nowBrasilia();
    today.setHours(0, 0, 0, 0);
    const todayStr = toDateStr(today);

    // Build last N days
    const days: { date: string; label: string; status: 'studied' | 'missed' | 'today' }[] = [];
    for (let i = DAYS_TO_SHOW - 1; i >= 0; i--) {
      const d = new Date(today);
      d.setDate(today.getDate() - i);
      const dateStr = toDateStr(d);
      const label = String(d.getDate());
      const status = dateStr === todayStr ? 'today' : studiedDates.has(dateStr) ? 'studied' : 'missed';
      days.push({ date: dateStr, label, status });
    }

    // Current streak (consecutive days before today)
    let currentStreak = 0;
    const d = new Date(today);
    d.setDate(d.getDate() - 1); // start from yesterday
    while (true) {
      if (studiedDates.has(toDateStr(d))) {
        currentStreak++;
        d.setDate(d.getDate() - 1);
      } else {
        break;
      }
    }

    // Gap days (how many days since last study, 0 if studied yesterday)
    let gapDays = 0;
    if (currentStreak === 0) {
      const g = new Date(today);
      g.setDate(g.getDate() - 1);
      while (!studiedDates.has(toDateStr(g)) && gapDays < 365) {
        gapDays++;
        g.setDate(g.getDate() - 1);
      }
      if (gapDays >= 365 && studiedDates.size === 0) gapDays = 0; // no data
    }

    // Record streak (all-time best)
    let record = 0;
    if (studiedDates.size > 0) {
      const sorted = Array.from(studiedDates).sort();
      let streak = 1;
      for (let i = 1; i < sorted.length; i++) {
        const prev = new Date(sorted[i - 1] + 'T12:00:00');
        const curr = new Date(sorted[i] + 'T12:00:00');
        const diffDays = Math.round((curr.getTime() - prev.getTime()) / 86400000);
        if (diffDays === 1) {
          streak++;
        } else {
          record = Math.max(record, streak);
          streak = 1;
        }
      }
      record = Math.max(record, streak);
    }

    return { days, currentStreak, gapDays, record };
  }, [studyLogs, dailyProgress]);

  const hasData = dailyProgress.length > 0 || studyLogs.length > 0;

  return (
    <div className="w-full bg-card border border-border rounded-xl px-4 py-3 space-y-2">
      {/* Dot timeline */}
      <div className="flex items-center gap-[3px]">
        {days.map((day) => (
          <div key={day.date} className="flex flex-col items-center flex-1 min-w-0">
            <div
              className={`w-full h-[5px] rounded-full transition-colors ${
                day.status === 'studied'
                  ? 'bg-emerald-500'
                  : day.status === 'missed'
                  ? 'bg-red-400/60'
                  : 'bg-muted-foreground/30'
              }`}
              title={day.date}
            />
            <span className="text-[8px] text-muted-foreground mt-0.5 leading-none">{day.label}</span>
          </div>
        ))}
      </div>

      {/* Stats row */}
      {hasData && (
        <div className="flex items-center justify-between text-[10px] text-muted-foreground">
          {currentStreak > 0 ? (
            <span>
              🔥 <span className="font-medium text-emerald-500">{currentStreak} {currentStreak === 1 ? 'dia' : 'dias'}</span> sem falhar
            </span>
          ) : gapDays > 0 ? (
            <span>
              ⚠️ <span className="font-medium text-red-400">{gapDays} {gapDays === 1 ? 'dia' : 'dias'}</span> sem estudar
            </span>
          ) : (
            <span className="text-muted-foreground/60">Comece a estudar hoje!</span>
          )}
          {record > 0 && (
            <span>
              Recorde: <span className="font-medium text-foreground">{record} {record === 1 ? 'dia' : 'dias'}</span>
            </span>
          )}
        </div>
      )}
    </div>
  );
}
