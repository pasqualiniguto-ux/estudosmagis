export interface Subject {
  id: string;
  name: string;
  topics: Topic[];
}

export interface Topic {
  id: string;
  name: string;
}

export interface ScheduleEntry {
  id: string;
  subjectId: string;
  plannedMinutes: number;
  recurring: boolean;
  dayOfWeek: number; // 0=Mon, 1=Tue ... 6=Sun
  date?: string; // YYYY-MM-DD for one-time entries
}

export interface DailyProgress {
  id: string;
  entryId: string;
  date: string; // YYYY-MM-DD
  studiedSeconds: number;
}

export interface StudyLog {
  id: string;
  subjectId: string;
  topicId: string;
  topicName: string;
  date: string;
  timeStudiedSeconds: number;
  questionsCorrect: number;
  questionsWrong: number;
  scheduleEntryId: string;
}

export interface Exam {
  id: string;
  name: string;
  date: string;
  subjectIds: string[];
  notes: string;
  url?: string;
}
