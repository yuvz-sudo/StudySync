"use client"

import type React from "react"
import { useState, useRef } from "react"

export interface DataPoint {
  time: number
  value: number
}

interface RealTimeAnalyticsProps {
  data: DataPoint[]
  title?: string
  subtitle?: string
  unit?: string
  /** Label shown next to the pulsing dot and the latest value */
  liveLabel?: string
  /** Formats the time shown in the tooltip and on the x axis */
  formatTime?: (time: number) => string
}

const width = 800
const height = 300
const padding = { top: 20, right: 20, bottom: 40, left: 50 }

export function Component({
  data,
  title = "Real-time Activity",
  subtitle = "Live metrics",
  unit = "",
  liveLabel = "Live",
  formatTime = (t) => new Date(t).toLocaleTimeString(),
}: RealTimeAnalyticsProps) {
  const [hoveredPoint, setHoveredPoint] = useState<DataPoint | null>(null)
  const svgRef = useRef<SVGSVGElement>(null)

  const peak = Math.max(...data.map((d) => d.value), 0)
  const yMax = Math.max(1, Math.ceil(peak))

  const getX = (time: number) => {
    if (data.length < 2) return padding.left
    const minTime = data[0].time
    const range = data[data.length - 1].time - minTime || 1
    return padding.left + ((time - minTime) / range) * (width - padding.left - padding.right)
  }

  const getY = (value: number) => padding.top + (1 - value / yMax) * (height - padding.top - padding.bottom)

  const getPath = () => {
    if (data.length < 2) return ""
    return data.map((p, i) => `${i === 0 ? "M" : "L"} ${getX(p.time)},${getY(p.value)}`).join(" ")
  }

  const getAreaPath = () => {
    if (data.length < 2) return ""
    const bottomY = height - padding.bottom
    return `${getPath()} L ${getX(data[data.length - 1].time)},${bottomY} L ${getX(data[0].time)},${bottomY} Z`
  }

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!svgRef.current) return
    const rect = svgRef.current.getBoundingClientRect()
    // Convert from screen pixels to viewBox units, since the svg scales with its container
    const x = ((e.clientX - rect.left) / rect.width) * width
    let closest: DataPoint | null = null
    let minDist = Number.POSITIVE_INFINITY
    data.forEach((point) => {
      const dist = Math.abs(getX(point.time) - x)
      if (dist < minDist && dist < 30) {
        minDist = dist
        closest = point
      }
    })
    setHoveredPoint(closest)
  }

  const currentValue = data[data.length - 1]?.value || 0
  const average = data.reduce((a, b) => a + b.value, 0) / data.length || 0

  return (
    <div style={{ fontFamily: "inherit" }}>
      <style>{`
        @keyframes rta-pulse {
          0%, 100% { opacity: 1; r: 6; }
          50% { opacity: 0.7; r: 8; }
        }
        @keyframes rta-dot-pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.4; }
        }
        @keyframes rta-draw-line {
          from { stroke-dashoffset: 1500; }
          to { stroke-dashoffset: 0; }
        }
        .rta-line { stroke-dasharray: 1500; animation: rta-draw-line 2s ease-out forwards; }
        .rta-dot { animation: rta-pulse 2s ease-in-out infinite; }
        .rta-glow { filter: drop-shadow(0 0 8px rgba(99, 102, 241, 0.6)); }
      `}</style>

      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "24px", gap: "12px", flexWrap: "wrap" }}>
        <div>
          <h2 style={{ fontSize: "24px", fontWeight: 700, color: "white", marginBottom: "4px" }}>{title}</h2>
          <p style={{ color: "#64748b", fontSize: "14px" }}>{subtitle}</p>
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: "12px", padding: "12px 20px", backgroundColor: "#1a1a1a", borderRadius: "12px" }}>
          <div style={{ width: "10px", height: "10px", borderRadius: "50%", backgroundColor: "#22c55e", animation: "rta-dot-pulse 1.5s ease-in-out infinite" }} />
          <span style={{ color: "#94a3b8", fontSize: "14px" }}>{liveLabel}</span>
          <span style={{ color: "white", fontSize: "24px", fontWeight: 700, marginLeft: "8px" }}>
            {currentValue.toFixed(1)}
            {unit}
          </span>
        </div>
      </div>

      <div style={{ backgroundColor: "#1a1a1a", borderRadius: "16px", padding: "24px" }}>
        <div style={{ position: "relative" }}>
          <svg
            ref={svgRef}
            viewBox={`0 0 ${width} ${height}`}
            onMouseMove={handleMouseMove}
            onMouseLeave={() => setHoveredPoint(null)}
            style={{ cursor: "crosshair", width: "100%", height: "auto", display: "block" }}
          >
            <defs>
              <linearGradient id="rtaLineGradient" x1="0%" y1="0%" x2="100%" y2="0%">
                <stop offset="0%" stopColor="#6366f1">
                  <animate attributeName="stop-color" values="#6366f1;#8b5cf6;#6366f1" dur="3s" repeatCount="indefinite" />
                </stop>
                <stop offset="50%" stopColor="#8b5cf6">
                  <animate attributeName="stop-color" values="#8b5cf6;#a855f7;#8b5cf6" dur="3s" repeatCount="indefinite" />
                </stop>
                <stop offset="100%" stopColor="#a855f7">
                  <animate attributeName="stop-color" values="#a855f7;#6366f1;#a855f7" dur="3s" repeatCount="indefinite" />
                </stop>
              </linearGradient>
              <linearGradient id="rtaAreaGradient" x1="0%" y1="0%" x2="0%" y2="100%">
                <stop offset="0%" stopColor="#6366f1" stopOpacity="0.3" />
                <stop offset="100%" stopColor="#6366f1" stopOpacity="0" />
              </linearGradient>
            </defs>

            {/* Grid lines */}
            {[0, 0.25, 0.5, 0.75, 1].map((f) => (
              <g key={f}>
                <line x1={padding.left} y1={getY(f * yMax)} x2={width - padding.right} y2={getY(f * yMax)} stroke="#334155" strokeDasharray="4 4" />
                <text x={padding.left - 10} y={getY(f * yMax)} fill="#64748b" fontSize="12" textAnchor="end" dominantBaseline="middle">
                  {(f * yMax).toFixed(yMax < 4 ? 1 : 0)}
                  {unit}
                </text>
              </g>
            ))}

            {/* X axis: first and last time */}
            {data.length > 1 && (
              <>
                <text x={padding.left} y={height - 12} fill="#64748b" fontSize="12" textAnchor="start">
                  {formatTime(data[0].time)}
                </text>
                <text x={width - padding.right} y={height - 12} fill="#64748b" fontSize="12" textAnchor="end">
                  {formatTime(data[data.length - 1].time)}
                </text>
              </>
            )}

            <path d={getAreaPath()} fill="url(#rtaAreaGradient)" />

            <path className="rta-line rta-glow" d={getPath()} fill="none" stroke="url(#rtaLineGradient)" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />

            {data.map((point, i) => (
              <circle
                key={point.time}
                className={i === data.length - 1 ? "rta-dot" : ""}
                cx={getX(point.time)}
                cy={getY(point.value)}
                r={i === data.length - 1 ? 6 : 3}
                fill={i === data.length - 1 ? "#a855f7" : "#6366f1"}
                style={{ opacity: hoveredPoint?.time === point.time ? 1 : 0.7, transition: "opacity 0.2s ease" }}
              />
            ))}

            {hoveredPoint && (
              <>
                <line x1={getX(hoveredPoint.time)} y1={padding.top} x2={getX(hoveredPoint.time)} y2={height - padding.bottom} stroke="#6366f1" strokeDasharray="4 4" opacity="0.5" />
                <circle cx={getX(hoveredPoint.time)} cy={getY(hoveredPoint.value)} r="8" fill="none" stroke="#a855f7" strokeWidth="2" />
              </>
            )}
          </svg>

          {hoveredPoint && (
            <div
              style={{
                position: "absolute",
                left: `${(getX(hoveredPoint.time) / width) * 100}%`,
                top: (getY(hoveredPoint.value) / height) * 100 + "%",
                transform: "translate(-50%, -130%)",
                backgroundColor: "#0f172a",
                border: "1px solid #6366f1",
                borderRadius: "8px",
                padding: "8px 12px",
                pointerEvents: "none",
                zIndex: 10,
                whiteSpace: "nowrap",
              }}
            >
              <div style={{ color: "white", fontWeight: 600, fontSize: "14px" }}>
                {hoveredPoint.value.toFixed(1)}
                {unit}
              </div>
              <div style={{ color: "#64748b", fontSize: "12px" }}>{formatTime(hoveredPoint.time)}</div>
            </div>
          )}
        </div>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "16px", marginTop: "16px" }}>
        {[
          { label: "Average", value: average.toFixed(1), unit },
          { label: "Peak", value: peak.toFixed(1), unit },
          { label: "Data Points", value: data.length.toString(), unit: "" },
        ].map((stat) => (
          <div key={stat.label} style={{ backgroundColor: "#1e1e1e", borderRadius: "12px", padding: "16px", textAlign: "center" }}>
            <div style={{ color: "#64748b", fontSize: "12px", marginBottom: "4px" }}>{stat.label}</div>
            <div style={{ color: "white", fontSize: "20px", fontWeight: 600 }}>
              {stat.value}
              {stat.unit}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
