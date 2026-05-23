'use client'

import * as React from 'react'
import { X, ShieldAlert, Cpu, Terminal, Loader2, Sparkles } from 'lucide-react'
import { usePanelStore, useNewsStore } from '@panopticon/core/stores'
import { generateDailyBriefWithGemini } from '@panopticon/data-pipeline'

export default function AiBriefConsole() {
  const { aiBriefOpen, toggleAiBrief } = usePanelStore()
  const { newsEvents } = useNewsStore()
  const [loading, setLoading] = React.useState(false)
  const [briefText, setBriefText] = React.useState('')
  const [displayedText, setDisplayedText] = React.useState('')
  const [errorLog, setErrorLog] = React.useState('')

  // Custom typewriter effect for the intelligence dispatches
  React.useEffect(() => {
    if (!briefText) return
    setDisplayedText('')
    let idx = 0
    const timer = setInterval(() => {
      setDisplayedText((prev) => prev + briefText.charAt(idx))
      idx++
      if (idx >= briefText.length) {
        clearInterval(timer)
      }
    }, 15) // Clean typewriter speed

    return () => clearInterval(timer)
  }, [briefText])

  const generateBrief = async () => {
    setLoading(false)
    setErrorLog('')
    setBriefText('')
    setLoading(true)

    try {
      const brief = await generateDailyBriefWithGemini(newsEvents)
      if (brief.startsWith('Error') || brief.startsWith('Pipeline exception')) {
        throw new Error(brief)
      }
      setBriefText(brief)
    } catch (err: any) {
      console.error(err)
      setErrorLog(err.message || 'Unknown network error. Failed to generate tactical briefing.')
    } finally {
      setLoading(false)
    }
  }

  if (!aiBriefOpen) return null

  return (
    <div className="fixed inset-0 z-50 flex justify-end select-none">
      {/* Dark Overlay backdrop */}
      <div
        onClick={toggleAiBrief}
        className="absolute inset-0 bg-deepest bg-opacity-65 backdrop-blur-[2px] transition-opacity"
      />

      {/* Sliding Sidebar Panel */}
      <div className="relative w-[500px] h-full bg-surface border-l border-weak flex flex-col z-10 shadow-2xl animate-in slide-in-from-right duration-200">
        {/* Header */}
        <div className="p-4 border-b border-weak flex items-center justify-between bg-deepest bg-opacity-35">
          <div className="flex items-center gap-2 font-display text-xs font-bold uppercase tracking-wider text-primary">
            <Cpu className="w-4 h-4 text-accent animate-pulse" />
            <span>AI INTELLIGENCE BRIEF CONSOLE</span>
          </div>
          <button
            onClick={toggleAiBrief}
            className="p-1 rounded hover:bg-hover text-secondary hover:text-primary transition-all"
            title="Close Console"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* ACTIVE STATE: Always online now */}
        <div className="flex-1 flex flex-col overflow-hidden bg-[#02050c]">
          {/* Launch Console Controls */}
          <div className="p-4 border-b border-weak bg-deepest bg-opacity-35 flex items-center justify-between gap-3">
            <div className="flex flex-col gap-1 font-mono text-[8px] text-secondary">
              <div className="flex items-center gap-2">
                <span>ENGINE:</span>
                <span className="text-primary font-bold">GEMINI-2.0-FLASH (SECURE PROXY)</span>
              </div>
              <span className="text-status-ok-text">STATUS: ACTIVE & ONLINE</span>
            </div>
            <button
              onClick={generateBrief}
              disabled={loading}
              className="px-4 py-2 bg-accent text-deepest font-mono text-[9px] font-bold uppercase tracking-widest rounded hover:bg-opacity-80 disabled:opacity-50 disabled:pointer-events-none transition-all flex items-center justify-center gap-1.5"
            >
              {loading ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  <span>Analyzing...</span>
                </>
              ) : (
                <>
                  <Sparkles className="w-3.5 h-3.5 fill-deepest" />
                  <span>Generate Brief</span>
                </>
              )}
            </button>
          </div>

          {/* Typewriter Display screen */}
          <div className="flex-1 p-5 overflow-y-auto custom-scrollbar font-mono text-[10px] leading-relaxed flex flex-col gap-3 select-text">
            {loading && !briefText && (
              <div className="flex flex-col items-center justify-center h-full text-secondary gap-3 py-20 font-mono text-[9px] uppercase tracking-wider">
                <Loader2 className="w-6 h-6 animate-spin text-accent" />
                <span>Compiling tactical vector layers context...</span>
              </div>
            )}

            {errorLog && (
              <div className="p-3 rounded bg-status-critical-bg bg-opacity-15 border border-status-critical border-opacity-25 flex flex-col gap-2">
                <div className="flex items-center gap-1.5">
                  <ShieldAlert className="w-4 h-4 text-status-critical-text" />
                  <span className="text-[9px] font-bold uppercase text-status-critical-text font-mono">
                    TACTICAL PIPELINE ERROR
                  </span>
                </div>
                <p className="text-[9px] text-secondary font-mono leading-normal leading-tight">
                  {errorLog}
                </p>
              </div>
            )}

            {!loading && !briefText && !errorLog && (
              <div className="flex flex-col items-center justify-center h-full text-secondary gap-2 opacity-40 font-mono text-[9px] uppercase tracking-wider py-20">
                <Terminal className="w-8 h-8 text-accent animate-pulse" />
                <span>READY TO COMPILE TACTICAL REPORT</span>
              </div>
            )}

            {displayedText && (
              <div className="text-primary opacity-90 whitespace-pre-wrap leading-normal font-mono select-text">
                {displayedText}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
