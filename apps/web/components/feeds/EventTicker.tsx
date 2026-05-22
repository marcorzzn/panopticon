'use client'

import * as React from 'react'
import useSWR from 'swr'
import { Radio, ShieldAlert } from 'lucide-react'
import { fetchGdeltEvents } from '@panopticon/data-pipeline'

export default function EventTicker() {
  const { data: events } = useSWR(
    ['gdelt-events-ticker', 'protest'],
    () => fetchGdeltEvents('protest'),
    {
      refreshInterval: 600000, // Poll every 10 mins
      revalidateOnFocus: false,
    }
  )

  if (!events || events.length === 0) {
    return (
      <div className="flex items-center gap-2 font-mono text-[9px] text-secondary tracking-wider">
        <Radio className="w-3 h-3 text-secondary" />
        <span>STANDBY — DISPATCH FEEDS SYNCED</span>
      </div>
    )
  }

  return (
    <div className="w-full flex items-center bg-deepest bg-opacity-50 border border-weak py-1 px-3 rounded overflow-hidden select-none select-none">
      <div className="flex items-center gap-2 border-r border-weak pr-3 font-mono text-[9px] text-accent font-bold tracking-wider uppercase shrink-0">
        <ShieldAlert className="w-3 h-3 text-status-warning-text animate-pulse" />
        <span>FLASH REPORT</span>
      </div>
      
      {/* Scrolling Text Container */}
      <div className="flex-1 overflow-hidden relative pl-3">
        <div className="flex items-center gap-10 animate-marquee whitespace-nowrap text-[9px] font-mono text-secondary tracking-wide">
          {events.slice(0, 10).map((event, idx) => {
            let labelColor = 'text-status-ok-text'
            if (event.severity === 'critical') labelColor = 'text-status-critical-text font-bold'
            else if (event.severity === 'high') labelColor = 'text-status-critical-text'
            else if (event.severity === 'moderate') labelColor = 'text-status-warning-text'
            else if (event.severity === 'low') labelColor = 'text-status-info-text'

            return (
              <span key={event.id} className="flex items-center gap-2">
                <span className={`uppercase font-bold ${labelColor}`}>
                  [{event.severity}]
                </span>
                <span className="text-primary uppercase font-medium">{event.label}</span>
                {idx < 9 && <span className="text-secondary opacity-40">❖</span>}
              </span>
            )
          })}
        </div>
      </div>

      <style jsx global>{`
        @keyframes marquee {
          0% {
            transform: translateX(0);
          }
          100% {
            transform: translateX(-50%);
          }
        }
        .animate-marquee {
          display: inline-flex;
          animation: marquee 45s linear infinite;
        }
        .animate-marquee:hover {
          animation-play-state: paused;
        }
      `}</style>
    </div>
  )
}
