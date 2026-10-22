// Mouse-following spotlight card, in the style of the Spotlight / Magic Card components on 21st.dev
import { useRef, type ComponentPropsWithoutRef } from 'react';
import { cn } from '../../lib/utils';

export function SpotlightCard({ className, contentClassName, children, ...props }: ComponentPropsWithoutRef<'div'> & { contentClassName?: string }) {
  const ref = useRef<HTMLDivElement>(null);
  const onMove = (e: React.MouseEvent) => {
    const r = ref.current?.getBoundingClientRect();
    if (!r) return;
    ref.current!.style.setProperty('--x', `${e.clientX - r.left}px`);
    ref.current!.style.setProperty('--y', `${e.clientY - r.top}px`);
  };
  return (
    <div
      ref={ref}
      onMouseMove={onMove}
      className={cn('group relative overflow-hidden rounded-xl border border-white/5 bg-[#121216]', className)}
      {...props}
    >
      <div className="pointer-events-none absolute inset-0 opacity-0 transition-opacity duration-300 group-hover:opacity-100 [background:radial-gradient(240px_circle_at_var(--x,50%)_var(--y,50%),rgba(99,102,241,0.18),transparent_70%)]" />
      <div className={cn('relative', contentClassName)}>{children}</div>
    </div>
  );
}
