import { fetchApi, fetchPage, qs, type Page } from './client';

export type LectureStatus = 'upcoming' | 'live' | 'ended' | 'cancelled';
export type LectureWhen = 'upcoming' | 'live' | 'past' | 'mine';

export interface Lecture {
  id: string;
  title: string;
  description: string;
  topic: string;
  tags: string[];
  starts_at: string;
  duration_minutes: number;
  capacity: number | null;
  /** Only returned to the host and registered attendees. */
  join_url: string | null;
  has_join_url: boolean;
  recording_url: string | null;
  cancelled_at: string | null;
  created_at: string;
  status: LectureStatus;
  host_id: string;
  host_username: string;
  host_name: string | null;
  host_avatar_url: string | null;
  host_verification_status: string | null;
  host_institution: string | null;
  registered_count: number;
  is_registered: boolean;
  is_host: boolean;
  is_full: boolean;
}

export interface LectureQuestion {
  id: string;
  body: string;
  is_answered: boolean;
  is_hidden: boolean;
  created_at: string;
  author_id: string;
  username: string;
  full_name: string | null;
  avatar_url: string | null;
  verification_status: string | null;
}

export interface LectureAttendee {
  id: string;
  username: string;
  full_name: string | null;
  avatar_url: string | null;
  verification_status: string | null;
  institution: string | null;
  registered_at: string;
}

export interface LectureInput {
  title: string;
  description: string;
  topic: string;
  tags: string[];
  starts_at: string;
  duration_minutes: number;
  capacity: number | null;
  join_url: string | null;
  recording_url?: string | null;
}

export const lecturesApi = {
  list: (params: { when?: LectureWhen; topic?: string; q?: string }, cursor: string | null): Promise<Page<Lecture>> =>
    fetchPage(`/lectures${qs({ ...params, cursor })}`),
  topics: (): Promise<{ topic: string; count: number }[]> => fetchApi('/lectures/topics'),
  canHost: (): Promise<{ can_host: boolean }> => fetchApi('/lectures/can-host'),
  get: (id: string): Promise<Lecture> => fetchApi(`/lectures/${id}`),
  create: (input: LectureInput): Promise<Lecture> => fetchApi('/lectures', { method: 'POST', body: JSON.stringify(input) }),
  update: (id: string, input: Partial<LectureInput>): Promise<Lecture> =>
    fetchApi(`/lectures/${id}`, { method: 'PATCH', body: JSON.stringify(input) }),
  cancel: (id: string): Promise<Lecture> => fetchApi(`/lectures/${id}/cancel`, { method: 'POST' }),
  register: (id: string): Promise<Lecture> => fetchApi(`/lectures/${id}/register`, { method: 'POST' }),
  unregister: (id: string): Promise<Lecture> => fetchApi(`/lectures/${id}/register`, { method: 'DELETE' }),
  attendees: (id: string): Promise<LectureAttendee[]> => fetchApi(`/lectures/${id}/attendees`),
  questions: (id: string): Promise<LectureQuestion[]> => fetchApi(`/lectures/${id}/questions`),
  ask: (id: string, body: string): Promise<LectureQuestion> =>
    fetchApi(`/lectures/${id}/questions`, { method: 'POST', body: JSON.stringify({ body }) }),
  moderate: (id: string, questionId: string, patch: { is_answered?: boolean; is_hidden?: boolean }) =>
    fetchApi(`/lectures/${id}/questions/${questionId}`, { method: 'PATCH', body: JSON.stringify(patch) }),
  removeQuestion: (id: string, questionId: string) => fetchApi(`/lectures/${id}/questions/${questionId}`, { method: 'DELETE' }),
};

/** Builds an .ics calendar file for a lecture. */
export function lectureIcs(lecture: Lecture, pageUrl: string): string {
  const fmt = (d: Date) => d.toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, '');
  const esc = (s: string) => s.replace(/\\/g, '\\\\').replace(/\n/g, '\\n').replace(/[,;]/g, (m) => `\\${m}`);
  const start = new Date(lecture.starts_at);
  const end = new Date(start.getTime() + lecture.duration_minutes * 60000);
  return [
    'BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//ResearchReel//Lectures//EN', 'CALSCALE:GREGORIAN', 'METHOD:PUBLISH',
    'BEGIN:VEVENT',
    `UID:${lecture.id}@researchreel`,
    `DTSTAMP:${fmt(new Date())}`,
    `DTSTART:${fmt(start)}`,
    `DTEND:${fmt(end)}`,
    `SUMMARY:${esc(lecture.title)}`,
    `DESCRIPTION:${esc(`${lecture.description ? `${lecture.description}\n\n` : ''}${lecture.join_url ? `Join: ${lecture.join_url}\n` : ''}Details: ${pageUrl}`)}`,
    `URL:${pageUrl}`,
    'END:VEVENT', 'END:VCALENDAR', '',
  ].join('\r\n');
}
