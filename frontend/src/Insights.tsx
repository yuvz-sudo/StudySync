import { useEffect, useState } from 'react';
import { Target, Tags, History } from 'lucide-react';
import { api } from './api';
import { Goal, TagSummary, AuditEntry } from './types';

const card = 'bg-[#121216] p-6 rounded-2xl border border-white/10 shadow-xl space-y-4';
const th = 'py-2.5 px-3';

// Goals (weekly target per subject), hours per tag (M:N view) and the trigger-filled audit log
export function Insights({ refreshKey, onGoalSaved }: { refreshKey: number; onGoalSaved: () => void }) {
  const [goals, setGoals] = useState<Goal[]>([]);
  const [draft, setDraft] = useState<Record<number, string>>({});
  const [tags, setTags] = useState<TagSummary[]>([]);
  const [audit, setAudit] = useState<AuditEntry[]>([]);
  const [error, setError] = useState('');

  useEffect(() => {
    Promise.all([api.getGoals(), api.getTagSummary(), api.getAudit()]).then(([g, t, a]) => {
      if (g.success) {
        setGoals(g.data);
        setDraft(Object.fromEntries(g.data.map((x) => [x.subject_id, x.weekly_target_minutes ? String(x.weekly_target_minutes / 60) : ''])));
      }
      if (t.success) setTags(t.data);
      if (a.success) setAudit(a.data);
    });
  }, [refreshKey]);

  const saveGoal = async (subjectId: number) => {
    const hours = Number(draft[subjectId] || 0);
    if (!(hours >= 0)) return;
    const res = await api.setGoal(subjectId, Math.round(hours * 60));
    setError(res.success ? '' : res.error || 'Could not save goal');
    if (res.success) onGoalSaved();
  };

  return (
    <>
      <div className={card}>
        <h3 className="text-sm font-bold text-white flex items-center gap-2">
          <Target className="w-4 h-4 text-emerald-400" />
          <span>Weekly Goals</span>
        </h3>
        <p className="text-[11px] text-zinc-400">Hours per week for each subject (leave empty for no goal). Last 7 days of progress shown.</p>
        {error && <p className="text-xs text-rose-400">{error}</p>}
        <div className="space-y-2">
          {goals.map((g) => {
            const pct = g.weekly_target_minutes ? Math.min(100, Math.round((g.week_minutes / g.weekly_target_minutes) * 100)) : 0;
            return (
              <div key={g.subject_id} className="flex flex-wrap items-center gap-3 text-xs">
                <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: g.color_code }} />
                <span className="w-56 truncate font-semibold text-white">{g.subject_name}</span>
                <div className="flex-1 min-w-[120px] h-2 rounded bg-zinc-800 overflow-hidden">
                  <div className="h-full bg-emerald-500" style={{ width: `${pct}%` }} />
                </div>
                <span className="w-24 font-mono text-zinc-400">{(g.week_minutes / 60).toFixed(1)}h{g.weekly_target_minutes ? ` / ${g.weekly_target_minutes / 60}h` : ''}</span>
                <input
                  type="number"
                  min="0"
                  step="0.5"
                  placeholder="hours"
                  value={draft[g.subject_id] ?? ''}
                  onChange={(e) => setDraft({ ...draft, [g.subject_id]: e.target.value })}
                  className="w-20 py-1 px-2 rounded bg-zinc-900 border border-white/10 font-mono text-zinc-200 focus:outline-none focus:border-indigo-500"
                />
                <button onClick={() => saveGoal(g.subject_id)} className="px-3 py-1 rounded bg-indigo-600 hover:bg-indigo-500 text-white font-semibold">
                  Set
                </button>
              </div>
            );
          })}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className={card}>
          <h3 className="text-sm font-bold text-white flex items-center gap-2">
            <Tags className="w-4 h-4 text-purple-400" />
            <span>Time by Tag</span>
          </h3>
          <p className="text-[11px] text-zinc-400">From the <code>v_tag_summary</code> view (sessions ↔ tags many-to-many).</p>
          {tags.length === 0 ? (
            <p className="text-xs text-zinc-500">No tags yet. Add comma-separated tags when logging a session.</p>
          ) : (
            <table className="w-full text-left text-xs text-zinc-300">
              <thead className="bg-zinc-900/80 text-[11px] uppercase tracking-wider text-zinc-400 border-b border-white/5">
                <tr><th className={th}>Tag</th><th className={th}>Sessions</th><th className={th}>Hours</th></tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {tags.map((t) => (
                  <tr key={t.tag_id}>
                    <td className={`${th} font-semibold text-white`}>{t.tag_name}</td>
                    <td className={`${th} font-mono`}>{t.total_sessions}</td>
                    <td className={`${th} font-mono text-emerald-400`}>{(Number(t.total_minutes) / 60).toFixed(1)}h</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        <div className={card}>
          <h3 className="text-sm font-bold text-white flex items-center gap-2">
            <History className="w-4 h-4 text-amber-400" />
            <span>Audit Log</span>
          </h3>
          <p className="text-[11px] text-zinc-400">Edits and deletions recorded by database triggers.</p>
          {audit.length === 0 ? (
            <p className="text-xs text-zinc-500">No changes yet.</p>
          ) : (
            <table className="w-full text-left text-xs text-zinc-300">
              <thead className="bg-zinc-900/80 text-[11px] uppercase tracking-wider text-zinc-400 border-b border-white/5">
                <tr><th className={th}>When</th><th className={th}>Action</th><th className={th}>Subject</th><th className={th}>Minutes</th></tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {audit.map((a) => (
                  <tr key={a.id}>
                    <td className={`${th} font-mono text-zinc-500`}>{a.changed_at}</td>
                    <td className={`${th} font-semibold ${a.action === 'DELETE' ? 'text-rose-400' : 'text-amber-400'}`}>{a.action}</td>
                    <td className={th}>{a.subject_name || '—'}</td>
                    <td className={`${th} font-mono`}>{a.old_duration}{a.new_duration != null ? ` → ${a.new_duration}` : ''}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </>
  );
}
