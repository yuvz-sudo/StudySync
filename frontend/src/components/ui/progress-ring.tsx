// SVG progress ring, modelled on Magic UI's Animated Circular Progress Bar
import { cn } from '../../lib/utils';

export function ProgressRing({ percent, color, trackColor = '#27272a', className }: { percent: number; color: string; trackColor?: string; className?: string }) {
  const r = 46;
  const c = 2 * Math.PI * r;
  const p = Math.min(100, Math.max(0, percent));
  return (
    <svg viewBox="0 0 100 100" className={cn('-rotate-90', className)} fill="none" strokeWidth="3.5" strokeLinecap="round">
      <circle cx="50" cy="50" r={r} stroke={trackColor} />
      <circle cx="50" cy="50" r={r} stroke={color} strokeDasharray={`${(p / 100) * c} ${c}`} style={{ transition: 'stroke-dasharray 0.3s linear, stroke 0.5s' }} />
    </svg>
  );
}
