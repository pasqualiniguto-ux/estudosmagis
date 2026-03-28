import React, { createContext, useContext, useState, useCallback, ReactNode, useEffect } from 'react';
import { Subject, Topic, ScheduleEntry, DailyProgress, StudyLog, Exam } from '@/types/study';

interface TopicStats {
  total: number;
  correct: number;
  wrong: number;
  percentage: number;
}

interface StudyContextType {
  subjects: Subject[];
  scheduleEntries: ScheduleEntry[];
  dailyProgress: DailyProgress[];
  studyLogs: StudyLog[];
  exams: Exam[];
  addSubject: (name: string) => void;
  removeSubject: (id: string) => void;
  addTopic: (subjectId: string, name: string) => void;
  removeTopic: (subjectId: string, topicId: string) => void;
  addScheduleEntry: (subjectId: string, plannedMinutes: number, recurring: boolean, dayOfWeek: number, date?: string) => void;
  removeScheduleEntry: (id: string) => void;
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
  const [dailyProgress, setDailyProgress] = useState<DailyProgress[]>(() => loadStorage('study_daily_progress', []));
  const [studyLogs, setStudyLogs] = useState<StudyLog[]>(() => loadStorage('study_logs', []));
  const [exams, setExams] = useState<Exam[]>(() => loadStorage('study_exams', []));

  useEffect(() => saveStorage('study_subjects', subjects), [subjects]);
  useEffect(() => saveStorage('study_schedule_v2', scheduleEntries), [scheduleEntries]);
  useEffect(() => saveStorage('study_daily_progress', dailyProgress), [dailyProgress]);
  useEffect(() => saveStorage('study_logs', studyLogs), [studyLogs]);
  useEffect(() => saveStorage('study_exams', exams), [exams]);

  const addSubject = useCallback((name: string) => {
    setSubjects(prev => [...prev, { id: crypto.randomUUID(), name, topics: [] }]);
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

  return (
    <StudyContext.Provider value={{
      subjects, scheduleEntries, dailyProgress, studyLogs, exams,
      addSubject, removeSubject, addTopic, removeTopic,
      addScheduleEntry, removeScheduleEntry, addStudiedTime,
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
