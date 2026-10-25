// Adapted from Magic UI's Shimmer Button (MIT) https://magicui.design/docs/components/shimmer-button
// Reworked for Tailwind v3 (no container-query units or v4-only utilities).
import React, { type ComponentPropsWithoutRef, type CSSProperties } from 'react';
import { cn } from '../../lib/utils';

export interface ShimmerButtonProps extends ComponentPropsWithoutRef<'button'> {
  shimmerColor?: string;
  shimmerDuration?: string;
  background?: string;
}

export const ShimmerButton = React.forwardRef<HTMLButtonElement, ShimmerButtonProps>(
  ({ shimmerColor = '#ffffff', shimmerDuration = '3s', background = '#059669', className, children, ...props }, ref) => (
    <button
      ref={ref}
      style={{ '--shimmer-color': shimmerColor, '--speed': shimmerDuration, '--bg': background } as CSSProperties}
      className={cn(
        'group relative z-0 flex cursor-pointer items-center justify-center overflow-hidden rounded-xl border border-white/10 px-6 py-2.5 whitespace-nowrap text-white [background:var(--bg)]',
        'transform-gpu transition-transform duration-300 ease-in-out hover:scale-105 active:translate-y-px active:scale-95 disabled:opacity-50 disabled:hover:scale-100',
        className
      )}
      {...props}
    >
      {/* spinning spark, clipped to the button */}
      <div className="absolute inset-0 -z-20 overflow-hidden rounded-[inherit] blur-[2px]">
        <div className="absolute -inset-full animate-spin-around [background:conic-gradient(from_0deg,transparent_0,var(--shimmer-color)_60deg,transparent_90deg)]" />
      </div>
      {/* backdrop leaves a 1px rim where the spark shows */}
      <div className="absolute inset-[1px] -z-10 rounded-[inherit] [background:var(--bg)]" />
      {children}
      <div className="absolute inset-0 rounded-[inherit] shadow-[inset_0_-8px_10px_#ffffff1f] transition-all duration-300 group-hover:shadow-[inset_0_-6px_10px_#ffffff3f]" />
    </button>
  )
);
ShimmerButton.displayName = 'ShimmerButton';
