import React, { useState } from 'react';
import { BookOpen } from 'lucide-react';
import { api, setToken } from './api';
import { User } from './types';

const input =
  'w-full px-3 py-2.5 text-sm rounded-xl bg-zinc-900 border border-white/10 text-white placeholder-zinc-500 focus:outline-none focus:border-indigo-500';

export function Auth({ onAuthed }: { onAuthed: (user: User) => void }) {
  const [mode, setMode] = useState<'login' | 'register'>('login');
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setBusy(true);
    try {
      const res =
        mode === 'login'
          ? await api.login(username, password)
          : await api.register(username, email, password);
      if (res.success && res.token && res.user) {
        setToken(res.token);
        onAuthed(res.user);
      } else {
        setError(res.error || 'Something went wrong');
      }
    } catch {
      setError('Cannot reach the server');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#09090b] text-zinc-100 flex items-center justify-center px-4">
      <form onSubmit={submit} className="w-full max-w-sm bg-[#121216] border border-white/10 rounded-2xl p-6 space-y-4 shadow-xl">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-cyan-500 via-indigo-500 to-purple-600 flex items-center justify-center">
            <BookOpen className="w-5 h-5 text-white" />
          </div>
          <div>
            <div className="font-extrabold text-white">StudySync</div>
            <div className="text-[11px] text-zinc-400">{mode === 'login' ? 'Sign in to your dashboard' : 'Create your account'}</div>
          </div>
        </div>

        <input className={input} placeholder={mode === 'login' ? 'Username or email' : 'Username'} value={username} onChange={(e) => setUsername(e.target.value)} required />
        {mode === 'register' && (
          <input className={input} type="email" placeholder="Email" value={email} onChange={(e) => setEmail(e.target.value)} required />
        )}
        <input className={input} type="password" placeholder="Password (min 6 characters)" value={password} onChange={(e) => setPassword(e.target.value)} required minLength={6} />

        {error && <p className="text-xs text-rose-400">{error}</p>}

        <button type="submit" disabled={busy} className="w-full py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-sm font-bold text-white transition disabled:opacity-50">
          {mode === 'login' ? 'Sign in' : 'Create account'}
        </button>

        <button
          type="button"
          onClick={() => {
            setMode(mode === 'login' ? 'register' : 'login');
            setError('');
          }}
          className="w-full text-xs text-indigo-400 hover:text-indigo-300"
        >
          {mode === 'login' ? "No account? Register" : 'Already registered? Sign in'}
        </button>
      </form>
    </div>
  );
}
