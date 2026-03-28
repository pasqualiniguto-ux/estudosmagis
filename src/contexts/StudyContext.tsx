import React, { createContext, useContext, useState, useCallback, ReactNode, useEffect } from 'react';
import { Subject, Topic, ScheduleEntry, CycleEntry, DailyProgress, StudyLog, Exam } from '@/types/study';

interface TopicStats {
  total: number;
  correct: number;
  wrong: number;
  percentage: number;
}

interface StudyContextType {
  subjects: Subject[];
  scheduleEntries: ScheduleEntry[];
  cycleEntries: CycleEntry[];
  activeCycleIndex: number;
  completedCyclesCount: number;
  dailyProgress: DailyProgress[];
  studyLogs: StudyLog[];
  exams: Exam[];
  addSubject: (name: string, color?: string) => void;
  updateSubject: (id: string, updates: Partial<Subject>) => void;
  removeSubject: (id: string) => void;
  addTopic: (subjectId: string, name: string) => void;
  removeTopic: (subjectId: string, topicId: string) => void;
  addScheduleEntry: (subjectId: string, plannedMinutes: number, recurring: boolean, dayOfWeek: number, date?: string) => void;
  removeScheduleEntry: (id: string) => void;
  addCycleEntry: (subjectId: string, plannedMinutes: number) => void;
  removeCycleEntry: (id: string) => void;
  reorderCycleEntries: (startIndex: number, endIndex: number) => void;
  advanceCycle: () => void;
  setCompletedCyclesCount: (count: number) => void;
  addStudiedTime: (entryId: string, date: string, seconds: number) => void;
  getProgressForEntry: (entryId: string, date: string) => number;
  getEntriesForDate: (date: string) => ScheduleEntry[];
  addStudyLog: (log: Omit<StudyLog, 'id'>) => void;
  getTopicStats: (topicId: string) => TopicStats;
  getSubjectStats: (subjectId: string) => TopicStats;
  addExam: (exam: Omit<Exam, 'id'>) => void;
  removeExam: (id: string) => void;
  updateExam: (id: string, exam: Partial<Omit<Exam, 'id'>>) => void;
}

const StudyContext = createContext<StudyContextType | null>(null);

function loadStorage<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : fallback;
  } catch {
    return fallback;
  }
}

function saveStorage<T>(key: string, value: T) {
  localStorage.setItem(key, JSON.stringify(value));
}

export function StudyProvider({ children }: { children: ReactNode }) {
  const [subjects, setSubjects] = useState<Subject[]>(() => loadStorage('study_subjects', []));
  const [scheduleEntries, setScheduleEntries] = useState<ScheduleEntry[]>(() => loadStorage('study_schedule_v2', []));
  const [cycleEntries, setCycleEntries] = useState<CycleEntry[]>(() => loadStorage('study_cycle_entries', []));
  const [activeCycleIndex, setActiveCycleIndex] = useState<number>(() => loadStorage('study_active_cycle_index', 0));
  const [completedCyclesCount, setCompletedCyclesCount] = useState<number>(() => loadStorage('study_completed_cycles', 0));
  const [dailyProgress, setDailyProgress] = useState<DailyProgress[]>(() => loadStorage('study_daily_progress', []));
  const [studyLogs, setStudyLogs] = useState<StudyLog[]>(() => loadStorage('study_logs', []));
  const [exams, setExams] = useState<Exam[]>(() => loadStorage('study_exams', []));

  useEffect(() => saveStorage('study_subjects', subjects), [subjects]);
  useEffect(() => saveStorage('study_schedule_v2', scheduleEntries), [scheduleEntries]);
  useEffect(() => saveStorage('study_cycle_entries', cycleEntries), [cycleEntries]);
  useEffect(() => saveStorage('study_active_cycle_index', activeCycleIndex), [activeCycleIndex]);
  useEffect(() => saveStorage('study_completed_cycles', completedCyclesCount), [completedCyclesCount]);
  useEffect(() => saveStorage('study_daily_progress', dailyProgress), [dailyProgress]);
  useEffect(() => saveStorage('study_logs', studyLogs), [studyLogs]);
  useEffect(() => saveStorage('study_exams', exams), [exams]);

  const addSubject = useCallback((name: string, color?: string) => {
    setSubjects(prev => [...prev, { id: crypto.randomUUID(), name, color, topics: [] }]);
  }, []);

  const updateSubject = useCallback((id: string, updates: Partial<Subject>) => {
    setSubjects(prev => prev.map(s => s.id === id ? { ...s, ...updates } : s));
  }, []);

  const removeSubject = useCallback((id: string) => {
    setSubjects(prev => prev.filter(s => s.id !== id));
    setScheduleEntries(prev => prev.filter(e => e.subjectId !== id));
  }, []);

  const addTopic = useCallback((subjectId: string, name: string) => {
    setSubjects(prev => prev.map(s =>
      s.id === subjectId
        ? { ...s, topics: [...s.topics, { id: crypto.randomUUID(), name }] }
        : s
    ));
  }, []);

  const removeTopic = useCallback((subjectId: string, topicId: string) => {
    setSubjects(prev => prev.map(s =>
      s.id === subjectId
        ? { ...s, topics: s.topics.filter(t => t.id !== topicId) }
        : s
    ));
  }, []);

  const addScheduleEntry = useCallback((subjectId: string, plannedMinutes: number, recurring: boolean, dayOfWeek: number, date?: string) => {
    setScheduleEntries(prev => [...prev, {
      id: crypto.randomUUID(),
      subjectId,
      plannedMinutes,
      recurring,
      dayOfWeek,
      date: recurring ? undefined : date,
    }]);
  }, []);

  const removeScheduleEntry = useCallback((id: string) => {
    setScheduleEntries(prev => prev.filter(e => e.id !== id));
  }, []);

  const getEntriesForDate = useCallback((dateStr: string): ScheduleEntry[] => {
    const d = new Date(dateStr + 'T12:00:00');
    const ourDay = (d.getDay() + 6) % 7; // JS Sun=0 -> our Sun=6, JS Mon=1 -> our Mon=0
    return scheduleEntries.filter(e => {
      if (e.recurring) return e.dayOfWeek === ourDay;
      return e.date === dateStr;
    });
  }, [scheduleEntries]);

  const getProgressForEntry = useCallback((entryId: string, date: string): number => {
    const p = dailyProgress.find(dp => dp.entryId === entryId && dp.date === date);
    return p?.studiedSeconds || 0;
  }, [dailyProgress]);

  const addStudiedTime = useCallback((entryId: string, date: string, seconds: number) => {
    setDailyProgress(prev => {
      const existing = prev.find(p => p.entryId === entryId && p.date === date);
      if (existing) {
        return prev.map(p =>
          p.entryId === entryId && p.date === date
            ? { ...p, studiedSeconds: p.studiedSeconds + seconds }
            : p
        );
      }
      return [...prev, { id: crypto.randomUUID(), entryId, date, studiedSeconds: seconds }];
    });
  }, []);

  const addStudyLog = useCallback((log: Omit<StudyLog, 'id'>) => {
    setStudyLogs(prev => [...prev, { ...log, id: crypto.randomUUID() }]);
  }, []);

  const addExam = useCallback((exam: Omit<Exam, 'id'>) => {
    setExams(prev => [...prev, { ...exam, id: crypto.randomUUID() }]);
  }, []);

  const removeExam = useCallback((id: string) => {
    setExams(prev => prev.filter(e => e.id !== id));
  }, []);

  const updateExam = useCallback((id: string, updates: Partial<Omit<Exam, 'id'>>) => {
    setExams(prev => prev.map(e => e.id === id ? { ...e, ...updates } : e));
  }, []);

  const getTopicStats = useCallback((topicId: string): TopicStats => {
    const logs = studyLogs.filter(l => l.topicId === topicId);
    const correct = logs.reduce((sum, l) => sum + l.questionsCorrect, 0);
    const wrong = logs.reduce((sum, l) => sum + l.questionsWrong, 0);
    const total = correct + wrong;
    return { total, correct, wrong, percentage: total > 0 ? (correct / total) * 100 : -1 };
  }, [studyLogs]);

  const getSubjectStats = useCallback((subjectId: string): TopicStats => {
    const logs = studyLogs.filter(l => l.subjectId === subjectId);
    const correct = logs.reduce((sum, l) => sum + l.questionsCorrect, 0);
    const wrong = logs.reduce((sum, l) => sum + l.questionsWrong, 0);
    const total = correct + wrong;
    return { total, correct, wrong, percentage: total > 0 ? (correct / total) * 100 : -1 };
  }, [studyLogs]);

  const addCycleEntry = useCallback((subjectId: string, plannedMinutes: number) => {
    setCycleEntries(prev => [...prev, {
      id: crypto.randomUUID(),
      subjectId,
      plannedMinutes,
      order: prev.length
    }]);
  }, []);

  const removeCycleEntry = useCallback((id: string) => {
    setCycleEntries(prev => {
      const filtered = prev.filter(e => e.id !== id);
      return filtered.map((e, idx) => ({ ...e, order: idx }));
    });
    setActiveCycleIndex(prev => prev > 0 ? prev - 1 : 0);
  }, []);

  const reorderCycleEntries = useCallback((startIndex: number, endIndex: number) => {
    setCycleEntries(prev => {
      const result = Array.from(prev);
      const [removed] = result.splice(startIndex, 1);
      result.splice(endIndex, 0, removed);
      return result.map((e, idx) => ({ ...e, order: idx }));
    });
  }, []);

  const advanceCycle = useCallback(() => {
    setActiveCycleIndex(prev => {
      if (cycleEntries.length === 0) return 0;
      const nextIndex = (prev + 1) % cycleEntries.length;
      if (nextIndex === 0 && cycleEntries.length > 0) {
        setCompletedCyclesCount(c => c + 1);
      }
      return nextIndex;
    });
  }, [cycleEntries.length]);

  return (
    <StudyContext.Provider value={{
      subjects, scheduleEntries, cycleEntries, activeCycleIndex, completedCyclesCount, dailyProgress, studyLogs, exams,
      addSubject, updateSubject, removeSubject, addTopic, removeTopic,
      addScheduleEntry, removeScheduleEntry, addStudiedTime,
      addCycleEntry, removeCycleEntry, reorderCycleEntries, advanceCycle, setCompletedCyclesCount,
      getProgressForEntry, getEntriesForDate,
      addStudyLog, getTopicStats, getSubjectStats,
      addExam, removeExam, updateExam,
    }}>
      {children}
    </StudyContext.Provider>
  );
}

export function useStudy() {
  const ctx = useContext(StudyContext);
  if (!ctx) throw new Error('useStudy must be used within StudyProvider');
  return ctx;
}
