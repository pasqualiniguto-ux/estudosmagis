import React, { createContext, useContext, useState, useCallback, ReactNode, useEffect, useRef } from 'react';
import { Subject, Topic, ScheduleEntry, CycleEntry, DailyProgress, StudyLog, Exam, Note } from '@/types/study';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

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
  notes: Note[];
  loading: boolean;
  addSubject: (name: string, color?: string) => void;
  updateSubject: (id: string, updates: Partial<Subject>) => void;
  removeSubject: (id: string) => void;
  addTopic: (subject_id: string, name: string, pdfUrl?: string, webUrl?: string) => void;
  updateTopic: (subjectId: string, topicId: string, updates: Partial<Topic>) => void;
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
  updateStudyLog: (id: string, updates: Partial<Omit<StudyLog, 'id'>>) => void;
  removeStudyLog: (id: string) => void;
  getTopicStats: (topicId: string) => TopicStats;
  getSubjectStats: (subjectId: string) => TopicStats;
  addExam: (exam: Omit<Exam, 'id'>) => void;
  removeExam: (id: string) => void;
  updateExam: (id: string, exam: Partial<Omit<Exam, 'id'>>) => void;
  noteFont: string;
  noteSize: string;
  setNoteFont: (font: string) => void;
  setNoteSize: (size: string) => void;
  addNote: (subjectId?: string) => Promise<string | undefined>;
  updateNote: (id: string, updates: Partial<Note>) => void;
  removeNote: (id: string) => void;
}

const StudyContext = createContext<StudyContextType | null>(null);

export function StudyProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [scheduleEntries, setScheduleEntries] = useState<ScheduleEntry[]>([]);
  const [cycleEntries, setCycleEntries] = useState<CycleEntry[]>([]);
  const [activeCycleIndex, setActiveCycleIndex] = useState(0);
  const [completedCyclesCount, setCompletedCyclesCountState] = useState(0);
  const [dailyProgress, setDailyProgress] = useState<DailyProgress[]>([]);
  const [studyLogs, setStudyLogs] = useState<StudyLog[]>([]);
  const [exams, setExams] = useState<Exam[]>([]);
  const [notes, setNotes] = useState<Note[]>([]);
  const [noteFont, setNoteFontState] = useState('sans');
  const [noteSize, setNoteSizeState] = useState('md');
  const [loading, setLoading] = useState(true);
  const migrationDone = useRef(false);

  // Load all data when user logs in
  useEffect(() => {
    if (!user) {
      setSubjects([]);
      setScheduleEntries([]);
      setCycleEntries([]);
      setActiveCycleIndex(0);
      setCompletedCyclesCountState(0);
      setDailyProgress([]);
      setStudyLogs([]);
      setExams([]);
      setNotes([]);
      setNoteFontState('sans');
      setNoteSizeState('md');
      setLoading(false);
      migrationDone.current = false;
      return;
    }
    loadAllData();
  }, [user?.id]);

  async function migrateLocalStorage() {
    if (!user || migrationDone.current) return;
    migrationDone.current = true;

    const localSubjects = loadLS<any[]>('study_subjects', []);
    if (localSubjects.length === 0) return; // Nothing to migrate

    try {
      // Map old subject IDs to new UUIDs
      const subjectIdMap: Record<string, string> = {};

      for (const s of localSubjects) {
        const { data } = await supabase.from('subjects').insert({
          user_id: user.id,
          name: s.name,
          color: s.color || null,
        }).select('id').single();
        if (data) {
          subjectIdMap[s.id] = data.id;
          // Insert topics
          if (s.topics?.length) {
            const topicRows = s.topics.map((t: any) => ({
              subject_id: data.id,
              user_id: user.id,
              name: t.name,
            }));
            await supabase.from('topics').insert(topicRows);
          }
        }
      }

      // Schedule entries
      const localSchedule = loadLS<any[]>('study_schedule_v2', []);
      if (localSchedule.length) {
        const rows = localSchedule
          .filter((e: any) => subjectIdMap[e.subjectId])
          .map((e: any) => ({
            user_id: user.id,
            subject_id: subjectIdMap[e.subjectId],
            planned_minutes: e.plannedMinutes,
            recurring: e.recurring,
            day_of_week: e.dayOfWeek,
            date: e.date || null,
          }));
        if (rows.length) await supabase.from('schedule_entries').insert(rows);
      }

      // Cycle entries
      const localCycle = loadLS<any[]>('study_cycle_entries', []);
      if (localCycle.length) {
        const rows = localCycle
          .filter((e: any) => subjectIdMap[e.subjectId])
          .map((e: any) => ({
            user_id: user.id,
            subject_id: subjectIdMap[e.subjectId],
            planned_minutes: e.plannedMinutes,
            sort_order: e.order,
          }));
        if (rows.length) await supabase.from('cycle_entries').insert(rows);
      }

      // Study logs
      const localLogs = loadLS<any[]>('study_logs', []);
      if (localLogs.length) {
        const rows = localLogs
          .filter((l: any) => subjectIdMap[l.subjectId])
          .map((l: any) => ({
            user_id: user.id,
            subject_id: subjectIdMap[l.subjectId],
            topic_id: l.topicId || '',
            topic_name: l.topicName || '',
            date: l.date,
            time_studied_seconds: l.timeStudiedSeconds,
            questions_correct: l.questionsCorrect,
            questions_wrong: l.questionsWrong,
            schedule_entry_id: l.scheduleEntryId || '',
          }));
        if (rows.length) await supabase.from('study_logs').insert(rows);
      }

      // Exams
      const localExams = loadLS<any[]>('study_exams', []);
      if (localExams.length) {
        const rows = localExams.map((e: any) => ({
          user_id: user.id,
          name: e.name,
          date: e.date,
          subject_ids: (e.subjectIds || []).map((sid: string) => subjectIdMap[sid] || sid),
          notes: e.notes || '',
          url: e.url || null,
        }));
        if (rows.length) await supabase.from('exams').insert(rows);
      }

      // User settings
      const localCycleIdx = loadLS<number>('study_active_cycle_index', 0);
      const localCompletedCycles = loadLS<number>('study_completed_cycles', 0);
      await supabase.from('user_settings').upsert({
        user_id: user.id,
        active_cycle_index: localCycleIdx,
        completed_cycles_count: localCompletedCycles,
      }, { onConflict: 'user_id' });

      // Clear localStorage after successful migration
      ['study_subjects', 'study_schedule_v2', 'study_cycle_entries', 'study_active_cycle_index',
       'study_completed_cycles', 'study_daily_progress', 'study_logs', 'study_exams'].forEach(k => localStorage.removeItem(k));

    } catch (err) {
      console.error('Migration error:', err);
    }
  }

  async function loadAllData() {
    if (!user) return;
    setLoading(true);

    // Check if user has data in DB already
    const { data: existingSubjects } = await supabase
      .from('subjects')
      .select('id')
      .eq('user_id', user.id)
      .limit(1);

    if (!existingSubjects?.length) {
      await migrateLocalStorage();
    }

    // Now load everything
    const [subjectsRes, topicsRes, scheduleRes, cycleRes, progressRes, logsRes, examsRes, notesRes, settingsRes] = await Promise.all([
      supabase.from('subjects').select('*').eq('user_id', user.id),
      supabase.from('topics').select('*').eq('user_id', user.id),
      supabase.from('schedule_entries').select('*').eq('user_id', user.id),
      supabase.from('cycle_entries').select('*').eq('user_id', user.id).order('sort_order'),
      supabase.from('daily_progress').select('*').eq('user_id', user.id),
      supabase.from('study_logs').select('*').eq('user_id', user.id),
      supabase.from('exams').select('*').eq('user_id', user.id),
      supabase.from('notes').select('*').eq('user_id', user.id).order('updated_at', { ascending: false }),
      supabase.from('user_settings').select('*').eq('user_id', user.id).maybeSingle(),
    ]);

    // Build subjects with their topics
    const topicsBySubject: Record<string, Topic[]> = {};
    (topicsRes.data || []).forEach((t: any) => {
      if (!topicsBySubject[t.subject_id]) topicsBySubject[t.subject_id] = [];
      topicsBySubject[t.subject_id].push({
        id: t.id,
        name: t.name,
        pdfUrl: t.pdf_url || undefined,
        webUrl: t.web_url || undefined
      });
    });

    setSubjects((subjectsRes.data || []).map((s: any) => ({
      id: s.id,
      name: s.name,
      color: s.color,
      pdfUrl: s.pdf_url || undefined,
      webUrl: s.web_url || undefined,
      topics: topicsBySubject[s.id] || [],
    })));

    setScheduleEntries((scheduleRes.data || []).map((e: any) => ({
      id: e.id,
      subjectId: e.subject_id,
      plannedMinutes: e.planned_minutes,
      recurring: e.recurring,
      dayOfWeek: e.day_of_week,
      date: e.date,
    })));

    setCycleEntries((cycleRes.data || []).map((e: any) => ({
      id: e.id,
      subjectId: e.subject_id,
      plannedMinutes: e.planned_minutes,
      order: e.sort_order,
    })));

    setDailyProgress((progressRes.data || []).map((p: any) => ({
      id: p.id,
      entryId: p.entry_id,
      subjectId: p.subject_id,
      date: p.date,
      studiedSeconds: p.studied_seconds,
    })));

    setStudyLogs((logsRes.data || []).map((l: any) => ({
      id: l.id,
      subjectId: l.subject_id,
      topicId: l.topic_id,
      topicName: l.topic_name,
      date: l.date,
      timeStudiedSeconds: l.time_studied_seconds,
      questionsCorrect: l.questions_correct,
      questionsWrong: l.questions_wrong,
      scheduleEntryId: l.schedule_entry_id,
    })));

    setExams((examsRes.data || []).map((e: any) => ({
      id: e.id,
      name: e.name,
      date: e.date,
      subjectIds: e.subject_ids || [],
      notes: e.notes,
      url: e.url,
    })));

    setNotes((notesRes.data || []).map((n: any) => ({
      id: n.id,
      subjectId: n.subject_id || undefined,
      title: n.title,
      content: n.content || '',
      createdAt: n.created_at,
      updatedAt: n.updated_at,
    })));

    if (settingsRes.data) {
      setActiveCycleIndex(settingsRes.data.active_cycle_index);
      setCompletedCyclesCountState(settingsRes.data.completed_cycles_count);
      const settingsAny = settingsRes.data as any;
      if (settingsAny.note_font) setNoteFontState(settingsAny.note_font);
      if (settingsAny.note_size) setNoteSizeState(settingsAny.note_size);
    }

    setLoading(false);
  }

  // --- CRUD operations ---

  const addSubject = useCallback(async (name: string, color?: string) => {
    if (!user) return;
    const { data } = await supabase.from('subjects').insert({
      user_id: user.id, name, color: color || null,
    }).select('id').single();
    if (data) {
      setSubjects(prev => [...prev, { id: data.id, name, color, topics: [] }]);
    }
  }, [user]);

  const updateSubject = useCallback(async (id: string, updates: Partial<Subject>) => {
    if (!user) return;
    const dbUpdates: any = {};
    if (updates.name !== undefined) dbUpdates.name = updates.name;
    if (updates.color !== undefined) dbUpdates.color = updates.color;
    if (updates.pdfUrl !== undefined) dbUpdates.pdf_url = updates.pdfUrl;
    if (updates.webUrl !== undefined) dbUpdates.web_url = updates.webUrl;
    await supabase.from('subjects').update(dbUpdates).eq('id', id);
    setSubjects(prev => prev.map(s => s.id === id ? { ...s, ...updates } : s));
  }, [user]);

  const removeSubject = useCallback(async (id: string) => {
    if (!user) return;
    await supabase.from('subjects').delete().eq('id', id);
    setSubjects(prev => prev.filter(s => s.id !== id));
    setScheduleEntries(prev => prev.filter(e => e.subjectId !== id));
    setCycleEntries(prev => prev.filter(e => e.subjectId !== id));
  }, [user]);

  const addTopic = useCallback(async (subjectId: string, name: string, pdfUrl?: string, webUrl?: string) => {
    if (!user) return;
    const { data } = await supabase.from('topics').insert({
      subject_id: subjectId, user_id: user.id, name, pdf_url: pdfUrl || null, web_url: webUrl || null
    }).select('id').single();
    if (data) {
      setSubjects(prev => prev.map(s =>
        s.id === subjectId
          ? { ...s, topics: [...s.topics, { id: data.id, name, pdfUrl, webUrl }] }
          : s
      ));
    }
  }, [user]);

  const updateTopic = useCallback(async (subjectId: string, topicId: string, updates: Partial<Topic>) => {
    if (!user) return;
    const dbUpdates: any = {};
    if (updates.name !== undefined) dbUpdates.name = updates.name;
    if (updates.pdfUrl !== undefined) dbUpdates.pdf_url = updates.pdfUrl;
    if (updates.webUrl !== undefined) dbUpdates.web_url = updates.webUrl;
    await supabase.from('topics').update(dbUpdates).eq('id', topicId);
    setSubjects(prev => prev.map(s =>
      s.id === subjectId
        ? { ...s, topics: s.topics.map(t => t.id === topicId ? { ...t, ...updates } : t) }
        : s
    ));
  }, [user]);

  const removeTopic = useCallback(async (subjectId: string, topicId: string) => {
    if (!user) return;
    await supabase.from('topics').delete().eq('id', topicId);
    setSubjects(prev => prev.map(s =>
      s.id === subjectId
        ? { ...s, topics: s.topics.filter(t => t.id !== topicId) }
        : s
    ));
  }, [user]);

  const addScheduleEntry = useCallback(async (subjectId: string, plannedMinutes: number, recurring: boolean, dayOfWeek: number, date?: string) => {
    if (!user) return;
    const { data } = await supabase.from('schedule_entries').insert({
      user_id: user.id,
      subject_id: subjectId,
      planned_minutes: plannedMinutes,
      recurring,
      day_of_week: dayOfWeek,
      date: recurring ? null : (date || null),
    }).select('id').single();
    if (data) {
      setScheduleEntries(prev => [...prev, {
        id: data.id, subjectId, plannedMinutes, recurring, dayOfWeek,
        date: recurring ? undefined : date,
      }]);
    }
  }, [user]);

  const removeScheduleEntry = useCallback(async (id: string) => {
    if (!user) return;
    await supabase.from('schedule_entries').delete().eq('id', id);
    setScheduleEntries(prev => prev.filter(e => e.id !== id));
  }, [user]);

  const addCycleEntry = useCallback(async (subjectId: string, plannedMinutes: number) => {
    if (!user) return;
    const order = cycleEntries.length;
    const { data } = await supabase.from('cycle_entries').insert({
      user_id: user.id, subject_id: subjectId, planned_minutes: plannedMinutes, sort_order: order,
    }).select('id').single();
    if (data) {
      setCycleEntries(prev => [...prev, { id: data.id, subjectId, plannedMinutes, order }]);
    }
  }, [user, cycleEntries.length]);

  const removeCycleEntry = useCallback(async (id: string) => {
    if (!user) return;
    await supabase.from('cycle_entries').delete().eq('id', id);
    setCycleEntries(prev => {
      const filtered = prev.filter(e => e.id !== id);
      // Re-order
      filtered.forEach((e, idx) => {
        e.order = idx;
        supabase.from('cycle_entries').update({ sort_order: idx }).eq('id', e.id);
      });
      return [...filtered];
    });
    setActiveCycleIndex(prev => prev > 0 ? prev - 1 : 0);
    await saveSettings(activeCycleIndex > 0 ? activeCycleIndex - 1 : 0, completedCyclesCount);
  }, [user, activeCycleIndex, completedCyclesCount]);

  const reorderCycleEntries = useCallback(async (startIndex: number, endIndex: number) => {
    if (!user) return;
    setCycleEntries(prev => {
      const result = Array.from(prev);
      const [removed] = result.splice(startIndex, 1);
      result.splice(endIndex, 0, removed);
      const reordered = result.map((e, idx) => ({ ...e, order: idx }));
      // Update DB
      reordered.forEach(e => {
        supabase.from('cycle_entries').update({ sort_order: e.order }).eq('id', e.id);
      });
      return reordered;
    });
  }, [user]);

  const advanceCycle = useCallback(async () => {
    if (!user || cycleEntries.length === 0) return;
    const nextIndex = (activeCycleIndex + 1) % cycleEntries.length;
    let newCompleted = completedCyclesCount;
    if (nextIndex === 0 && cycleEntries.length > 0) {
      newCompleted = completedCyclesCount + 1;
      setCompletedCyclesCountState(newCompleted);
    }
    setActiveCycleIndex(nextIndex);
    await saveSettings(nextIndex, newCompleted);
  }, [user, cycleEntries.length, activeCycleIndex, completedCyclesCount]);

  const setCompletedCyclesCount = useCallback(async (count: number) => {
    if (!user) return;
    setCompletedCyclesCountState(count);
    await saveSettings(activeCycleIndex, count);
  }, [user, activeCycleIndex]);

  async function saveSettings(cycleIdx: number, completedCount: number) {
    if (!user) return;
    await supabase.from('user_settings').upsert({
      user_id: user.id,
      active_cycle_index: cycleIdx,
      completed_cycles_count: completedCount,
    }, { onConflict: 'user_id' });
  }

  const addStudiedTime = useCallback(async (entryId: string, date: string, seconds: number) => {
    if (!user) return;
    const subjectId = scheduleEntries.find(e => e.id === entryId)?.subjectId
                   || cycleEntries.find(e => e.id === entryId)?.subjectId;

    // Check if progress exists
    const existing = dailyProgress.find(p => p.entryId === entryId && p.date === date);
    if (existing) {
      const newSeconds = existing.studiedSeconds + seconds;
      await supabase.from('daily_progress').update({ studied_seconds: newSeconds }).eq('id', existing.id);
      setDailyProgress(prev => prev.map(p =>
        p.id === existing.id ? { ...p, studiedSeconds: newSeconds } : p
      ));
    } else {
      const { data } = await supabase.from('daily_progress').insert({
        user_id: user.id,
        entry_id: entryId,
        subject_id: subjectId || null,
        date,
        studied_seconds: seconds,
      }).select('id').single();
      if (data) {
        setDailyProgress(prev => [...prev, {
          id: data.id, entryId, subjectId, date, studiedSeconds: seconds,
        }]);
      }
    }
  }, [user, scheduleEntries, cycleEntries, dailyProgress]);

  const getProgressForEntry = useCallback((entryId: string, date: string): number => {
    const p = dailyProgress.find(dp => dp.entryId === entryId && dp.date === date);
    return p?.studiedSeconds || 0;
  }, [dailyProgress]);

  const getEntriesForDate = useCallback((dateStr: string): ScheduleEntry[] => {
    const d = new Date(dateStr + 'T12:00:00');
    const ourDay = (d.getDay() + 6) % 7;
    return scheduleEntries.filter(e => {
      if (e.recurring) return e.dayOfWeek === ourDay;
      return e.date === dateStr;
    });
  }, [scheduleEntries]);

  const addStudyLog = useCallback(async (log: Omit<StudyLog, 'id'>) => {
    if (!user) return;
    const { data } = await supabase.from('study_logs').insert({
      user_id: user.id,
      subject_id: log.subjectId,
      topic_id: log.topicId,
      topic_name: log.topicName,
      date: log.date,
      time_studied_seconds: log.timeStudiedSeconds,
      questions_correct: log.questionsCorrect,
      questions_wrong: log.questionsWrong,
      schedule_entry_id: log.scheduleEntryId,
    }).select('id').single();
    if (data) {
      setStudyLogs(prev => [...prev, { ...log, id: data.id }]);
    }
  }, [user]);

  const updateStudyLog = useCallback(async (id: string, updates: Partial<Omit<StudyLog, 'id'>>) => {
    if (!user) return;
    const dbUpdates: any = {};
    if (updates.questionsCorrect !== undefined) dbUpdates.questions_correct = updates.questionsCorrect;
    if (updates.questionsWrong !== undefined) dbUpdates.questions_wrong = updates.questionsWrong;
    if (updates.topicName !== undefined) dbUpdates.topic_name = updates.topicName;
    if (updates.date !== undefined) dbUpdates.date = updates.date;
    await supabase.from('study_logs').update(dbUpdates).eq('id', id);
    setStudyLogs(prev => prev.map(l => l.id === id ? { ...l, ...updates } : l));
  }, [user]);

  const removeStudyLog = useCallback(async (id: string) => {
    if (!user) return;
    await supabase.from('study_logs').delete().eq('id', id);
    setStudyLogs(prev => prev.filter(l => l.id !== id));
  }, [user]);

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

  const addExam = useCallback(async (exam: Omit<Exam, 'id'>) => {
    if (!user) return;
    const { data } = await supabase.from('exams').insert({
      user_id: user.id,
      name: exam.name,
      date: exam.date,
      subject_ids: exam.subjectIds,
      notes: exam.notes,
      url: exam.url || null,
    }).select('id').single();
    if (data) {
      setExams(prev => [...prev, { ...exam, id: data.id }]);
    }
  }, [user]);

  const removeExam = useCallback(async (id: string) => {
    if (!user) return;
    await supabase.from('exams').delete().eq('id', id);
    setExams(prev => prev.filter(e => e.id !== id));
  }, [user]);

  const updateExam = useCallback(async (id: string, updates: Partial<Omit<Exam, 'id'>>) => {
    if (!user) return;
    const dbUpdates: any = {};
    if (updates.name !== undefined) dbUpdates.name = updates.name;
    if (updates.date !== undefined) dbUpdates.date = updates.date;
    if (updates.subjectIds !== undefined) dbUpdates.subject_ids = updates.subjectIds;
    if (updates.notes !== undefined) dbUpdates.notes = updates.notes;
    if (updates.url !== undefined) dbUpdates.url = updates.url;
    await supabase.from('exams').update(dbUpdates).eq('id', id);
    setExams(prev => prev.map(e => e.id === id ? { ...e, ...updates } : e));
  }, [user]);

  const addNote = useCallback(async (subjectId?: string) => {
    if (!user) return;
    try {
      const { data, error } = await supabase.from('notes').insert({
        user_id: user.id,
        subject_id: subjectId || null,
        title: 'Nova Nota',
        content: '',
      }).select('id, created_at, updated_at').single();
      
      if (error) throw error;
      
      if (data) {
        const newNote: Note = {
          id: data.id,
          subjectId,
          title: 'Nova Nota',
          content: '',
          createdAt: data.created_at,
          updatedAt: data.updated_at,
        };
        setNotes(prev => [newNote, ...prev]);
        return data.id;
      }
    } catch (error: any) {
      console.error('Erro ao adicionar nota:', error);
      throw error;
    }
  }, [user]);

  const updateNote = useCallback(async (id: string, updates: Partial<Note>) => {
    if (!user) return;
    const dbUpdates: any = {};
    if (updates.title !== undefined) dbUpdates.title = updates.title;
    if (updates.content !== undefined) dbUpdates.content = updates.content;
    if (updates.subjectId !== undefined) dbUpdates.subject_id = updates.subjectId || null;
    
    await supabase.from('notes').update(dbUpdates).eq('id', id);
    setNotes(prev => prev.map(n => n.id === id ? { ...n, ...updates } : n));
  }, [user]);

  const removeNote = useCallback(async (id: string) => {
    if (!user) return;
    await supabase.from('notes').delete().eq('id', id);
    setNotes(prev => prev.filter(n => n.id !== id));
  }, [user]);

  const setNoteFont = useCallback(async (font: string) => {
    if (!user) return;
    setNoteFontState(font);
    await supabase.from('user_settings').upsert({ user_id: user.id, note_font: font });
  }, [user]);

  const setNoteSize = useCallback(async (size: string) => {
    if (!user) return;
    setNoteSizeState(size);
    await supabase.from('user_settings').upsert({ user_id: user.id, note_size: size });
  }, [user]);

  return (
    <StudyContext.Provider value={{
      subjects, scheduleEntries, cycleEntries, activeCycleIndex, completedCyclesCount, dailyProgress, studyLogs, exams, notes, loading,
      noteFont, noteSize, setNoteFont, setNoteSize,
      addSubject, updateSubject, removeSubject, addTopic, updateTopic, removeTopic,
      addScheduleEntry, removeScheduleEntry, addStudiedTime,
      addCycleEntry, removeCycleEntry, reorderCycleEntries, advanceCycle, setCompletedCyclesCount,
      getProgressForEntry, getEntriesForDate,
      addStudyLog, getTopicStats, getSubjectStats,
      addExam, removeExam, updateExam,
      addNote, updateNote, removeNote,
    }}>
      {children}
    </StudyContext.Provider>
  );
}

function loadLS<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : fallback;
  } catch {
    return fallback;
  }
}

export function useStudy() {
  const ctx = useContext(StudyContext);
  if (!ctx) throw new Error('useStudy must be used within StudyProvider');
  return ctx;
}
