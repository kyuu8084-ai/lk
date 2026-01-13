export interface Schedule {
  id: string;
  subject: string;
  day: string; // "Thứ 2", "Thứ 3", etc.
  startTime: string; // "HH:mm"
  endTime: string; // "HH:mm"
}

export interface Exam {
  id: string;
  subject: string;
  date: string; // YYYY-MM-DD
  description?: string;
  tag?: string; // New field: "Giữa kỳ", "Cuối kỳ", etc.
}

export interface User {
  username: string;
  password?: string;
  schedules: Schedule[];
  exams?: Exam[];
}

export const DAYS_OF_WEEK = [
  'Thứ 2',
  'Thứ 3',
  'Thứ 4',
  'Thứ 5',
  'Thứ 6',
  'Thứ 7',
  'Chủ nhật'
];

export const EXAM_TAGS = [
  'Giữa kỳ',
  'Cuối kỳ',
  'Quiz',
  'Thuyết trình',
  'Deadline',
  'Khác'
];

export type AlarmSoundType = 'standard' | 'gentle' | 'digital' | 'intense';

export enum AppView {
  LOGIN,
  DASHBOARD
}

// Theme Types
export type FontPair = 'modern' | 'classic' | 'clean';
export type ColorTheme = 'default' | 'nature' | 'sunset' | 'ocean' | 'monochrome';

export interface ThemeConfig {
  font: FontPair;
  color: ColorTheme;
}