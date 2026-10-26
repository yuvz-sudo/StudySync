import { useEffect, useState } from 'react';
import { BarChart, type BarDatum } from '@/components/ui/bar-chart';
import { api } from '@/api';

const POLL_MS = 10_000;

// Hours studied in the last 7 days per subject, against each subject's weekly goal
export function WeeklyGoalsChart({ refreshKey }: { refreshKey: number }) {
  const [data, setData] = useState<BarDatum[] | null>(null);

  useEffect(() => {
    let active = true;
    const load = async () => {
      const res = await api.getGoals();
      if (!active || !res.success) return;
      setData(
        res.data
          .map((g) => ({
            label: g.subject_name,
            value: Number(g.week_minutes) / 60,
            color: g.color_code,
            goal: g.weekly_target_minutes ? g.weekly_target_minutes / 60 : null,
          }))
          .sort((a, b) => b.value - a.value)
      );
    };
    load();
    const timer = setInterval(load, POLL_MS);
    return () => {
      active = false;
      clearInterval(timer);
    };
  }, [refreshKey]);

  if (!data) return <p className="text-xs text-zinc-500">Loading…</p>;
  if (data.length === 0) return <p className="text-xs text-zinc-500">Add a subject to see your weekly progress.</p>;
  return <BarChart data={data} />;
}
