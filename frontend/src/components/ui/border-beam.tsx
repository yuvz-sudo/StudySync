// Adapted from Magic UI's Border Beam (MIT) https://magicui.design/docs/components/border-beam
// Reworked for Tailwind v3: the border mask is applied with inline styles.
import { motion, type MotionStyle } from 'motion/react';
import type { CSSProperties } from 'react';

interface BorderBeamProps {
  size?: number;
  duration?: number;
  colorFrom?: string;
  colorTo?: string;
  borderWidth?: number;
}

export function BorderBeam({ size = 60, duration = 6, colorFrom = '#38bdf8', colorTo = '#8b5cf6', borderWidth = 1.5 }: BorderBeamProps) {
  const mask: CSSProperties = {
    border: `${borderWidth}px solid transparent`,
    WebkitMask: 'linear-gradient(#000 0 0) padding-box, linear-gradient(#000 0 0)',
    WebkitMaskComposite: 'xor',
    mask: 'linear-gradient(#000 0 0) padding-box exclude, linear-gradient(#000 0 0)',
  };
  return (
    <div className="pointer-events-none absolute inset-0 rounded-[inherit]" style={mask}>
      <motion.div
        className="absolute aspect-square"
        style={
          {
            width: size,
            offsetPath: `rect(0 auto auto 0 round ${size}px)`,
            background: `linear-gradient(to left, ${colorFrom}, ${colorTo}, transparent)`,
          } as MotionStyle
        }
        initial={{ offsetDistance: '0%' }}
        animate={{ offsetDistance: ['0%', '100%'] }}
        transition={{ repeat: Infinity, ease: 'linear', duration }}
      />
    </div>
  );
}
