// =============================================================================
// StudySync - Minimalist Frontend API Client
// Directly maps to 3NF MySQL Endpoints & DV Engine
// =============================================================================

import { User, Subject, StudySession, SubjectSummary } from './types';

const API_BASE = '/api';

export const api = {
  // DBMS Diagnostics
  getHealth: async () => {
    const res = await fetch(`${API_BASE}/health`);
    return res.json();
  },

  // 1. Users (SELECT id, username, email FROM users)
  getUsers: async (): Promise<{ success: boolean; data: User[] }> => {
    const res = await fetch(`${API_BASE}/users`);
    return res.json();
  },

  // 2. Subjects (SELECT FROM subjects WHERE user_id = ?)
  getSubjects: async (userId: number): Promise<{ success: boolean; data: Subject[] }> => {
    const res = await fetch(`${API_BASE}/subjects/${userId}`);
    return res.json();
  },

  // Insert Subject (INSERT INTO subjects)
  addSubject: async (userId: number, name: string, colorCode: string) => {
    const res = await fetch(`${API_BASE}/subjects`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId, name, colorCode }),
    });
    return res.json();
  },

  // 3. Study Sessions (INNER JOIN ss JOIN subjects s)
  getSessions: async (userId: number): Promise<{ success: boolean; data: StudySession[] }> => {
    const res = await fetch(`${API_BASE}/sessions/${userId}`);
    return res.json();
  },

  // Insert Study Session (INSERT INTO study_sessions)
  addSession: async (data: {
    userId: number;
    subjectId: number;
    durationMinutes: number;
    sessionDate: string;
    notes?: string;
  }) => {
    const res = await fetch(`${API_BASE}/sessions`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    return res.json();
  },

  // Update Study Session (UPDATE study_sessions SET ...)
  updateSession: async (
    sessionId: number,
    data: {
      subjectId: number;
      durationMinutes: number;
      sessionDate: string;
      notes?: string;
    }
  ) => {
    const res = await fetch(`${API_BASE}/sessions/${sessionId}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    return res.json();
  },

  // Delete Study Session (DELETE FROM study_sessions WHERE id = ?)
  deleteSession: async (sessionId: number) => {
    const res = await fetch(`${API_BASE}/sessions/${sessionId}`, {
      method: 'DELETE',
    });
    return res.json();
  },

  // 4. Relational View: v_subject_study_summary (SELECT * FROM v_subject_study_summary)
  getSummary: async (userId: number): Promise<{ success: boolean; data: SubjectSummary[] }> => {
    const res = await fetch(`${API_BASE}/summary/${userId}`);
    return res.json();
  },

  // 5. Data Visualization: Trigger Python Matplotlib Engine
  refreshCharts: async (userId: number) => {
    const res = await fetch(`${API_BASE}/charts/refresh/${userId}`, {
      method: 'POST',
    });
    return res.json();
  },
};
