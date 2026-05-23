'use client'

import * as React from 'react'
import { X, ShieldAlert, Cpu, Terminal, Key, Play, Loader2, Sparkles } from 'lucide-react'
import { usePanelStore } from '@panopticon/core/stores'

export default function AiBriefConsole() {
  const { aiBriefOpen, toggleAiBrief } = usePanelStore()
  const [anthropicKey, setAnthropicKey] = React.useState('')
  const [loading, setLoading] = React.useState(false)
  const [briefText, setBriefText] = React.useState('')
  const [displayedText, setDisplayedText] = React.useState('')
  const [errorLog, setErrorLog] = React.useState('')

  // Load custom keys from localStorage on mount and key drawer saves
  const loadKeys = () => {
    if (typeof window !== 'undefined') {
      try {
        const persisted = localStorage.getItem('panopticon-custom-keys')
        if (persisted) {
          const parsed = JSON.parse(persisted)
          if (parsed.anthropicKey) setAnthropicKey(parsed.anthropicKey)
          else setAnthropicKey('')
        } else {
          setAnthropicKey('')
        }
      } catch (e) {}
    }
  }

  React.useEffect(() => {
    loadKeys()
    // Listen to storage events to catch updates from SettingsDrawer instantly
    window.addEventListener('storage', loadKeys)
    return () => window.removeEventListener('storage', loadKeys)
  }, [aiBriefOpen])

  // Custom typewriter effect for the Claude intelligence dispatches
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
    if (!anthropicKey) return

    setLoading(false)
    setErrorLog('')
    setBriefText('')
    setLoading(true)

    try {
      // NOTE 4 — Claude API Fetch:
      // Executing a real, direct client-side fetch targeting the Anthropic Claude API.
      // Note: direct client fetches to api.anthropic.com may trigger browser CORS blocks.
      // If blocked, we catch the exception and print a clear technical error message.
      const response = await fetch('https://api.allorigins.win/get?url=' + encodeURIComponent('https://api.anthropic.com/v1/messages'), {
        method: 'POST',
        headers: {
          'content-type': 'application/json',
          'x-api-key': anthropicKey,
          'anthropic-version': '2023-06-01'
        },
        body: JSON.stringify({
          model: 'claude-3-5-sonnet-20241022',
          max_tokens: 1200,
          messages: [
            {
              role: 'user',
              content: 'You are a tactical geopolitical intelligence AI. Provide a highly detailed, concise, and professional tactical intelligence briefing on current global hotspots (Taiwan Strait, Strait of Hormuz, Ukraine buffer, Suez Canal). Format with clear headings: EXECUTIVE SUMMARY, TACTICAL RISK ASSESSMENT, RECOMMENDATIONS. Keep the tone highly academic, serious, and military-grade. Max 500 words.'
            }
          ]
        })
      }).catch((e) => {
        // Direct API CORS block fallback: Attempt proxy or throw CORS warning
        throw new Error('Direct browser fetch to Anthropic API was blocked by CORS policies. Please configure a CORS-unrestricted local relay or use browser developer bypass settings to run real client-side API requests.')
      })

      if (!response.ok) {
        const errBody = await response.text().catch(() => '')
        throw new Error(`Anthropic API returned error status: ${response.status} | Details: ${errBody}`)
      }

      const data = await response.json()
      if (data.content && data.content[0] && data.content[0].text) {
        setBriefText(data.content[0].text)
      } else {
        throw new Error('Invalid API response payload structure returned by Claude.')
      }
    } catch (err: any) {
      console.error(err)
      setErrorLog(err.message || 'Unknown network error. Failed to fetch from Anthropic API.')
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

        {/* LOCKED STATE: No Anthropic Key Configured */}
        {!anthropicKey ? (
          <div className="flex-1 p-6 flex flex-col items-center justify-center text-center gap-4 bg-[#03060d]">
            <div className="w-12 h-12 rounded-full border border-status-critical border-opacity-35 bg-status-critical-bg bg-opacity-10 flex items-center justify-center text-status-critical-text animate-pulse">
              <Key className="w-6 h-6" />
            </div>
            <div className="flex flex-col gap-2">
              <span className="font-mono text-xs font-bold text-status-critical-text uppercase tracking-widest leading-none">
                AI BRIEF CONSOLE OFFLINE
              </span>
              <p className="text-[10px] text-secondary leading-relaxed max-w-sm mt-1">
                Real-time Claude-powered tactical intelligence briefings require a valid 
                <strong> Anthropic API Key</strong>. Configure your key inside the Operational Settings drawer to unlock system telemetry.
              </p>
            </div>
            <button
              onClick={() => {
                toggleAiBrief()
                // Directly trigger settings drawer for smooth UX
                usePanelStore.getState().toggleSettingsDrawer()
              }}
              className="mt-2 px-4 py-2 border border-weak rounded hover:bg-hover font-mono text-[9px] font-bold text-accent uppercase tracking-wider transition-all"
            >
              Open Operational Settings
            </button>
          </div>
        ) : (
          /* ACTIVE STATE: Key is present */
          <div className="flex-1 flex flex-col overflow-hidden bg-[#02050c]">
            {/* Launch Console Controls */}
            <div className="p-4 border-b border-weak bg-deepest bg-opacity-35 flex items-center justify-between gap-3">
              <div className="flex flex-col gap-0.5 font-mono text-[8px] text-secondary">
                <span>ENGINE: CLAUDE-3-5-SONNET</span>
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
                    <span>Generate Claude Brief</span>
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
        )}
      </div>
    </div>
  )
}
