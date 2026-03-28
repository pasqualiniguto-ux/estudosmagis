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
  dayOfWeek: number; // 0=Monday ... 6=Sunday
  subjectId: string;
  plannedMinutes: number;
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
  date: string; // ISO date string YYYY-MM-DD
  subjectIds: string[];
  notes: string;
  url?: string;
}
