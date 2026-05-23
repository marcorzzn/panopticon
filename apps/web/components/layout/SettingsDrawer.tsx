'use client'

import * as React from 'react'
import { X, Key, ShieldAlert, Check } from 'lucide-react'
import { usePanelStore } from '@panopticon/core/stores'

export default function SettingsDrawer() {
  const { settingsDrawerOpen, toggleSettingsDrawer } = usePanelStore()
  const [anthropicKey, setAnthropicKey] = React.useState('')
  const [abuseIpdbKey, setAbuseIpdbKey] = React.useState('')
  const [saved, setSaved] = React.useState(false)

  // NOTE 2 — localStorage XSS Risk:
  // Storing raw API keys directly inside localStorage is convenient for static, serverless
  // OSS distributions but carries substantial XSS extraction risk if malicious third-party scripts
  // ever run in the client scope. Keep your keys private and run only trusted local scripts.
  
  React.useEffect(() => {
    if (typeof window !== 'undefined') {
      try {
        const persisted = localStorage.getItem('panopticon-custom-keys')
        if (persisted) {
          const parsed = JSON.parse(persisted)
          if (parsed.anthropicKey) setAnthropicKey(parsed.anthropicKey)
          if (parsed.abuseIpdbKey) setAbuseIpdbKey(parsed.abuseIpdbKey)
        }
      } catch (e) {}
    }
  }, [settingsDrawerOpen])

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault()
    if (typeof window !== 'undefined') {
      try {
        localStorage.setItem(
          'panopticon-custom-keys',
          JSON.stringify({ anthropicKey, abuseIpdbKey })
        )
        // Dispatches standard storage event to trigger instant reactive state updates on other panels
        window.dispatchEvent(new Event('storage'))
        setSaved(true)
        setTimeout(() => {
          setSaved(false)
          toggleSettingsDrawer()
        }, 800)
      } catch (e) {}
    }
  }

  if (!settingsDrawerOpen) return null

  return (
    <div className="fixed inset-0 z-50 flex justify-end select-none">
      {/* Dark Overlay backdrop */}
      <div
        onClick={toggleSettingsDrawer}
        className="absolute inset-0 bg-deepest bg-opacity-65 backdrop-blur-[2px] transition-opacity"
      />

      {/* Sliding Sidebar Panel */}
      <div className="relative w-80 h-full bg-surface border-l border-weak flex flex-col z-10 shadow-2xl animate-in slide-in-from-right duration-200">
        {/* Header */}
        <div className="p-4 border-b border-weak flex items-center justify-between bg-deepest bg-opacity-35">
          <div className="flex items-center gap-2 font-display text-xs font-bold uppercase tracking-wider text-primary">
            <Key className="w-4 h-4 text-accent" />
            <span>OPERATIONAL SETTINGS</span>
          </div>
          <button
            onClick={toggleSettingsDrawer}
            className="p-1 rounded hover:bg-hover text-secondary hover:text-primary transition-all"
            title="Close Panel"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Contents Form */}
        <form onSubmit={handleSave} className="flex-1 p-4 flex flex-col gap-5 overflow-y-auto custom-scrollbar font-sans">
          
          {/* Security Advisory Warning */}
          <div className="p-3 rounded bg-status-critical-bg bg-opacity-15 border border-status-critical border-opacity-25 flex gap-2">
            <ShieldAlert className="w-4 h-4 text-status-critical-text shrink-0 mt-0.5" />
            <div className="flex flex-col gap-1">
              <span className="text-[10px] font-mono font-bold uppercase text-status-critical-text leading-none">
                SECURITY ADVISORY
              </span>
              <p className="text-[9px] text-secondary leading-normal">
                Credentials are saved locally in standard <strong>localStorage</strong>. 
                This poses an XSS risk if unverified third-party libraries are embedded. 
                Use restricted keys only.
              </p>
            </div>
          </div>

          <div className="flex flex-col gap-4 flex-1">
            {/* Input 1: Anthropic API Key */}
            <div className="flex flex-col gap-1.5">
              <label className="text-[9px] font-mono font-bold uppercase tracking-wider text-secondary">
                Anthropic API Key (Claude)
              </label>
              <div className="relative">
                <input
                  type="password"
                  value={anthropicKey}
                  onChange={(e) => setAnthropicKey(e.target.value)}
                  placeholder="sk-ant-api03-..."
                  className="w-full bg-deepest border border-weak focus:border-accent text-xs font-mono px-3 py-2 rounded text-primary outline-none transition-all placeholder:opacity-30"
                />
              </div>
              <p className="text-[9px] text-secondary leading-tight">
                Required to generate real-time AI Intelligence briefs on current hotspots.
              </p>
            </div>

            {/* Input 2: AbuseIPDB API Key */}
            <div className="flex flex-col gap-1.5">
              <label className="text-[9px] font-mono font-bold uppercase tracking-wider text-secondary">
                AbuseIPDB API Key
              </label>
              <div className="relative">
                <input
                  type="password"
                  value={abuseIpdbKey}
                  onChange={(e) => setAbuseIpdbKey(e.target.value)}
                  placeholder="abuseipdb_secret_key"
                  className="w-full bg-deepest border border-weak focus:border-accent text-xs font-mono px-3 py-2 rounded text-primary outline-none transition-all placeholder:opacity-30"
                />
              </div>
              <p className="text-[9px] text-secondary leading-tight">
                Used to run active domain & IP threat reputation scoring scans in the Recon drawer.
              </p>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="border-t border-weak pt-4 flex gap-2">
            <button
              type="button"
              onClick={toggleSettingsDrawer}
              className="flex-1 py-2 text-center rounded border border-weak hover:bg-hover font-mono text-[10px] font-semibold text-secondary uppercase transition-all"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={saved}
              className={`flex-1 py-2 rounded font-mono text-[10px] font-bold uppercase tracking-wider transition-all flex items-center justify-center gap-1 ${
                saved
                  ? 'bg-status-ok-bg border border-status-ok text-status-ok-text'
                  : 'bg-accent text-deepest hover:bg-opacity-80 active:scale-[0.98]'
              }`}
            >
              {saved ? (
                <>
                  <Check className="w-3.5 h-3.5" />
                  <span>Saved</span>
                </>
              ) : (
                <span>Commit Keys</span>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
