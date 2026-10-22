import React, { useState, useEffect, useRef } from 'react';
import {
  Play,
  Pause,
  Square,
  BookOpen,
  BarChart3,
  RefreshCw,
  Plus,
  Trash2,
  Database,
  Calendar,
  Layers,
  Code2,
  CheckCircle2,
  PieChart as PieIcon,
  TrendingUp,
  Sliders,
  Pencil,
  Check,
  LogOut,
} from 'lucide-react';
import { api, getToken, setToken, UNAUTHORIZED_EVENT } from './api';
import { Auth } from './Auth';
import { Subject, StudySession, SubjectSummary, User } from './types';

// Charts are per-user and need the auth header, so they are fetched as blobs
function ChartImage({ name, refreshKey, alt }: { name: string; refreshKey: number; alt: string }) {
  const [url, setUrl] = useState<string | null>(null);
  useEffect(() => {
    let active = true;
    let created: string | null = null;
    api.getChartUrl(name).then((u) => {
      created = u;
      if (active) setUrl(u);
      else if (u) URL.revokeObjectURL(u);
    });
    return () => {
      active = false;
      if (created) URL.revokeObjectURL(created);
    };
  }, [name, refreshKey]);
  if (!url) return <span className="text-xs text-zinc-500">Chart not available yet</span>;
  return <img src={url} alt={alt} className="w-full h-auto object-contain rounded-lg" />;
}

const localDate = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
};

export function App() {
  const [user, setUser] = useState<User | null>(null);
  const [checking, setChecking] = useState<boolean>(!!getToken());

  useEffect(() => {
    if (getToken()) {
      api.me().then((r) => setUser(r.success && r.user ? r.user : null)).catch(() => {}).finally(() => setChecking(false));
    }
    const onUnauthorized = () => {
      setToken(null);
      setUser(null);
    };
    window.addEventListener(UNAUTHORIZED_EVENT, onUnauthorized);
    return () => window.removeEventListener(UNAUTHORIZED_EVENT, onUnauthorized);
  }, []);

  if (checking) return <div className="min-h-screen bg-[#09090b]" />;
  if (!user) return <Auth onAuthed={setUser} />;
  return (
    <Dashboard
      user={user}
      onLogout={() => {
        setToken(null);
        setUser(null);
      }}
    />
  );
}

function Dashboard({ user, onLogout }: { user: User; onLogout: () => void }) {
  // Navigation Pages: 'tracker' | 'analytics'
  const [activeTab, setActiveTab] = useState<'tracker' | 'analytics'>('tracker');

  // Data States
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [selectedSubjectId, setSelectedSubjectId] = useState<number>(0);
  const [sessions, setSessions] = useState<StudySession[]>([]);
  const [summary, setSummary] = useState<SubjectSummary[]>([]);

  // Stopwatch Timer State
  const [timerStatus, setTimerStatus] = useState<'IDLE' | 'ACTIVE' | 'PAUSED'>('IDLE');
  const [elapsedSeconds, setElapsedSeconds] = useState<number>(0);
  const timerRef = useRef<any>(null);
  const baseSecondsRef = useRef<number>(0);

  // Manual Session Entry Form
  const [manualDuration, setManualDuration] = useState<number>(60);
  const [manualDate, setManualDate] = useState<string>(
    localDate()
  );
  const [manualNotes, setManualNotes] = useState<string>('');

  // Add Subject Inline Modal
  const [showAddSubject, setShowAddSubject] = useState<boolean>(false);
  const [newSubName, setNewSubName] = useState<string>('');
  const [newSubColor, setNewSubColor] = useState<string>('#3B82F6');

  // Edit Session State (DML UPDATE)
  const [editingSessionId, setEditingSessionId] = useState<number | null>(null);
  const [editSubjectId, setEditSubjectId] = useState<number>(0);
  const [editDuration, setEditDuration] = useState<number>(60);
  const [editDate, setEditDate] = useState<string>('');
  const [editNotes, setEditNotes] = useState<string>('');

  // Deleting State & Toast Feedback
  const [deletingId, setDeletingId] = useState<number | null>(null);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3000);
  };

  // Charts
  const [chartKey, setChartKey] = useState<number>(Date.now());
  const [isRefreshingCharts, setIsRefreshingCharts] = useState<boolean>(false);

  // Initial Load: Fetch Health & Load Single Student Data
  useEffect(() => {
    loadUserData();
  }, []);

  // Stopwatch Interval
  useEffect(() => {
    if (timerStatus === 'ACTIVE') {
      // Derive elapsed time from timestamps so background-tab throttling can't skew it
      const startedAt = Date.now();
      baseSecondsRef.current = elapsedSeconds;
      timerRef.current = setInterval(() => {
        setElapsedSeconds(baseSecondsRef.current + Math.floor((Date.now() - startedAt) / 1000));
      }, 250);
    } else {
      if (timerRef.current) clearInterval(timerRef.current);
    }
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [timerStatus]);

  // Data Fetching Functions
  const loadUserData = async () => {
    try {
      const [subRes, sessRes, sumRes] = await Promise.all([
        api.getSubjects(),
        api.getSessions(),
        api.getSummary(),
      ]);

      if (subRes.success) {
        setSubjects(subRes.data);
        if (subRes.data.length > 0 && selectedSubjectId === 0) {
          setSelectedSubjectId(subRes.data[0].id);
        }
      }
      if (sessRes.success) {
        setSessions(sessRes.data);
      }
      if (sumRes.success) {
        setSummary(sumRes.data);
      }
      setChartKey(Date.now());
    } catch (err) {
      console.error('Error loading data:', err);
    }
  };

  // Stopwatch Handlers
  const handleStartTimer = () => {
    if (!selectedSubjectId) return;
    setTimerStatus('ACTIVE');
  };

  const handlePauseTimer = () => setTimerStatus('PAUSED');
  const handleResumeTimer = () => setTimerStatus('ACTIVE');

  const handleStopAndSaveTimer = async () => {
    if (!selectedSubjectId) return;
    const durationMins = Math.max(1, Math.round(elapsedSeconds / 60));
    try {
      const res = await api.addSession({
        subjectId: selectedSubjectId,
        durationMinutes: durationMins,
        sessionDate: localDate(),
        notes: `Stopwatch session (${durationMins} min)`,
      });
      if (!res.success) {
        showToast(res.error || 'Failed to save session');
        return;
      }

      setTimerStatus('IDLE');
      setElapsedSeconds(0);
      showToast('Study session saved!');
      loadUserData();
      setChartKey(Date.now());
    } catch (err) {
      console.error('Error saving session:', err);
      showToast('Failed to save session');
    }
  };

  // Manual Session Submit Handler (DML INSERT)
  const handleManualSessionSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedSubjectId || manualDuration <= 0) return;

    try {
      const res = await api.addSession({
        subjectId: selectedSubjectId,
        durationMinutes: Number(manualDuration),
        sessionDate: manualDate,
        notes: manualNotes,
      });
      if (!res.success) {
        showToast(res.error || 'Failed to log session');
        return;
      }

      setManualNotes('');
      showToast('Study session logged successfully!');
      loadUserData();
      setChartKey(Date.now());
    } catch (err) {
      console.error('Failed to log manual session:', err);
      showToast('Failed to log session');
    }
  };

  // Add Subject Handler (DML INSERT)
  const handleAddSubject = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newSubName.trim()) return;

    try {
      const res = await api.addSubject(newSubName.trim(), newSubColor);
      if (!res.success) {
        showToast(res.error || 'Failed to add subject');
        return;
      }
      setNewSubName('');
      setShowAddSubject(false);
      showToast(`Subject "${newSubName.trim()}" added!`);
      loadUserData();
    } catch (err) {
      console.error('Failed to add subject:', err);
      showToast('Failed to add subject');
    }
  };

  // Edit Session Handlers (DML UPDATE)
  const startEditing = (sess: StudySession) => {
    setEditingSessionId(sess.id);
    setEditSubjectId(sess.subject_id);
    setEditDuration(sess.duration_minutes);
    setEditDate(sess.session_date);
    setEditNotes(sess.notes || '');
  };

  const cancelEditing = () => {
    setEditingSessionId(null);
  };

  const handleSaveEdit = async (id: number) => {
    if (!editSubjectId || editDuration <= 0) return;
    try {
      const res = await api.updateSession(id, {
        subjectId: editSubjectId,
        durationMinutes: Number(editDuration),
        sessionDate: editDate,
        notes: editNotes,
      });

      if (res.success) {
        showToast('Study log updated (DML UPDATE)!');
        setEditingSessionId(null);
        loadUserData();
        setChartKey(Date.now());
      } else {
        showToast('Update failed: ' + (res.error || 'Server error'));
      }
    } catch (err) {
      console.error('Failed to update session:', err);
      showToast('Failed to update session');
    }
  };

  // Delete Session Handler (DML DELETE with Optimistic UI)
  const handleDeleteSession = async (id: number) => {
    setSessions((prev) => prev.filter((s) => s.id !== id));
    setDeletingId(null);
    try {
      const res = await api.deleteSession(id);
      if (res.success) {
        showToast('Study session deleted (DML DELETE)');
        loadUserData();
        setChartKey(Date.now());
      } else {
        showToast('Delete failed: ' + (res.error || 'Server error'));
        loadUserData();
      }
    } catch (err) {
      console.error('Failed to delete session:', err);
      showToast('Error deleting session');
      loadUserData();
    }
  };

  // Refresh Charts Handler
  const handleRefreshCharts = async () => {
    setIsRefreshingCharts(true);
    try {
      await api.refreshCharts();
      setChartKey(Date.now());
    } catch (err) {
      console.error('Failed to refresh charts:', err);
    } finally {
      setIsRefreshingCharts(false);
    }
  };

  const formatTimer = (secs: number) => {
    const h = Math.floor(secs / 3600);
    const m = Math.floor((secs % 3600) / 60);
    const s = secs % 60;
    return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  const activeSubject = subjects.find((s) => s.id === selectedSubjectId);
  const totalUserMinutes = summary.reduce((acc, s) => acc + Number(s.total_minutes || 0), 0);
  const totalUserHours = (totalUserMinutes / 60).toFixed(1);

  return (
    <div className="min-h-screen bg-[#09090b] text-zinc-100 flex flex-col font-sans selection:bg-indigo-500">
      {/* Top Navigation Bar */}
      <header className="sticky top-0 z-50 bg-[#121216]/95 backdrop-blur-md border-b border-white/10 px-4 sm:px-8 py-3 flex flex-wrap items-center justify-between gap-4">
        {/* Brand & Academic Meta */}
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-cyan-500 via-indigo-500 to-purple-600 flex items-center justify-center shadow-lg shadow-indigo-500/20">
            <BookOpen className="w-5 h-5 text-white" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-extrabold text-base tracking-tight text-white">StudySync</span>
              <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-full bg-indigo-500/20 text-indigo-400 border border-indigo-500/30">
                Minimalist 3NF
              </span>
            </div>
            <p className="text-[11px] text-zinc-400">
              5th Sem DBMS & Data Visualization Project
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-zinc-900 border border-white/10 text-xs">
            <div className="w-5 h-5 rounded-full bg-gradient-to-tr from-cyan-500 to-indigo-600 flex items-center justify-center text-[10px] font-bold text-white">
              {user.username[0].toUpperCase()}
            </div>
            <span className="font-bold text-white">{user.username}</span>
          </div>
          <button
            onClick={onLogout}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs text-zinc-400 hover:text-white hover:bg-white/5 transition"
          >
            <LogOut className="w-3.5 h-3.5" />
            <span>Logout</span>
          </button>
        </div>
      </header>

      {/* Main Pages Navigation */}
      <div className="border-b border-white/5 bg-[#0f0f13] px-4 sm:px-8">
        <div className="max-w-6xl mx-auto flex items-center gap-2 py-2.5">
          <button
            onClick={() => setActiveTab('tracker')}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition ${
              activeTab === 'tracker'
                ? 'bg-indigo-600 text-white shadow-md'
                : 'text-zinc-400 hover:text-zinc-200 hover:bg-white/5'
            }`}
          >
            <Calendar className="w-4 h-4" />
            <span>Study Tracker</span>
          </button>

          <button
            onClick={() => setActiveTab('analytics')}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition ${
              activeTab === 'analytics'
                ? 'bg-indigo-600 text-white shadow-md'
                : 'text-zinc-400 hover:text-zinc-200 hover:bg-white/5'
            }`}
          >
            <BarChart3 className="w-4 h-4" />
            <span>Analytics</span>
          </button>
        </div>
      </div>

      {/* Main Content Area */}
      <main className="flex-1 max-w-6xl w-full mx-auto px-4 sm:px-6 py-8">
        {/* ========================================================================= */}
        {/* TAB 1: STUDY TRACKER & DML OPERATIONS                                    */}
        {/* ========================================================================= */}
        {activeTab === 'tracker' && (
          <div className="space-y-8">
            {/* Top Quick Stats Strip */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="bg-[#121216] p-4 rounded-xl border border-white/5 flex items-center justify-between">
                <div>
                  <span className="text-xs text-zinc-400 font-medium">Logged Study Time</span>
                  <div className="text-2xl font-black text-white mt-1">{totalUserHours}h</div>
                </div>
                <div className="w-10 h-10 rounded-lg bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-indigo-400">
                  <TrendingUp className="w-5 h-5" />
                </div>
              </div>

              <div className="bg-[#121216] p-4 rounded-xl border border-white/5 flex items-center justify-between">
                <div>
                  <span className="text-xs text-zinc-400 font-medium">Total Subjects</span>
                  <div className="text-2xl font-black text-white mt-1">{subjects.length}</div>
                </div>
                <div className="w-10 h-10 rounded-lg bg-purple-500/10 border border-purple-500/20 flex items-center justify-center text-purple-400">
                  <Layers className="w-5 h-5" />
                </div>
              </div>

              <div className="bg-[#121216] p-4 rounded-xl border border-white/5 flex items-center justify-between">
                <div>
                  <span className="text-xs text-zinc-400 font-medium">Logged Sessions</span>
                  <div className="text-2xl font-black text-white mt-1">{sessions.length}</div>
                </div>
                <div className="w-10 h-10 rounded-lg bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400">
                  <CheckCircle2 className="w-5 h-5" />
                </div>
              </div>
            </div>

            {/* Split Grid: Live Stopwatch (Left) & Quick Manual Logger (Right) */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
              {/* Left Column: Stopwatch */}
              <div className="lg:col-span-6 bg-[#121216] p-6 rounded-2xl border border-white/10 shadow-xl flex flex-col items-center">
                <div className="w-full flex items-center justify-between mb-4">
                  <span className="text-xs font-bold uppercase tracking-wider text-zinc-400 flex items-center gap-1.5">
                    <Database className="w-3.5 h-3.5 text-indigo-400" />
                    <span>Real-time Stopwatch</span>
                  </span>

                  <button
                    onClick={() => setShowAddSubject(!showAddSubject)}
                    className="text-xs text-indigo-400 hover:text-indigo-300 flex items-center gap-1 font-medium transition"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Add Subject</span>
                  </button>
                </div>

                {/* Inline Add Subject Form */}
                {showAddSubject && (
                  <form
                    onSubmit={handleAddSubject}
                    className="w-full mb-6 p-4 rounded-xl bg-zinc-900 border border-white/10 space-y-3"
                  >
                    <div className="text-xs font-semibold text-zinc-200">
                      Add New Subject
                    </div>
                    <div className="flex gap-2">
                      <input
                        type="text"
                        required
                        placeholder="Subject name (e.g. Compiler Design)"
                        value={newSubName}
                        onChange={(e) => setNewSubName(e.target.value)}
                        className="flex-1 px-3 py-2 text-xs rounded-lg bg-zinc-800 border border-white/10 text-white placeholder-zinc-500 focus:outline-none focus:border-indigo-500"
                      />
                      <input
                        type="color"
                        value={newSubColor}
                        onChange={(e) => setNewSubColor(e.target.value)}
                        className="w-10 h-8 rounded cursor-pointer bg-transparent"
                      />
                      <button
                        type="submit"
                        className="px-4 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-xs font-semibold text-white transition"
                      >
                        Save
                      </button>
                    </div>
                  </form>
                )}

                {/* Subject Selector */}
                <div className="w-full max-w-sm mb-6">
                  <label className="block text-[11px] font-semibold text-zinc-400 mb-1.5">
                    Select Subject:
                  </label>
                  <select
                    disabled={timerStatus !== 'IDLE'}
                    value={selectedSubjectId}
                    onChange={(e) => setSelectedSubjectId(Number(e.target.value))}
                    className="w-full py-2.5 px-3.5 rounded-xl bg-zinc-900 border border-white/10 text-sm font-semibold text-zinc-200 focus:outline-none focus:border-indigo-500 disabled:opacity-60 cursor-pointer"
                  >
                    {subjects.map((sub) => (
                      <option key={sub.id} value={sub.id}>
                        📖 {sub.name}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Circular Stopwatch Display */}
                <div className="relative w-56 h-56 rounded-full bg-zinc-950 border border-white/10 flex flex-col items-center justify-center p-6 shadow-2xl my-2">
                  <div
                    className={`absolute inset-2 rounded-full border border-dashed transition-all duration-700 ${
                      timerStatus === 'ACTIVE'
                        ? 'border-indigo-500 animate-[spin_40s_linear_infinite]'
                        : timerStatus === 'PAUSED'
                        ? 'border-amber-500'
                        : 'border-zinc-800'
                    }`}
                  />

                  <span
                    className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider mb-2 ${
                      timerStatus === 'ACTIVE'
                        ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/30'
                        : timerStatus === 'PAUSED'
                        ? 'bg-amber-500/10 text-amber-400 border border-amber-500/30'
                        : 'bg-zinc-800 text-zinc-400'
                    }`}
                  >
                    {timerStatus}
                  </span>

                  <div className="text-xs font-semibold text-zinc-300 max-w-[170px] truncate mb-2">
                    {activeSubject?.name || 'General'}
                  </div>

                  <div className="font-mono text-4xl font-black text-white tracking-tight">
                    {formatTimer(elapsedSeconds)}
                  </div>
                </div>

                {/* Stopwatch Action Buttons */}
                <div className="flex items-center gap-3 mt-6">
                  {timerStatus === 'IDLE' ? (
                    <button
                      onClick={handleStartTimer}
                      disabled={subjects.length === 0}
                      className="flex items-center gap-2 px-8 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs shadow-lg shadow-emerald-600/30 transition transform hover:scale-105 active:scale-95 disabled:opacity-50"
                    >
                      <Play className="w-4 h-4 fill-white" />
                      <span>Start Session</span>
                    </button>
                  ) : (
                    <>
                      {timerStatus === 'ACTIVE' ? (
                        <button
                          onClick={handlePauseTimer}
                          className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-amber-500/20 text-amber-400 border border-amber-500/30 hover:bg-amber-500/30 text-xs font-semibold transition"
                        >
                          <Pause className="w-4 h-4 fill-amber-400" />
                          <span>Pause</span>
                        </button>
                      ) : (
                        <button
                          onClick={handleResumeTimer}
                          className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 hover:bg-emerald-500/30 text-xs font-semibold transition"
                        >
                          <Play className="w-4 h-4 fill-emerald-400" />
                          <span>Resume</span>
                        </button>
                      )}

                      <button
                        onClick={handleStopAndSaveTimer}
                        className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-rose-500/20 text-rose-400 border border-rose-500/30 hover:bg-rose-500/30 text-xs font-semibold transition"
                      >
                        <Square className="w-4 h-4 fill-rose-400" />
                        <span>Stop & Save</span>
                      </button>
                    </>
                  )}
                </div>
              </div>

              {/* Right Column: Direct Manual Session Logger */}
              {/* Right Column: Direct Manual Session Logger */}
              <div className="lg:col-span-6 bg-[#121216] p-6 rounded-2xl border border-white/10 shadow-xl space-y-4">
                <div className="border-b border-white/5 pb-3">
                  <div className="flex items-center gap-2">
                    <Code2 className="w-4 h-4 text-indigo-400" />
                    <h2 className="text-sm font-bold text-white">Log Study Session</h2>
                  </div>
                  <p className="text-[11px] text-zinc-400 mt-1">
                    Record completed study sessions into the database.
                  </p>
                </div>

                <form onSubmit={handleManualSessionSubmit} className="space-y-4">
                  <div>
                    <label className="block text-[11px] font-semibold text-zinc-400 mb-1">
                      Subject
                    </label>
                    <select
                      value={selectedSubjectId}
                      onChange={(e) => setSelectedSubjectId(Number(e.target.value))}
                      className="w-full py-2 px-3 rounded-xl bg-zinc-900 border border-white/10 text-xs font-semibold text-zinc-200 focus:outline-none focus:border-indigo-500"
                    >
                      {subjects.map((sub) => (
                        <option key={sub.id} value={sub.id}>
                          {sub.name}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-[11px] font-semibold text-zinc-400 mb-1">
                        Duration (Minutes)
                      </label>
                      <input
                        type="number"
                        min="1"
                        required
                        value={manualDuration}
                        onChange={(e) => setManualDuration(Number(e.target.value))}
                        className="w-full py-2 px-3 rounded-xl bg-zinc-900 border border-white/10 text-xs font-mono text-zinc-200 focus:outline-none focus:border-indigo-500"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] font-semibold text-zinc-400 mb-1">
                        Session Date
                      </label>
                      <input
                        type="date"
                        required
                        value={manualDate}
                        onChange={(e) => setManualDate(e.target.value)}
                        className="w-full py-2 px-3 rounded-xl bg-zinc-900 border border-white/10 text-xs font-mono text-zinc-200 focus:outline-none focus:border-indigo-500"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-[11px] font-semibold text-zinc-400 mb-1">
                      Topic / Study Notes
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. B-Trees, Normalization, Routing Protocols"
                      value={manualNotes}
                      onChange={(e) => setManualNotes(e.target.value)}
                      className="w-full py-2 px-3 rounded-xl bg-zinc-900 border border-white/10 text-xs text-zinc-200 placeholder-zinc-500 focus:outline-none focus:border-indigo-500"
                    />
                  </div>

                  <button
                    type="submit"
                    className="w-full py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-xs font-bold text-white shadow-md transition flex items-center justify-center gap-1.5"
                  >
                    <Plus className="w-4 h-4" />
                    <span>Log Study Session</span>
                  </button>
                </form>
              </div>
            </div>

            {/* Bottom Row: Recent Logged Sessions Table */}
            <div className="bg-[#121216] p-6 rounded-2xl border border-white/10 shadow-xl space-y-4">
              <div className="flex items-center justify-between pb-3 border-b border-white/5">
                <div>
                  <h3 className="text-sm font-bold text-white flex items-center gap-2">
                    <Database className="w-4 h-4 text-indigo-400" />
                    <span>Recent Study Sessions</span>
                  </h3>
                  <p className="text-[11px] text-zinc-400">
                    Logged study history retrieved from MySQL (3NF).
                  </p>
                </div>
                <span className="text-xs font-mono text-zinc-500">
                  Count: {sessions.length}
                </span>
              </div>

              {sessions.length === 0 ? (
                <div className="text-center py-8 text-xs text-zinc-500">
                  No sessions logged yet. Start the stopwatch or use manual entry above!
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs text-zinc-300">
                    <thead className="bg-zinc-900/80 text-[11px] uppercase tracking-wider text-zinc-400 font-semibold border-b border-white/5">
                      <tr>
                        <th className="py-2.5 px-3">ID</th>
                        <th className="py-2.5 px-3">Subject</th>
                        <th className="py-2.5 px-3">Duration</th>
                        <th className="py-2.5 px-3">Date</th>
                        <th className="py-2.5 px-3">Notes</th>
                        <th className="py-2.5 px-3 text-right">Action</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-white/5">
                      {sessions.map((sess) => {
                        const isEditing = editingSessionId === sess.id;
                        if (isEditing) {
                          return (
                            <tr key={sess.id} className="bg-indigo-950/30 border-l-2 border-indigo-500">
                              <td className="py-2.5 px-3 font-mono text-zinc-500">{sess.id}</td>
                              <td className="py-2.5 px-3">
                                <select
                                  value={editSubjectId}
                                  onChange={(e) => setEditSubjectId(Number(e.target.value))}
                                  className="w-full py-1 px-2 rounded bg-zinc-800 border border-indigo-500/50 text-xs font-semibold text-white focus:outline-none"
                                >
                                  {subjects.map((sub) => (
                                    <option key={sub.id} value={sub.id}>
                                      {sub.name}
                                    </option>
                                  ))}
                                </select>
                              </td>
                              <td className="py-2.5 px-3">
                                <div className="flex items-center gap-1">
                                  <input
                                    type="number"
                                    min="1"
                                    value={editDuration}
                                    onChange={(e) => setEditDuration(Number(e.target.value))}
                                    className="w-16 py-1 px-2 rounded bg-zinc-800 border border-indigo-500/50 text-xs font-mono text-white focus:outline-none"
                                  />
                                  <span className="text-[10px] text-zinc-400">m</span>
                                </div>
                              </td>
                              <td className="py-2.5 px-3">
                                <input
                                  type="date"
                                  value={editDate}
                                  onChange={(e) => setEditDate(e.target.value)}
                                  className="py-1 px-2 rounded bg-zinc-800 border border-indigo-500/50 text-xs font-mono text-white focus:outline-none"
                                />
                              </td>
                              <td className="py-2.5 px-3">
                                <input
                                  type="text"
                                  value={editNotes}
                                  onChange={(e) => setEditNotes(e.target.value)}
                                  className="w-full py-1 px-2 rounded bg-zinc-800 border border-indigo-500/50 text-xs text-white focus:outline-none"
                                  placeholder="Notes..."
                                />
                              </td>
                              <td className="py-2.5 px-3 text-right">
                                <div className="flex items-center gap-1.5 justify-end">
                                  <button
                                    onClick={() => handleSaveEdit(sess.id)}
                                    className="px-2.5 py-1 rounded bg-emerald-600 hover:bg-emerald-500 text-[11px] font-semibold text-white shadow transition flex items-center gap-1"
                                    title="Save changes (DML UPDATE)"
                                  >
                                    <Check className="w-3.5 h-3.5" />
                                    <span>Save</span>
                                  </button>
                                  <button
                                    onClick={cancelEditing}
                                    className="px-2 py-1 rounded bg-zinc-800 hover:bg-zinc-700 text-[11px] text-zinc-300 transition"
                                  >
                                    Cancel
                                  </button>
                                </div>
                              </td>
                            </tr>
                          );
                        }

                        return (
                          <tr key={sess.id} className="hover:bg-white/[0.02] transition">
                            <td className="py-2.5 px-3 font-mono text-zinc-500">{sess.id}</td>
                            <td className="py-2.5 px-3 font-semibold text-white flex items-center gap-2">
                              <span
                                className="w-2.5 h-2.5 rounded-full"
                                style={{ backgroundColor: sess.color_code || '#3B82F6' }}
                              />
                              <span>{sess.subject_name || 'Subject'}</span>
                            </td>
                            <td className="py-2.5 px-3 font-mono text-indigo-300">
                              {sess.duration_minutes} min ({Math.round(sess.duration_minutes / 60 * 10) / 10}h)
                            </td>
                            <td className="py-2.5 px-3 font-mono text-zinc-400">{sess.session_date}</td>
                            <td className="py-2.5 px-3 text-zinc-400 truncate max-w-xs">{sess.notes || '—'}</td>
                            <td className="py-2.5 px-3 text-right">
                              {deletingId === sess.id ? (
                                <div className="flex items-center gap-1.5 justify-end">
                                  <button
                                    onClick={() => handleDeleteSession(sess.id)}
                                    className="px-2 py-0.5 rounded bg-rose-600 hover:bg-rose-500 text-[10px] font-bold text-white shadow transition"
                                  >
                                    Delete
                                  </button>
                                  <button
                                    onClick={() => setDeletingId(null)}
                                    className="px-2 py-0.5 rounded bg-zinc-800 hover:bg-zinc-700 text-[10px] text-zinc-300 transition"
                                  >
                                    Cancel
                                  </button>
                                </div>
                              ) : (
                                <div className="flex items-center gap-1 justify-end">
                                  <button
                                    onClick={() => startEditing(sess)}
                                    className="text-zinc-500 hover:text-indigo-400 p-1.5 rounded hover:bg-indigo-500/10 transition inline-flex items-center justify-center"
                                    title="Edit session (DML UPDATE)"
                                  >
                                    <Pencil className="w-3.5 h-3.5" />
                                  </button>
                                  <button
                                    onClick={() => setDeletingId(sess.id)}
                                    className="text-zinc-500 hover:text-rose-400 p-1.5 rounded hover:bg-rose-500/10 transition inline-flex items-center justify-center"
                                    title="Delete session (DML DELETE)"
                                  >
                                    <Trash2 className="w-3.5 h-3.5" />
                                  </button>
                                </div>
                              )}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        )}

        {/* ========================================================================= */}
        {/* PAGE 2: STUDY ANALYTICS & VISUALIZATIONS                                 */}
        {/* ========================================================================= */}
        {activeTab === 'analytics' && (
          <div className="space-y-8">
            {/* Header & Refresh Controls */}
            <div className="bg-[#121216] p-6 rounded-2xl border border-white/10 shadow-xl flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <div className="flex items-center gap-2">
                  <BarChart3 className="w-5 h-5 text-indigo-400" />
                  <h2 className="text-base font-bold text-white tracking-tight">
                    Study Analytics & Visualizations
                  </h2>
                </div>
                <p className="text-xs text-zinc-400 mt-1">
                  Visual breakdown of study hours, subject allocation, and learning progress.
                </p>
              </div>

              <button
                onClick={handleRefreshCharts}
                disabled={isRefreshingCharts}
                className="flex items-center gap-2 px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold shadow-md transition disabled:opacity-50 self-start sm:self-auto"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${isRefreshingCharts ? 'animate-spin' : ''}`} />
                <span>{isRefreshingCharts ? 'Rendering Figures...' : 'Refresh Analytics'}</span>
              </button>
            </div>

            {/* 3 Core Matplotlib Figures Grid */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {/* Figure 1: Bar Chart */}
              <div className="bg-[#121216] rounded-2xl border border-white/10 overflow-hidden shadow-xl flex flex-col">
                <div className="p-4 border-b border-white/5 bg-zinc-900/60 flex items-center justify-between">
                  <div>
                    <h3 className="text-xs font-bold text-white">1. Categorical Bar Chart</h3>
                    <p className="text-[10px] text-zinc-400">Subject Hours vs Goal</p>
                  </div>
                  <span className="px-2 py-0.5 rounded text-[10px] font-mono bg-blue-500/10 text-blue-400 border border-blue-500/20">
                    plt.bar()
                  </span>
                </div>

                <div className="p-3 bg-[#121216] min-h-[220px] flex items-center justify-center">
                  <ChartImage name="daily_study" refreshKey={chartKey} alt="Subject Study Hours Bar Chart" />
                </div>

                <div className="p-4 border-t border-white/5 bg-zinc-950/40 text-[11px] space-y-2">
                  <div className="text-zinc-300 font-semibold flex items-center gap-1.5">
                    <Sliders className="w-3.5 h-3.5 text-blue-400" />
                    <span>DV Concept: Discrete Comparison</span>
                  </div>
                  <p className="text-zinc-400 text-[10px] leading-relaxed">
                    Uses categorical x-axis with height proportional to aggregate hours. Displays an horizontal benchmark quota line and direct numerical annotations.
                  </p>
                </div>
              </div>

              {/* Figure 2: Donut / Pie Chart */}
              <div className="bg-[#121216] rounded-2xl border border-white/10 overflow-hidden shadow-xl flex flex-col">
                <div className="p-4 border-b border-white/5 bg-zinc-900/60 flex items-center justify-between">
                  <div>
                    <h3 className="text-xs font-bold text-white">2. Proportional Donut Chart</h3>
                    <p className="text-[10px] text-zinc-400">Time Breakdown %</p>
                  </div>
                  <span className="px-2 py-0.5 rounded text-[10px] font-mono bg-purple-500/10 text-purple-400 border border-purple-500/20">
                    plt.pie()
                  </span>
                </div>

                <div className="p-3 bg-[#121216] min-h-[220px] flex items-center justify-center">
                  <ChartImage name="subject_distribution" refreshKey={chartKey} alt="Subject Time Distribution Donut Chart" />
                </div>

                <div className="p-4 border-t border-white/5 bg-zinc-950/40 text-[11px] space-y-2">
                  <div className="text-zinc-300 font-semibold flex items-center gap-1.5">
                    <PieIcon className="w-3.5 h-3.5 text-purple-400" />
                    <span>DV Concept: Part-to-Whole Ratio</span>
                  </div>
                  <p className="text-zinc-400 text-[10px] leading-relaxed">
                    Circular proportion visual with central cutout (donut). Slices are sized by percentage distribution using custom color mapping matching database records.
                  </p>
                </div>
              </div>

              {/* Figure 3: Line Chart */}
              <div className="bg-[#121216] rounded-2xl border border-white/10 overflow-hidden shadow-xl flex flex-col">
                <div className="p-4 border-b border-white/5 bg-zinc-900/60 flex items-center justify-between">
                  <div>
                    <h3 className="text-xs font-bold text-white">3. Longitudinal Trend Line</h3>
                    <p className="text-[10px] text-zinc-400">Cumulative Momentum</p>
                  </div>
                  <span className="px-2 py-0.5 rounded text-[10px] font-mono bg-cyan-500/10 text-cyan-400 border border-cyan-500/20">
                    plt.plot()
                  </span>
                </div>

                <div className="p-3 bg-[#121216] min-h-[220px] flex items-center justify-center">
                  <ChartImage name="study_trend" refreshKey={chartKey} alt="Cumulative Study Trend Line Chart" />
                </div>

                <div className="p-4 border-t border-white/5 bg-zinc-950/40 text-[11px] space-y-2">
                  <div className="text-zinc-300 font-semibold flex items-center gap-1.5">
                    <TrendingUp className="w-3.5 h-3.5 text-cyan-400" />
                    <span>DV Concept: Time-Series Progression</span>
                  </div>
                  <p className="text-zinc-400 text-[10px] leading-relaxed">
                    Evaluates temporal continuity. Markers highlight individual dates, while cumulative sum (<code>cumsum</code>) with transparent shading illustrates momentum over time.
                  </p>
                </div>
              </div>
            </div>

            {/* SQL Relational View Query Display */}
            <div className="bg-[#121216] p-6 rounded-2xl border border-white/10 shadow-xl space-y-4">
              <div className="flex items-center justify-between pb-3 border-b border-white/5">
                <div>
                  <h3 className="text-sm font-bold text-white flex items-center gap-2">
                    <Code2 className="w-4 h-4 text-emerald-400" />
                    <span>Live Database View: v_subject_study_summary</span>
                  </h3>
                  <p className="text-[11px] text-zinc-400">
                    Output of <code>SELECT * FROM v_subject_study_summary WHERE user_id = {user.id}</code>
                  </p>
                </div>
                <span className="text-[10px] uppercase font-mono px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                  SQL VIEW
                </span>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs text-zinc-300">
                  <thead className="bg-zinc-900/80 text-[11px] uppercase tracking-wider text-zinc-400 font-semibold border-b border-white/5">
                    <tr>
                      <th className="py-2.5 px-3">Subject ID</th>
                      <th className="py-2.5 px-3">Subject Name</th>
                      <th className="py-2.5 px-3">Total Sessions</th>
                      <th className="py-2.5 px-3">Total Minutes</th>
                      <th className="py-2.5 px-3">Total Hours (ROUND)</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/5">
                    {summary.map((row) => (
                      <tr key={row.subject_id} className="hover:bg-white/[0.02] transition">
                        <td className="py-2.5 px-3 font-mono text-zinc-500">{row.subject_id}</td>
                        <td className="py-2.5 px-3 font-semibold text-white flex items-center gap-2">
                          <span
                            className="w-2.5 h-2.5 rounded-full"
                            style={{ backgroundColor: row.color_code }}
                          />
                          <span>{row.subject_name}</span>
                        </td>
                        <td className="py-2.5 px-3 font-mono text-zinc-300">{row.total_sessions}</td>
                        <td className="py-2.5 px-3 font-mono text-zinc-300">{row.total_minutes}m</td>
                        <td className="py-2.5 px-3 font-mono font-bold text-emerald-400">
                          {row.total_hours}h
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}
      </main>

      {/* Footer */}
      <footer className="border-t border-white/5 py-4 px-6 text-center text-xs text-zinc-500">
        StudySync • 5th Semester DBMS & Data Visualization Project • Minimal 3NF Architecture
      </footer>
      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed bottom-6 right-6 z-50 px-4 py-2.5 rounded-xl bg-zinc-900 border border-emerald-500/40 text-xs font-semibold text-white shadow-2xl flex items-center gap-2 animate-bounce">
          <CheckCircle2 className="w-4 h-4 text-emerald-400" />
          <span>{toastMessage}</span>
        </div>
      )}
    </div>
  );
}

export default App;
