import { Router, Response } from 'express';
import path from 'path';
import fs from 'fs';
import { execFile } from 'child_process';
import { pool } from './db';
import { requireAuth, AuthRequest } from './auth';

const ANALYTICS_DIR = path.resolve(__dirname, '../../analytics');
const PYTHON_PATH = path.join(ANALYTICS_DIR, 'venv/bin/python');
const VISUALIZER_PATH = path.join(ANALYTICS_DIR, 'visualize.py');
const OUTPUT_DIR = path.join(ANALYTICS_DIR, 'output');
const CHART_NAMES = ['daily_study', 'subject_distribution', 'study_trend'];

export const apiRouter = Router();
apiRouter.use(requireAuth);

// Regenerate this user's Matplotlib charts
function renderCharts(userId: number): Promise<void> {
  return new Promise((resolve) => {
    execFile(PYTHON_PATH, [VISUALIZER_PATH, '--user', String(userId)], (err, _out, stderr) => {
      if (err) console.error('Chart generation failed:', stderr || err.message);
      resolve();
    });
  });
}

const today = () => new Date().toISOString().split('T')[0];
const fail = (res: Response, err: any) => res.status(500).json({ success: false, error: err.message });

// ---- Subjects --------------------------------------------------------------
apiRouter.get('/subjects', async (req: AuthRequest, res) => {
  try {
    const [rows] = await pool.query(
      'SELECT id, user_id, name, color_code FROM subjects WHERE user_id = ? ORDER BY name',
      [req.userId]
    );
    res.json({ success: true, data: rows });
  } catch (err) {
    fail(res, err);
  }
});

apiRouter.post('/subjects', async (req: AuthRequest, res) => {
  const { name, colorCode } = req.body || {};
  if (!name?.trim()) {
    res.status(400).json({ success: false, error: 'Subject name is required' });
    return;
  }
  try {
    const [result]: any = await pool.query(
      'INSERT INTO subjects (user_id, name, color_code) VALUES (?, ?, ?)',
      [req.userId, name.trim(), colorCode || '#3B82F6']
    );
    res.json({ success: true, id: result.insertId });
  } catch (err: any) {
    if (err.code === 'ER_DUP_ENTRY') {
      res.status(409).json({ success: false, error: 'You already have a subject with that name' });
      return;
    }
    fail(res, err);
  }
});

// ---- Study sessions (stopwatch + manual entries) -----------------------------
apiRouter.get('/sessions', async (req: AuthRequest, res) => {
  try {
    const [rows] = await pool.query(
      `SELECT ss.id, ss.user_id, ss.subject_id, ss.duration_minutes,
              DATE_FORMAT(ss.session_date, '%Y-%m-%d') AS session_date,
              ss.notes, s.name AS subject_name, s.color_code
       FROM study_sessions ss
       JOIN subjects s ON ss.subject_id = s.id
       WHERE ss.user_id = ?
       ORDER BY ss.session_date DESC, ss.id DESC
       LIMIT 20`,
      [req.userId]
    );
    res.json({ success: true, data: rows });
  } catch (err) {
    fail(res, err);
  }
});

apiRouter.post('/sessions', async (req: AuthRequest, res) => {
  const { subjectId, durationMinutes, sessionDate, notes } = req.body || {};
  const dur = Number(durationMinutes);
  if (!subjectId || !Number.isInteger(dur) || dur <= 0) {
    res.status(400).json({ success: false, error: 'Subject and a positive whole-minute duration are required' });
    return;
  }
  try {
    const [result]: any = await pool.query(
      'INSERT INTO study_sessions (user_id, subject_id, duration_minutes, session_date, notes) VALUES (?, ?, ?, ?, ?)',
      [req.userId, Number(subjectId), dur, sessionDate || today(), (notes || '').trim()]
    );
    await renderCharts(req.userId!);
    res.json({ success: true, id: result.insertId });
  } catch (err: any) {
    // The trigger raises SQLSTATE 45000 for invalid input
    res.status(err.sqlState === '45000' ? 400 : 500).json({ success: false, error: err.sqlMessage || err.message });
  }
});

apiRouter.put('/sessions/:id', async (req: AuthRequest, res) => {
  const { subjectId, durationMinutes, sessionDate, notes } = req.body || {};
  const dur = Number(durationMinutes);
  if (!subjectId || !Number.isInteger(dur) || dur <= 0) {
    res.status(400).json({ success: false, error: 'Subject and a positive whole-minute duration are required' });
    return;
  }
  try {
    const [result]: any = await pool.query(
      `UPDATE study_sessions ss
       JOIN subjects s ON s.id = ? AND s.user_id = ss.user_id
       SET ss.subject_id = s.id, ss.duration_minutes = ?, ss.session_date = ?, ss.notes = ?
       WHERE ss.id = ? AND ss.user_id = ?`,
      [Number(subjectId), dur, sessionDate || today(), (notes || '').trim(), Number(req.params.id), req.userId]
    );
    if (!result.affectedRows) {
      res.status(404).json({ success: false, error: 'Session not found' });
      return;
    }
    await renderCharts(req.userId!);
    res.json({ success: true });
  } catch (err) {
    fail(res, err);
  }
});

apiRouter.delete('/sessions/:id', async (req: AuthRequest, res) => {
  try {
    const [result]: any = await pool.query('DELETE FROM study_sessions WHERE id = ? AND user_id = ?', [
      Number(req.params.id),
      req.userId,
    ]);
    if (!result.affectedRows) {
      res.status(404).json({ success: false, error: 'Session not found' });
      return;
    }
    await renderCharts(req.userId!);
    res.json({ success: true });
  } catch (err) {
    fail(res, err);
  }
});

// ---- Analytics -------------------------------------------------------------
// Per-subject totals from the v_subject_study_summary view
apiRouter.get('/summary', async (req: AuthRequest, res) => {
  try {
    const [rows] = await pool.query(
      'SELECT * FROM v_subject_study_summary WHERE user_id = ? ORDER BY total_minutes DESC',
      [req.userId]
    );
    res.json({ success: true, data: rows });
  } catch (err) {
    fail(res, err);
  }
});

apiRouter.post('/charts/refresh', async (req: AuthRequest, res) => {
  await renderCharts(req.userId!);
  res.json({ success: true });
});

// Charts are per-user files, so they are served through the authenticated API
apiRouter.get('/charts/:name', (req: AuthRequest, res) => {
  if (!CHART_NAMES.includes(req.params.name)) {
    res.status(404).end();
    return;
  }
  const file = path.join(OUTPUT_DIR, `user_${req.userId}_${req.params.name}.png`);
  if (!fs.existsSync(file)) {
    res.status(404).end();
    return;
  }
  res.setHeader('Cache-Control', 'no-store');
  res.sendFile(file);
});
