// Animated tab switcher with a glowing "tubelight" indicator, inspired by the Tubelight Navbar on 21st.dev
import { motion } from 'motion/react';
import type { LucideIcon } from 'lucide-react';
import { cn } from '../../lib/utils';

interface Tab<T extends string> {
  id: T;
  label: string;
  icon: LucideIcon;
}

export function TubelightTabs<T extends string>({ tabs, active, onChange }: { tabs: Tab<T>[]; active: T; onChange: (id: T) => void }) {
  return (
    <div className="inline-flex items-center gap-1 rounded-full border border-white/10 bg-white/5 p-1 backdrop-blur">
      {tabs.map(({ id, label, icon: Icon }) => {
        const isActive = id === active;
        return (
          <button
            key={id}
            onClick={() => onChange(id)}
            className={cn(
              'relative flex items-center gap-2 rounded-full px-4 py-2 text-xs font-bold transition-colors',
              isActive ? 'text-white' : 'text-zinc-400 hover:text-zinc-200'
            )}
          >
            {isActive && (
              <motion.div layoutId="tubelight" className="absolute inset-0 -z-10 rounded-full bg-indigo-500/15" transition={{ type: 'spring', stiffness: 350, damping: 30 }}>
                <div className="absolute -top-1.5 left-1/2 h-1 w-8 -translate-x-1/2 rounded-full bg-indigo-400">
                  <div className="absolute -left-2 -top-2 h-6 w-12 rounded-full bg-indigo-400/30 blur-md" />
                  <div className="absolute -top-1 h-4 w-8 rounded-full bg-indigo-400/30 blur-md" />
                </div>
              </motion.div>
            )}
            <Icon className="h-4 w-4" />
            <span>{label}</span>
          </button>
        );
      })}
    </div>
  );
}
