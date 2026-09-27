// =============================================================================
// StudySync - Minimalist Frontend Data Types
// Strictly maps to 3 Core Relational Tables + 1 View
// =============================================================================

export interface User {
  id: number;
  username: string;
  email: string;
}

export interface Subject {
  id: number;
  user_id: number;
  name: string;
  color_code: string;
}

export interface StudySession {
  id: number;
  user_id: number;
  subject_id: number;
  duration_minutes: number;
  session_date: string;
  notes?: string;
  subject_name?: string;
  color_code?: string;
}

export interface SubjectSummary {
  user_id: number;
  username: string;
  subject_id: number;
  subject_name: string;
  color_code: string;
  total_sessions: number;
  total_minutes: number;
  total_hours: number;
}
