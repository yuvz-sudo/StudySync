import { Router, Request, Response, NextFunction } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { pool } from './db';

const JWT_SECRET = process.env.JWT_SECRET || 'dev-secret-change-me';
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '7d';

export interface AuthRequest extends Request {
  userId?: number;
}

const sign = (id: number, username: string) =>
  jwt.sign({ id, username }, JWT_SECRET, { expiresIn: JWT_EXPIRES_IN } as jwt.SignOptions);

export function requireAuth(req: AuthRequest, res: Response, next: NextFunction) {
  const header = req.headers.authorization || '';
  const token = header.startsWith('Bearer ') ? header.slice(7) : '';
  try {
    const payload = jwt.verify(token, JWT_SECRET) as { id: number };
    req.userId = payload.id;
    next();
  } catch {
    res.status(401).json({ success: false, error: 'Not authenticated' });
  }
}

export const authRouter = Router();

authRouter.post('/register', async (req: Request, res: Response) => {
  const { username, email, password } = req.body || {};
  if (!username?.trim() || !email?.trim() || !password || password.length < 6) {
    res.status(400).json({ success: false, error: 'Username, email and a password of 6+ characters are required' });
    return;
  }
  try {
    const hash = await bcrypt.hash(password, 10);
    const [result]: any = await pool.query(
      'INSERT INTO users (username, email, password_hash) VALUES (?, ?, ?)',
      [username.trim(), email.trim(), hash]
    );
    const user = { id: result.insertId, username: username.trim(), email: email.trim() };
    res.json({ success: true, token: sign(user.id, user.username), user });
  } catch (err: any) {
    if (err.code === 'ER_DUP_ENTRY') {
      res.status(409).json({ success: false, error: 'Username or email already taken' });
      return;
    }
    res.status(500).json({ success: false, error: err.message });
  }
});

authRouter.post('/login', async (req: Request, res: Response) => {
  const { username, password } = req.body || {};
  if (!username || !password) {
    res.status(400).json({ success: false, error: 'Username and password are required' });
    return;
  }
  try {
    const [rows]: any = await pool.query(
      'SELECT id, username, email, password_hash FROM users WHERE username = ? OR email = ?',
      [username, username]
    );
    const row = rows[0];
    if (!row || !(await bcrypt.compare(password, row.password_hash))) {
      res.status(401).json({ success: false, error: 'Invalid username or password' });
      return;
    }
    const user = { id: row.id, username: row.username, email: row.email };
    res.json({ success: true, token: sign(user.id, user.username), user });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

authRouter.get('/me', requireAuth, async (req: AuthRequest, res: Response) => {
  const [rows]: any = await pool.query('SELECT id, username, email FROM users WHERE id = ?', [req.userId]);
  if (!rows[0]) {
    res.status(401).json({ success: false, error: 'User no longer exists' });
    return;
  }
  res.json({ success: true, user: rows[0] });
});
