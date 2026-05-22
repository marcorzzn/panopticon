'use client'

import * as React from 'react'

export default function LiveClock() {
  const [time, setTime] = React.useState<Date | null>(null)

  React.useEffect(() => {
    setTime(new Date())
    const timer = setInterval(() => {
      setTime(new Date())
    }, 1000)
    return () => clearInterval(timer)
  }, [])

  if (!time) {
    return (
      <div className="flex gap-4 font-mono text-[10px] text-secondary tracking-widest uppercase">
        <span>ZULU: --:--:-- UTC</span>
        <span>LOCAL: --:--:-- LCL</span>
      </div>
    )
  }

  // Format times using 24h
  const formatUtc = (d: Date) => {
    const pad = (n: number) => String(n).padStart(2, '0')
    const hh = pad(d.getUTCHours())
    const mm = pad(d.getUTCMinutes())
    const ss = pad(d.getUTCSeconds())
    return `${hh}:${mm}:${ss}`
  }

  const formatLocal = (d: Date) => {
    const pad = (n: number) => String(n).padStart(2, '0')
    const hh = pad(d.getHours())
    const mm = pad(d.getMinutes())
    const ss = pad(d.getSeconds())
    return `${hh}:${mm}:${ss}`
  }

  return (
    <div className="flex items-center gap-6 font-mono text-[10px] text-secondary tracking-wider font-semibold select-none">
      {/* UTC / ZULU Clock */}
      <div className="flex items-center gap-2 px-2 py-0.5 rounded bg-deepest bg-opacity-40 border border-weak">
        <span className="text-secondary font-display text-[9px] uppercase tracking-widest">ZULU</span>
        <span className="text-primary text-xs font-bold tabular-nums tracking-widest text-shadow-glow">
          {formatUtc(time)}
        </span>
        <span className="text-[8px] text-accent uppercase font-bold">UTC</span>
      </div>

      <div className="w-px h-3 bg-border-weak" />

      {/* Local Clock */}
      <div className="flex items-center gap-2 px-2 py-0.5 rounded bg-deepest bg-opacity-40 border border-weak">
        <span className="text-secondary font-display text-[9px] uppercase tracking-widest">LOCAL</span>
        <span className="text-primary text-xs font-bold tabular-nums tracking-widest">
          {formatLocal(time)}
        </span>
        <span className="text-[8px] text-secondary uppercase font-bold">LCL</span>
      </div>
    </div>
  )
}
