"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const cors_1 = __importDefault(require("cors"));
const path_1 = __importDefault(require("path"));
const child_process_1 = require("child_process");
const promise_1 = __importDefault(require("mysql2/promise"));
const dotenv_1 = __importDefault(require("dotenv"));
dotenv_1.default.config();
const app = (0, express_1.default)();
const PORT = process.env.PORT || 5001;
// Paths
const PYTHON_PATH = path_1.default.resolve(__dirname, '../../analytics/venv/bin/python');
const VISUALIZER_PATH = path_1.default.resolve(__dirname, '../../analytics/visualize.py');
const OUTPUT_DIR = path_1.default.resolve(__dirname, '../../analytics/output');
app.use((0, cors_1.default)());
app.use(express_1.default.json());
// Serve Matplotlib Generated Charts
app.use('/charts', express_1.default.static(OUTPUT_DIR));
// =============================================================================
// MySQL Connection Pool (mysql2)
// Minimalist, direct raw SQL connection without heavy ORM overhead
// =============================================================================
let pool = null;
let isDbConnected = false;
try {
    const dbUrl = process.env.DATABASE_URL;
    if (dbUrl) {
        pool = promise_1.default.createPool(dbUrl);
    }
    else {
        pool = promise_1.default.createPool({
            host: process.env.DB_HOST || 'localhost',
            port: Number(process.env.DB_PORT) || 3306,
            user: process.env.DB_USER || 'root',
            password: process.env.DB_PASSWORD || '',
            database: process.env.DB_NAME || 'studysync',
            waitForConnections: true,
            connectionLimit: 10,
            queueLimit: 0,
        });
    }
}
catch (err) {
    console.warn('⚠️ Could not initialize MySQL pool. Running in fallback mode.');
}
// Fallback in-memory state for seamless execution if MySQL server is offline
let mockUsers = [
    { id: 1, username: 'yuvraj', email: 'yuvraj@studysync.edu' },
    { id: 2, username: 'sarah', email: 'sarah@studysync.edu' },
    { id: 3, username: 'alex', email: 'alex@studysync.edu' },
];
let mockSubjects = [
    { id: 1, user_id: 1, name: 'Database Management Systems', color_code: '#3B82F6' },
    { id: 2, user_id: 1, name: 'Data Visualization', color_code: '#8B5CF6' },
    { id: 3, user_id: 1, name: 'Computer Networks', color_code: '#10B981' },
    { id: 4, user_id: 1, name: 'Operating Systems', color_code: '#F59E0B' },
    { id: 5, user_id: 1, name: 'Web Technologies', color_code: '#EC4899' },
    { id: 6, user_id: 2, name: 'Machine Learning', color_code: '#6366F1' },
    { id: 7, user_id: 2, name: 'Database Management Systems', color_code: '#3B82F6' },
    { id: 8, user_id: 3, name: 'Cyber Security', color_code: '#EF4444' },
];
let mockSessions = [
    { id: 1, user_id: 1, subject_id: 1, duration_minutes: 120, session_date: '2026-09-25', notes: 'ER modeling & Relational Algebra', subject_name: 'Database Management Systems', color_code: '#3B82F6' },
    { id: 2, user_id: 1, subject_id: 2, duration_minutes: 90, session_date: '2026-09-25', notes: 'Matplotlib subplots and custom dark themes', subject_name: 'Data Visualization', color_code: '#8B5CF6' },
    { id: 3, user_id: 1, subject_id: 1, duration_minutes: 150, session_date: '2026-09-26', notes: 'SQL Normalization 1NF to 3NF', subject_name: 'Database Management Systems', color_code: '#3B82F6' },
    { id: 4, user_id: 1, subject_id: 3, duration_minutes: 60, session_date: '2026-09-26', notes: 'TCP/IP and Socket programming', subject_name: 'Computer Networks', color_code: '#10B981' },
    { id: 5, user_id: 1, subject_id: 2, duration_minutes: 120, session_date: '2026-09-27', notes: 'Donut charts and time-series line plots', subject_name: 'Data Visualization', color_code: '#8B5CF6' },
];
// Helper to check DB connection
async function checkDbConnection() {
    if (!pool)
        return false;
    try {
        const [rows] = await pool.query('SELECT 1 as connected');
        isDbConnected = true;
        return true;
    }
    catch (e) {
        isDbConnected = false;
        return false;
    }
}
// -----------------------------------------------------------------------------
// 1. DBMS Health & Diagnostics
// -----------------------------------------------------------------------------
app.get('/api/health', async (_req, res) => {
    const connected = await checkDbConnection();
    res.json({
        status: 'healthy',
        mode: connected ? 'MySQL 8.0 (Live 3NF Database)' : 'Academic Mock Mode (MySQL offline)',
        databaseConnected: connected,
        architecture: 'Minimalist 3NF: users, subjects, study_sessions + 1 View + 1 Trigger',
    });
});
// -----------------------------------------------------------------------------
// 2. Users Endpoint (SELECT id, username, email FROM users)
// -----------------------------------------------------------------------------
app.get('/api/users', async (_req, res) => {
    if (await checkDbConnection()) {
        try {
            const [rows] = await pool.query('SELECT id, username, email FROM users ORDER BY id ASC');
            res.json({ success: true, data: rows });
            return;
        }
        catch (err) {
            console.warn('Falling back to mock users due to query error:', err.message);
        }
    }
    res.json({ success: true, data: mockUsers });
});
// -----------------------------------------------------------------------------
// 3. Subjects Endpoint (SELECT with WHERE user_id = ?)
// -----------------------------------------------------------------------------
app.get('/api/subjects/:userId', async (req, res) => {
    const userId = Number(req.params.userId) || 1;
    if (await checkDbConnection()) {
        try {
            const [rows] = await pool.query('SELECT id, user_id, name, color_code FROM subjects WHERE user_id = ? ORDER BY name ASC', [userId]);
            res.json({ success: true, data: rows });
            return;
        }
        catch (err) {
            console.warn('Falling back to mock subjects:', err.message);
        }
    }
    const filtered = mockSubjects.filter((s) => s.user_id === userId);
    res.json({ success: true, data: filtered });
});
// Add a Subject (INSERT INTO subjects)
app.post('/api/subjects', async (req, res) => {
    const { userId, name, colorCode } = req.body;
    if (!userId || !name) {
        res.status(400).json({ success: false, error: 'User ID and subject name are required' });
        return;
    }
    const color = colorCode || '#3B82F6';
    if (await checkDbConnection()) {
        try {
            const [result] = await pool.query('INSERT INTO subjects (user_id, name, color_code) VALUES (?, ?, ?)', [Number(userId), name.trim(), color]);
            res.json({ success: true, id: result.insertId, message: 'Subject created in MySQL' });
            return;
        }
        catch (err) {
            res.status(500).json({ success: false, error: err.message });
            return;
        }
    }
    const newSub = { id: Date.now(), user_id: Number(userId), name: name.trim(), color_code: color };
    mockSubjects.push(newSub);
    res.json({ success: true, id: newSub.id, message: 'Subject created (Mock)' });
});
// -----------------------------------------------------------------------------
// 4. Study Sessions Endpoint (Relational INNER JOIN ss JOIN subjects s)
// -----------------------------------------------------------------------------
app.get('/api/sessions/:userId', async (req, res) => {
    const userId = Number(req.params.userId) || 1;
    if (await checkDbConnection()) {
        try {
            const [rows] = await pool.query(`SELECT 
          ss.id, 
          ss.user_id, 
          ss.subject_id, 
          ss.duration_minutes, 
          DATE_FORMAT(ss.session_date, '%Y-%m-%d') as session_date, 
          ss.notes, 
          s.name as subject_name, 
          s.color_code
        FROM study_sessions ss
        JOIN subjects s ON ss.subject_id = s.id
        WHERE ss.user_id = ?
        ORDER BY ss.session_date DESC, ss.id DESC
        LIMIT 20`, [userId]);
            res.json({ success: true, data: rows });
            return;
        }
        catch (err) {
            console.warn('Falling back to mock sessions:', err.message);
        }
    }
    const filtered = mockSessions.filter((s) => s.user_id === userId);
    res.json({ success: true, data: filtered });
});
// Record a Study Session (INSERT INTO study_sessions)
app.post('/api/sessions', async (req, res) => {
    const { userId, subjectId, durationMinutes, sessionDate, notes } = req.body;
    if (!userId || !subjectId || !durationMinutes) {
        res.status(400).json({ success: false, error: 'User ID, subject ID, and duration are required' });
        return;
    }
    const dur = Number(durationMinutes);
    const date = sessionDate || new Date().toISOString().split('T')[0];
    const noteText = (notes || '').trim();
    if (await checkDbConnection()) {
        try {
            const [result] = await pool.query('INSERT INTO study_sessions (user_id, subject_id, duration_minutes, session_date, notes) VALUES (?, ?, ?, ?, ?)', [Number(userId), Number(subjectId), dur, date, noteText]);
            // Trigger Python visualizer to refresh charts in background
            (0, child_process_1.exec)(`"${PYTHON_PATH}" "${VISUALIZER_PATH}" --user ${Number(userId)}`, (err) => {
                if (err)
                    console.error('Python DV background error:', err.message);
            });
            res.json({ success: true, id: result.insertId, message: 'Session logged to MySQL' });
            return;
        }
        catch (err) {
            res.status(500).json({ success: false, error: err.message });
            return;
        }
    }
    const sub = mockSubjects.find((s) => s.id === Number(subjectId));
    const newSession = {
        id: Date.now(),
        user_id: Number(userId),
        subject_id: Number(subjectId),
        duration_minutes: dur,
        session_date: date,
        notes: noteText,
        subject_name: sub?.name || 'General',
        color_code: sub?.color_code || '#3B82F6',
    };
    mockSessions.unshift(newSession);
    // Trigger Python visualizer
    (0, child_process_1.exec)(`"${PYTHON_PATH}" "${VISUALIZER_PATH}" --user ${Number(userId)}`, () => { });
    res.json({ success: true, id: newSession.id, message: 'Session logged (Mock)' });
});
// Update a Study Session (UPDATE study_sessions SET ... WHERE id = ?)
app.put('/api/sessions/:id', async (req, res) => {
    const sessionId = Number(req.params.id);
    const { subjectId, durationMinutes, sessionDate, notes } = req.body;
    if (!subjectId || !durationMinutes) {
        res.status(400).json({ success: false, error: 'Subject ID and duration are required' });
        return;
    }
    const dur = Number(durationMinutes);
    const date = sessionDate || new Date().toISOString().split('T')[0];
    const noteText = (notes || '').trim();
    if (await checkDbConnection()) {
        try {
            await pool.query(`UPDATE study_sessions 
         SET subject_id = ?, duration_minutes = ?, session_date = ?, notes = ? 
         WHERE id = ?`, [Number(subjectId), dur, date, noteText, sessionId]);
            // Trigger Python visualizer to refresh charts in background
            (0, child_process_1.exec)(`"${PYTHON_PATH}" "${VISUALIZER_PATH}" --user 1`, (err) => {
                if (err)
                    console.error('Python DV background error on update:', err.message);
            });
            res.json({ success: true, message: 'Session updated in database' });
            return;
        }
        catch (err) {
            res.status(500).json({ success: false, error: err.message });
            return;
        }
    }
    // Fallback mock update
    const idx = mockSessions.findIndex((s) => s.id === sessionId);
    if (idx !== -1) {
        const sub = mockSubjects.find((s) => s.id === Number(subjectId));
        mockSessions[idx] = {
            ...mockSessions[idx],
            subject_id: Number(subjectId),
            duration_minutes: dur,
            session_date: date,
            notes: noteText,
            subject_name: sub?.name || mockSessions[idx].subject_name,
            color_code: sub?.color_code || mockSessions[idx].color_code,
        };
    }
    (0, child_process_1.exec)(`"${PYTHON_PATH}" "${VISUALIZER_PATH}" --user 1`, () => { });
    res.json({ success: true, message: 'Session updated (Mock)' });
});
// Delete a Study Session (DELETE FROM study_sessions WHERE id = ?)
app.delete('/api/sessions/:id', async (req, res) => {
    const sessionId = Number(req.params.id);
    if (await checkDbConnection()) {
        try {
            // Find user_id before deleting to trigger chart refresh
            const [rows] = await pool.query('SELECT user_id FROM study_sessions WHERE id = ?', [sessionId]);
            const userId = rows && rows[0] ? rows[0].user_id : null;
            await pool.query('DELETE FROM study_sessions WHERE id = ?', [sessionId]);
            if (userId) {
                (0, child_process_1.exec)(`"${PYTHON_PATH}" "${VISUALIZER_PATH}" --user ${Number(userId)}`, (err) => {
                    if (err)
                        console.error('Python DV refresh error on delete:', err.message);
                });
            }
            res.json({ success: true, message: 'Session deleted from database', userId });
            return;
        }
        catch (err) {
            res.status(500).json({ success: false, error: err.message });
            return;
        }
    }
    const deletedSession = mockSessions.find((s) => s.id === sessionId);
    mockSessions = mockSessions.filter((s) => s.id !== sessionId);
    if (deletedSession) {
        (0, child_process_1.exec)(`"${PYTHON_PATH}" "${VISUALIZER_PATH}" --user ${Number(deletedSession.user_id)}`, () => { });
    }
    res.json({ success: true, message: 'Session deleted (Mock)', userId: deletedSession?.user_id });
});
// -----------------------------------------------------------------------------
// 5. Relational View Query (SELECT * FROM v_subject_study_summary)
// -----------------------------------------------------------------------------
app.get('/api/summary/:userId', async (req, res) => {
    const userId = Number(req.params.userId) || 1;
    if (await checkDbConnection()) {
        try {
            const [rows] = await pool.query('SELECT * FROM v_subject_study_summary WHERE user_id = ? ORDER BY total_minutes DESC', [userId]);
            res.json({ success: true, data: rows });
            return;
        }
        catch (err) {
            console.warn('Falling back to aggregated mock summary:', err.message);
        }
    }
    // Generate view-like aggregation in fallback mode
    const userSubs = mockSubjects.filter((s) => s.user_id === userId);
    const summary = userSubs.map((s) => {
        const sSessions = mockSessions.filter((ss) => ss.subject_id === s.id);
        const totalMinutes = sSessions.reduce((sum, ss) => sum + ss.duration_minutes, 0);
        return {
            user_id: userId,
            subject_id: s.id,
            subject_name: s.name,
            color_code: s.color_code,
            total_sessions: sSessions.length,
            total_minutes: totalMinutes,
            total_hours: Number((totalMinutes / 60).toFixed(2)),
        };
    });
    res.json({ success: true, data: summary });
});
// -----------------------------------------------------------------------------
// 6. Data Visualization (DV) Engine Trigger
// -----------------------------------------------------------------------------
app.post('/api/charts/refresh/:userId', async (req, res) => {
    const userId = Number(req.params.userId) || 1;
    (0, child_process_1.exec)(`"${PYTHON_PATH}" "${VISUALIZER_PATH}" --user ${userId}`, (error, _stdout, stderr) => {
        if (error) {
            console.error('Python DV execution warning:', stderr);
        }
        const timestamp = Date.now();
        res.json({
            success: true,
            message: 'Visualizations regenerated via Matplotlib',
            charts: {
                barChart: `/charts/daily_study.png?t=${timestamp}`,
                donutChart: `/charts/subject_distribution.png?t=${timestamp}`,
                lineChart: `/charts/study_trend.png?t=${timestamp}`,
            },
        });
    });
});
// -----------------------------------------------------------------------------
// Start Express HTTP Server
// -----------------------------------------------------------------------------
app.listen(PORT, async () => {
    console.log(`===========================================================`);
    console.log(`🚀 StudySync Minimalist Server running on http://localhost:${PORT}`);
    const connected = await checkDbConnection();
    console.log(`📊 DBMS Status: ${connected ? 'Connected to MySQL 8.0' : 'Fallback Academic Mode'}`);
    console.log(`📈 Data Visualization Engine: Python Matplotlib (${VISUALIZER_PATH})`);
    console.log(`===========================================================`);
});
//# sourceMappingURL=server.js.map