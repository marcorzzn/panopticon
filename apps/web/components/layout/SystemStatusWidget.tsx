'use client'

import * as React from 'react'
import { useAppStore } from '@panopticon/core/stores'
import { Server, Activity, Database, RefreshCw, Clock } from 'lucide-react'

export default function SystemStatusWidget({ secondsSinceUpdate }: { secondsSinceUpdate: number }) {
  const globalRefreshPaused = useAppStore((s) => s.globalRefreshPaused)

  // Calculate mock next sync countdown for daily 04:00 UTC cycle
  const [nextSyncStr, setNextSyncStr] = React.useState('T-00:00:00')
  const [lastSyncStr, setLastSyncStr] = React.useState('04:00 UTC')

  React.useEffect(() => {
    const updateTime = () => {
      const now = new Date()
      let nextSync = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate(), 4, 0, 0))
      
      // If past 4 AM UTC, next sync is tomorrow 4 AM UTC
      if (now > nextSync) {
        nextSync.setUTCDate(nextSync.getUTCDate() + 1)
      }
      
      const diffMs = nextSync.getTime() - now.getTime()
      const diffHrs = Math.floor(diffMs / 3600000)
      const diffMins = Math.floor((diffMs % 3600000) / 60000)
      const diffSecs = Math.floor((diffMs % 60000) / 1000)
      
      setNextSyncStr(`T-${diffHrs.toString().padStart(2, '0')}:${diffMins.toString().padStart(2, '0')}:${diffSecs.toString().padStart(2, '0')}`)
    }
    
    updateTime()
    const timer = setInterval(updateTime, 1000)
    return () => clearInterval(timer)
  }, [])

  return (
    <div className="absolute left-16 top-16 z-20 flex flex-col font-mono text-[9px] w-56 rounded border border-weak bg-[#0b0f1a]/90 backdrop-blur-md shadow-2xl pointer-events-none select-none overflow-hidden">
      {/* Header */}
      <div className="bg-[var(--pan-bg-surface-hover)] border-b border-weak px-3 py-2 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Server className="w-3.5 h-3.5 text-[var(--pan-text-accent)]" />
          <span className="font-bold text-[var(--pan-text-primary)] tracking-widest uppercase">System Status</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className={`w-1.5 h-1.5 rounded-full ${globalRefreshPaused ? 'bg-status-critical-text animate-pulse' : 'bg-accent animate-ping'}`} />
          <span className={`uppercase font-bold ${globalRefreshPaused ? 'text-status-critical-text' : 'text-[#34c759]'}`}>
            {globalRefreshPaused ? 'PAUSED' : 'ONLINE'}
          </span>
        </div>
      </div>
      
      {/* Body */}
      <div className="p-3 flex flex-col gap-2.5">
        <div className="flex justify-between items-center text-[var(--pan-text-secondary)]">
          <div className="flex items-center gap-1.5">
            <Clock className="w-3 h-3 text-[var(--pan-text-primary)]" />
            <span>LAST CYCLE:</span>
          </div>
          <span className="text-[var(--pan-text-primary)] font-semibold">{lastSyncStr}</span>
        </div>
        
        <div className="flex justify-between items-center text-[var(--pan-text-secondary)]">
          <div className="flex items-center gap-1.5">
            <RefreshCw className="w-3 h-3 text-[var(--pan-text-accent)]" />
            <span>NEXT SYNC:</span>
          </div>
          <span className="text-[var(--pan-text-accent)] font-semibold">{nextSyncStr}</span>
        </div>
        
        <div className="w-full h-px bg-[var(--pan-border-subtle)] my-1" />
        
        <div className="flex flex-col gap-1.5">
          <div className="flex justify-between items-center">
            <span className="text-[var(--pan-text-secondary)]">INTEL INGESTION</span>
            <span className="text-[#34c759] font-semibold">ACTIVE</span>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-[var(--pan-text-secondary)]">SAT TELEMETRY</span>
            <span className="text-[var(--pan-text-primary)] font-semibold">VERIFIED</span>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-[var(--pan-text-secondary)]">LIVE POLLING</span>
            <span className="text-[var(--pan-text-primary)] font-semibold">
              {secondsSinceUpdate === 0 ? 'SYNCING...' : `${secondsSinceUpdate}s AGO`}
            </span>
          </div>
        </div>
      </div>
    </div>
  )
}
