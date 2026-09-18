import { useMemo } from 'react';
import { useStudy } from '@/contexts/StudyContext';
import { nowBrasilia, toDateStr } from '@/lib/dateUtils';

const DAYS_TO_SHOW = 14;

export default function StudyStreak() {
  const { studyLogs, dailyProgress } = useStudy();

  const days = useMemo(() => {
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

    const days: { date: string; label: string; status: 'studied' | 'missed' | 'today' }[] = [];
    for (let i = DAYS_TO_SHOW - 1; i >= 0; i--) {
      const d = new Date(today);
      d.setDate(today.getDate() - i);
      const dateStr = toDateStr(d);
      const label = String(d.getDate());
      const status = dateStr === todayStr ? 'today' : studiedDates.has(dateStr) ? 'studied' : 'missed';
      days.push({ date: dateStr, label, status });
    }

    return days;
  }, [studyLogs, dailyProgress]);

  return (
    <div className="w-full bg-card border border-border rounded-xl px-4 py-3">
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
    </div>
  );
}
