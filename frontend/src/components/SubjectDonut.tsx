import { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { DonutChart } from '@/components/ui/donut-chart';
import { Card } from '@/components/ui/card';
import { cn } from '@/lib/utils';
import { SubjectSummary } from '@/types';

// Interactive donut of study minutes per subject, fed by the v_subject_study_summary rows
export function SubjectDonut({ summary }: { summary: SubjectSummary[] }) {
  const [hovered, setHovered] = useState<string | null>(null);

  const data = summary
    .filter((s) => Number(s.total_minutes) > 0)
    .map((s) => ({ value: Number(s.total_minutes), color: s.color_code, label: s.subject_name }));
  const total = data.reduce((sum, d) => sum + d.value, 0);
  const active = data.find((d) => d.label === hovered);
  const fmt = (m: number) => `${(m / 60).toFixed(1)}h`;

  return (
    <Card className="p-6 w-full flex flex-col md:flex-row items-center gap-8 shadow-xl rounded-2xl border-white/10">
      <div className="flex flex-col items-center gap-3">
        <h3 className="text-sm font-bold text-foreground">Subject Breakdown (all time)</h3>
        {data.length === 0 ? (
          <p className="text-xs text-muted-foreground py-16">No study sessions yet.</p>
        ) : (
          <DonutChart
            data={data}
            size={240}
            strokeWidth={28}
            onSegmentHover={(seg) => setHovered(seg?.label ?? null)}
            centerContent={
              <AnimatePresence mode="wait">
                <motion.div
                  key={active?.label ?? 'total'}
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.9 }}
                  transition={{ duration: 0.2 }}
                  className="flex flex-col items-center text-center"
                >
                  <p className="text-muted-foreground text-xs font-medium truncate max-w-[130px]">{active?.label ?? 'All-time total'}</p>
                  <p className="text-3xl font-bold text-foreground">{fmt(active?.value ?? total)}</p>
                  {active && <p className="text-sm text-muted-foreground">{Math.round((active.value / total) * 100)}%</p>}
                </motion.div>
              </AnimatePresence>
            }
          />
        )}
      </div>

      <div className="flex-1 w-full space-y-1">
        {data.map((d) => (
          <div
            key={d.label}
            onMouseEnter={() => setHovered(d.label)}
            onMouseLeave={() => setHovered(null)}
            className={cn('flex items-center justify-between p-2 rounded-md transition-colors cursor-pointer', hovered === d.label && 'bg-muted')}
          >
            <div className="flex items-center gap-3">
              <span className="h-3 w-3 rounded-full" style={{ backgroundColor: d.color }} />
              <span className="text-sm font-medium text-foreground">{d.label}</span>
            </div>
            <span className="text-sm font-semibold text-muted-foreground">{fmt(d.value)}</span>
          </div>
        ))}
      </div>
    </Card>
  );
}
