// @author Real-Time Analytics Component
import { useEffect, useState } from 'react';
import { Component as RealTimeAnalytics, type DataPoint } from '@/components/ui/real-time-analytics';
import { api } from '@/api';

const DAYS = 14;
const POLL_MS = 10_000;

const localMidnight = (d: Date) => new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();

// Daily study hours for the last 14 days, refreshed every 10s while the Analytics tab is open
export function StudyActivity({ refreshKey }: { refreshKey: number }) {
  const [data, setData] = useState<DataPoint[]>([]);

  useEffect(() => {
    let active = true;
    const load = async () => {
      const res = await api.getDaily();
      if (!active || !res.success) return;
      const byDay = new Map(res.data.map((r) => [r.session_date, Number(r.total_minutes)]));
      const today = new Date();
      const points: DataPoint[] = [];
      for (let i = DAYS - 1; i >= 0; i--) {
        const d = new Date(today.getFullYear(), today.getMonth(), today.getDate() - i);
        const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
        points.push({ time: localMidnight(d), value: (byDay.get(key) ?? 0) / 60 });
      }
      setData(points);
    };
    load();
    const timer = setInterval(load, POLL_MS);
    return () => {
      active = false;
      clearInterval(timer);
    };
  }, [refreshKey]);

  return (
    <RealTimeAnalytics
      title="Daily Study Activity"
      subtitle={`Hours studied per day, last ${DAYS} days (updates live)`}
      unit="h"
      liveLabel="Today"
      formatTime={(t) => new Date(t).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
      data={data}
    />
  );
}
