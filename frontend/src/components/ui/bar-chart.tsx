"use client"

import { useState } from "react"
import { cn } from "@/lib/utils"

export interface BarDatum {
  label: string
  value: number
  color: string
  /** Optional target drawn as a dashed marker on the bar's track */
  goal?: number | null
}

interface BarChartProps {
  data: BarDatum[]
  unit?: string
  className?: string
}

// Horizontal bar chart: long category names stay readable, bars animate on change,
// hovering a row shows value, goal and progress.
export function BarChart({ data, unit = "h", className }: BarChartProps) {
  const [hovered, setHovered] = useState<string | null>(null)
  const max = Math.max(1, ...data.map((d) => Math.max(d.value, d.goal ?? 0)))
  const scale = max * 1.1

  return (
    <div className={cn("space-y-3", className)}>
      {data.map((d) => {
        const pct = (d.value / scale) * 100
        const goalPct = d.goal ? (d.goal / scale) * 100 : null
        const active = hovered === d.label
        const progress = d.goal ? Math.round((d.value / d.goal) * 100) : null
        return (
          <div
            key={d.label}
            onMouseEnter={() => setHovered(d.label)}
            onMouseLeave={() => setHovered(null)}
            className={cn("rounded-lg p-2 transition-colors", active && "bg-white/5")}
          >
            <div className="flex items-center justify-between text-xs mb-1.5">
              <span className="font-semibold text-white truncate pr-2">{d.label}</span>
              <span className="font-mono text-zinc-400 shrink-0">
                {d.value.toFixed(1)}
                {unit}
                {d.goal ? ` / ${d.goal.toFixed(1)}${unit}` : ""}
                {progress !== null && (
                  <span className={cn("ml-2", progress >= 100 ? "text-emerald-400" : "text-zinc-500")}>{progress}%</span>
                )}
              </span>
            </div>
            <div className="relative h-4 rounded bg-zinc-800/80">
              <div
                className="h-full rounded transition-all duration-700 ease-out"
                style={{
                  width: `${pct}%`,
                  backgroundColor: d.color,
                  filter: active ? `drop-shadow(0 0 6px ${d.color}) brightness(1.1)` : "none",
                }}
              />
              {goalPct !== null && (
                <div
                  className="absolute -top-1 -bottom-1 border-l-2 border-dashed border-emerald-400"
                  style={{ left: `${goalPct}%` }}
                  title="Weekly goal"
                />
              )}
            </div>
          </div>
        )
      })}
      {data.some((d) => d.goal) && (
        <div className="flex items-center gap-2 text-[10px] text-zinc-500 pt-1">
          <span className="inline-block h-3 border-l-2 border-dashed border-emerald-400" />
          <span>Weekly goal</span>
        </div>
      )}
    </div>
  )
}
