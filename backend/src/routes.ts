import { Router, Response } from 'express';
import path from 'path';
import fs from 'fs';
import { execFile } from 'child_process';
import { PoolConnection } from 'mysql2/promise';
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

// Normalise a tag list from the request: trimmed, lowercase, unique, no commas
function cleanTags(input: unknown): string[] {
  const raw = Array.isArray(input) ? input : typeof input === 'string' ? input.split(',') : [];
  const names = raw.map((t) => String(t).replace(/,/g, '').trim().toLowerCase().slice(0, 30)).filter(Boolean);
  return [...new Set(names)].slice(0, 10);
}

// Replace a session's tags (many-to-many via session_tags), creating tags as needed
async function setSessionTags(conn: PoolConnection, userId: number, sessionId: number, names: string[]) {
  await conn.query('DELETE FROM session_tags WHERE session_id = ?', [sessionId]);
  for (const name of names) {
    await conn.query('INSERT IGNORE INTO tags (user_id, name) VALUES (?, ?)', [userId, name]);
    await conn.query(
      `INSERT INTO session_tags (session_id, tag_id)
       SELECT ?, id FROM tags WHERE user_id = ? AND name = ?`,
      [sessionId, userId, name]
    );
  }
}

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
              ss.notes, s.name AS subject_name, s.color_code,
              (SELECT GROUP_CONCAT(t.name ORDER BY t.name)
                 FROM session_tags st JOIN tags t ON t.id = st.tag_id
                WHERE st.session_id = ss.id) AS tags
       FROM study_sessions ss
       JOIN subjects s ON ss.subject_id = s.id
       WHERE ss.user_id = ?
       ORDER BY ss.session_date DESC, ss.id DESC
       LIMIT 20`,
      [req.userId]
    );
    res.json({
      success: true,
      data: (rows as any[]).map((r) => ({ ...r, tags: r.tags ? String(r.tags).split(',') : [] })),
    });
  } catch (err) {
    fail(res, err);
  }
});

apiRouter.post('/sessions', async (req: AuthRequest, res) => {
  const { subjectId, durationMinutes, sessionDate, notes, tags } = req.body || {};
  const dur = Number(durationMinutes);
  if (!subjectId || !Number.isInteger(dur) || dur <= 0) {
    res.status(400).json({ success: false, error: 'Subject and a positive whole-minute duration are required' });
    return;
  }
  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();
    const [result]: any = await conn.query(
      'INSERT INTO study_sessions (user_id, subject_id, duration_minutes, session_date, notes) VALUES (?, ?, ?, ?, ?)',
      [req.userId, Number(subjectId), dur, sessionDate || today(), (notes || '').trim()]
    );
    await setSessionTags(conn, req.userId!, result.insertId, cleanTags(tags));
    await conn.commit();
    await renderCharts(req.userId!);
    res.json({ success: true, id: result.insertId });
  } catch (err: any) {
    await conn.rollback();
    // The trigger raises SQLSTATE 45000 for invalid input
    res.status(err.sqlState === '45000' ? 400 : 500).json({ success: false, error: err.sqlMessage || err.message });
  } finally {
    conn.release();
  }
});

apiRouter.put('/sessions/:id', async (req: AuthRequest, res) => {
  const { subjectId, durationMinutes, sessionDate, notes, tags } = req.body || {};
  const dur = Number(durationMinutes);
  if (!subjectId || !Number.isInteger(dur) || dur <= 0) {
    res.status(400).json({ success: false, error: 'Subject and a positive whole-minute duration are required' });
    return;
  }
  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();
    const [result]: any = await conn.query(
      `UPDATE study_sessions ss
       JOIN subjects s ON s.id = ? AND s.user_id = ss.user_id
       SET ss.subject_id = s.id, ss.duration_minutes = ?, ss.session_date = ?, ss.notes = ?
       WHERE ss.id = ? AND ss.user_id = ?`,
      [Number(subjectId), dur, sessionDate || today(), (notes || '').trim(), Number(req.params.id), req.userId]
    );
    if (!result.affectedRows) {
      await conn.rollback();
      res.status(404).json({ success: false, error: 'Session not found' });
      return;
    }
    if (tags !== undefined) await setSessionTags(conn, req.userId!, Number(req.params.id), cleanTags(tags));
    await conn.commit();
    await renderCharts(req.userId!);
    res.json({ success: true });
  } catch (err) {
    await conn.rollback();
    fail(res, err);
  } finally {
    conn.release();
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

// Per-tag totals from the v_tag_summary view (many-to-many JOIN)
apiRouter.get('/tag-summary', async (req: AuthRequest, res) => {
  try {
    const [rows] = await pool.query(
      'SELECT tag_id, tag_name, total_sessions, total_minutes FROM v_tag_summary WHERE user_id = ? ORDER BY total_minutes DESC',
      [req.userId]
    );
    res.json({ success: true, data: rows });
  } catch (err) {
    fail(res, err);
  }
});

// ---- Goals: weekly target per subject ----------------------------------------
apiRouter.get('/goals', async (req: AuthRequest, res) => {
  try {
    const [rows] = await pool.query(
      `SELECT s.id AS subject_id, s.name AS subject_name, s.color_code,
              g.weekly_target_minutes,
              COALESCE((SELECT SUM(ss.duration_minutes) FROM study_sessions ss
                         WHERE ss.subject_id = s.id AND ss.session_date > DATE_SUB(CURDATE(), INTERVAL 7 DAY)), 0) AS week_minutes
       FROM subjects s
       LEFT JOIN goals g ON g.subject_id = s.id AND g.user_id = s.user_id
       WHERE s.user_id = ?
       ORDER BY s.name`,
      [req.userId]
    );
    res.json({ success: true, data: rows });
  } catch (err) {
    fail(res, err);
  }
});

// Upsert a goal; a target of 0 removes it
apiRouter.put('/goals/:subjectId', async (req: AuthRequest, res) => {
  const target = Number(req.body?.weeklyTargetMinutes);
  const subjectId = Number(req.params.subjectId);
  if (!Number.isInteger(target) || target < 0) {
    res.status(400).json({ success: false, error: 'Weekly target must be a whole number of minutes' });
    return;
  }
  try {
    const [owned]: any = await pool.query('SELECT id FROM subjects WHERE id = ? AND user_id = ?', [subjectId, req.userId]);
    if (!owned[0]) {
      res.status(404).json({ success: false, error: 'Subject not found' });
      return;
    }
    if (target === 0) {
      await pool.query('DELETE FROM goals WHERE user_id = ? AND subject_id = ?', [req.userId, subjectId]);
    } else {
      await pool.query(
        `INSERT INTO goals (user_id, subject_id, weekly_target_minutes) VALUES (?, ?, ?)
         ON DUPLICATE KEY UPDATE weekly_target_minutes = VALUES(weekly_target_minutes)`,
        [req.userId, subjectId, target]
      );
    }
    await renderCharts(req.userId!);
    res.json({ success: true });
  } catch (err) {
    fail(res, err);
  }
});

// ---- Audit log (filled by database triggers) ------------------------------------
apiRouter.get('/audit', async (req: AuthRequest, res) => {
  try {
    const [rows] = await pool.query(
      `SELECT a.id, a.session_id, a.action, a.old_duration, a.new_duration,
              s.name AS subject_name, DATE_FORMAT(a.changed_at, '%Y-%m-%d %H:%i') AS changed_at
       FROM audit_log a
       LEFT JOIN subjects s ON s.id = a.old_subject_id
       WHERE a.user_id = ?
       ORDER BY a.id DESC
       LIMIT 10`,
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
