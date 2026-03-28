import { useMemo } from 'react';
import { useStudy } from '@/contexts/StudyContext';
import { Flame } from 'lucide-react';

export default function StudyStreak() {
  const { studyLogs, dailyProgress } = useStudy();

  const streak = useMemo(() => {
    const studiedDates = new Set<string>();

    dailyProgress.forEach(p => {
      if (p.studiedSeconds > 0) studiedDates.add(p.date);
    });

    studyLogs.forEach(log => {
      if (log.timeStudiedSeconds > 0 || log.questionsCorrect > 0 || log.questionsWrong > 0) {
        studiedDates.add(log.date);
      }
    });

    if (studiedDates.size === 0) return 0;

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    let count = 0;
    const d = new Date(today);

    while (true) {
      const dateStr = d.toISOString().split('T')[0];
      if (studiedDates.has(dateStr)) {
        count++;
        d.setDate(d.getDate() - 1);
      } else {
        break;
      }
    }

    return count;
  }, [studyLogs, dailyProgress]);

  return (
    <div className="flex items-center gap-2 bg-card border border-border rounded-xl px-4 py-2.5">
      <Flame
        className={`h-6 w-6 transition-colors ${
          streak > 0 ? 'text-orange-500 fill-orange-500' : 'text-muted-foreground'
        }`}
      />
      <div className="flex flex-col">
        <span className={`text-lg font-bold leading-tight ${streak > 0 ? 'text-orange-500' : 'text-muted-foreground'}`}>
          {streak}
        </span>
        <span className="text-[10px] text-muted-foreground leading-tight">
          {streak === 1 ? 'dia seguido' : 'dias seguidos'}
        </span>
      </div>
    </div>
  );
}
