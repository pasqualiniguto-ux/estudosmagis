import React, { createContext, useContext, useState, useCallback, ReactNode, useEffect } from 'react';
import { Subject, Topic, ScheduleEntry, StudyLog, Exam } from '@/types/study';

interface TopicStats {
  total: number;
  correct: number;
  wrong: number;
  percentage: number;
}

interface StudyContextType {
  subjects: Subject[];
  scheduleEntries: ScheduleEntry[];
  studyLogs: StudyLog[];
  addSubject: (name: string) => void;
  removeSubject: (id: string) => void;
  addTopic: (subjectId: string, name: string) => void;
  removeTopic: (subjectId: string, topicId: string) => void;
  addScheduleEntry: (dayOfWeek: number, subjectId: string, plannedMinutes: number) => void;
  removeScheduleEntry: (id: string) => void;
  addStudiedTime: (entryId: string, seconds: number) => void;
  addStudyLog: (log: Omit<StudyLog, 'id'>) => void;
  getTopicStats: (topicId: string) => TopicStats;
  getSubjectStats: (subjectId: string) => TopicStats;
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
  const [scheduleEntries, setScheduleEntries] = useState<ScheduleEntry[]>(() => loadStorage('study_schedule', []));
  const [studyLogs, setStudyLogs] = useState<StudyLog[]>(() => loadStorage('study_logs', []));

  useEffect(() => saveStorage('study_subjects', subjects), [subjects]);
  useEffect(() => saveStorage('study_schedule', scheduleEntries), [scheduleEntries]);
  useEffect(() => saveStorage('study_logs', studyLogs), [studyLogs]);

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

  const addScheduleEntry = useCallback((dayOfWeek: number, subjectId: string, plannedMinutes: number) => {
    setScheduleEntries(prev => [...prev, {
      id: crypto.randomUUID(),
      dayOfWeek,
      subjectId,
      plannedMinutes,
      studiedSeconds: 0,
    }]);
  }, []);

  const removeScheduleEntry = useCallback((id: string) => {
    setScheduleEntries(prev => prev.filter(e => e.id !== id));
  }, []);

  const addStudiedTime = useCallback((entryId: string, seconds: number) => {
    setScheduleEntries(prev => prev.map(e =>
      e.id === entryId
        ? { ...e, studiedSeconds: e.studiedSeconds + seconds }
        : e
    ));
  }, []);

  const addStudyLog = useCallback((log: Omit<StudyLog, 'id'>) => {
    setStudyLogs(prev => [...prev, { ...log, id: crypto.randomUUID() }]);
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
      subjects, scheduleEntries, studyLogs,
      addSubject, removeSubject, addTopic, removeTopic,
      addScheduleEntry, removeScheduleEntry, addStudiedTime,
      addStudyLog, getTopicStats, getSubjectStats,
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
