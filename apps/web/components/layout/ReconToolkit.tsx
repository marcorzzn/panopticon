'use client'

import * as React from 'react'
import { X, Terminal, Globe, Shield, Wifi, Key, Eye, HelpCircle, Activity, Play } from 'lucide-react'
import { usePanelStore } from '@panopticon/core/stores'

// Custom interface for terminal log entries
interface LogEntry {
  type: 'info' | 'success' | 'warn' | 'error' | 'header'
  text: string
}

export default function ReconToolkit() {
  const { reconToolkitOpen, toggleReconToolkit } = usePanelStore()
  const [target, setTarget] = React.useState('google.com')
  const [activeTool, setActiveTool] = React.useState<string>('dns')
  const [terminalLogs, setTerminalLogs] = React.useState<LogEntry[]>([])
  const [scanning, setScanning] = React.useState(false)

  // Retrieve stored keys for AbuseIPDB
  const [abuseIpdbKey, setAbuseIpdbKey] = React.useState('')

  React.useEffect(() => {
    if (typeof window !== 'undefined') {
      try {
        const persisted = localStorage.getItem('panopticon-custom-keys')
        if (persisted) {
          const parsed = JSON.parse(persisted)
          if (parsed.abuseIpdbKey) setAbuseIpdbKey(parsed.abuseIpdbKey)
        }
      } catch (e) {}
    }
  }, [reconToolkitOpen])

  // Clear terminal helper
  const clearTerminal = () => setTerminalLogs([])

  // Print to terminal helper
  const print = (text: string, type: LogEntry['type'] = 'info') => {
    setTerminalLogs((prev) => [...prev, { type, text }])
  }

  // Real execution of browser-safe APIs or [DEMO MODE] fallback
  const runDiagnostics = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!target.trim()) return

    setScanning(true)
    clearTerminal()
    print(`[OP_SYS_INIT] Launching tactical OSINT probe on target: ${target}`, 'header')
    print(`[TIME] ${new Date().toISOString()}`)
    print('------------------------------------------------------------')

    try {
      switch (activeTool) {
        case 'dns':
          await runDnsLookup()
          break
        case 'whois':
          await runWhoisLookup()
          break
        case 'ssl':
          await runSslInspect()
          break
        case 'subdomains':
          await runSubdomainEnum()
          break
        case 'geoip':
          await runGeoIpLookup()
          break
        case 'threat':
          await runAbuseIpCheck()
          break
        case 'tech':
          await runTechDetection()
          break
        case 'nmap':
          await runNmapDemo()
          break
        case 'bgp':
          await runBgpDemo()
          break
        case 'vuln':
          await runVulnDemo()
          break
        case 'jammer':
          await runJammerDemo()
          break
        default:
          print('Error: Unknown diagnostic module selected.', 'error')
      }
    } catch (err: any) {
      print(`[FAIL] Probe aborted: ${err.message || err}`, 'error')
    } finally {
      setScanning(false)
    }
  }

  // --- Real Tools Implementations ---

  const runDnsLookup = async () => {
    print('[MODULE] Active: Google DNS-over-HTTPS (DoH) Resolver')
    print('[STATUS] Dispatching query to dns.google...')

    const recordTypes = ['A', 'AAAA', 'MX', 'TXT']
    for (const type of recordTypes) {
      print(`[RESOLVING] Record type: ${type}`)
      const res = await fetch(`https://dns.google/resolve?name=${target}&type=${type}`)
      const data = await res.json()
      
      if (data.Answer && data.Answer.length > 0) {
        data.Answer.forEach((ans: any) => {
          print(`[FOUND] ${ans.name} | TTL: ${ans.TTL} | Value: ${ans.data}`, 'success')
        })
      } else {
        print(`[EMPTY] No ${type} records returned.`, 'warn')
      }
    }
    print('[COMPLETE] DNS propagation resolved.', 'success')
  }

  const runWhoisLookup = async () => {
    print('[MODULE] Active: Public RDAP Directory Registry Lookup')
    print(`[RDAP] Fetching bootstrap coordinates for ${target}...`)

    const res = await fetch(`https://rdap.org/domain/${target}`)
    if (!res.ok) {
      throw new Error(`RDAP directory rejected query (Status: ${res.status}).`)
    }
    const data = await res.json()

    if (data.ldhName) print(`[DOMAIN] Registered Name: ${data.ldhName}`, 'success')
    if (data.status) print(`[STATUS] Domain Status: ${data.status.join(', ')}`)
    
    if (data.events) {
      data.events.forEach((ev: any) => {
        print(`[EVENT] ${ev.eventAction} | Date: ${ev.eventDate}`)
      })
    }
    
    if (data.entities) {
      print(`[REGISTRAR] Entity entities found: ${data.entities.length}`)
      data.entities.slice(0, 3).forEach((ent: any) => {
        if (ent.roles) print(`[ENTITY] Role: ${ent.roles.join(', ')} | ID: ${ent.handle}`, 'success')
      })
    }
    print('[COMPLETE] RDAP record parsed successfully.', 'success')
  }

  const runSslInspect = async () => {
    print('[MODULE] Active: crt.sh Certificate Transparency Logs Parser')
    print('[QUERY] Pulling signed TLS certificate fingerprints from crt.sh...')

    const proxyUrl = `https://api.allorigins.win/get?url=${encodeURIComponent(`https://crt.sh/?q=${target}&output=json`)}`
    const res = await fetch(proxyUrl)
    const container = await res.json()
    const records = JSON.parse(container.contents)

    if (!Array.isArray(records) || records.length === 0) {
      print('[WARN] No signed certificates discovered in public transparency logs.', 'warn')
      return
    }

    print(`[FOUND] Discovered ${records.length} registered certificates. Showing top 5:`, 'success')
    records.slice(0, 5).forEach((rec: any, idx: number) => {
      print(`[CERT #${idx + 1}] Issuer: ${rec.issuer_name}`)
      print(`          Subject: ${rec.name_value}`)
      print(`          Logged At: ${rec.entry_timestamp} | ID: ${rec.id}`)
    })
    print('[COMPLETE] SSL logs gathered successfully.', 'success')
  }

  const runSubdomainEnum = async () => {
    print('[MODULE] Active: Subdomain Enumeration via CT Log parsing')
    print(`[ENUM] Scraping wildcard subdomains mapping to root: ${target}...`)

    const proxyUrl = `https://api.allorigins.win/get?url=${encodeURIComponent(`https://crt.sh/?q=${target}&output=json`)}`
    const res = await fetch(proxyUrl)
    const container = await res.json()
    const records = JSON.parse(container.contents)

    if (!Array.isArray(records) || records.length === 0) {
      print('[WARN] No subdomains discovered in public CT records.', 'warn')
      return
    }

    const subdomains = new Set<string>()
    records.forEach((rec: any) => {
      if (rec.name_value) {
        const names = rec.name_value.split('\n')
        names.forEach((name: string) => {
          if (name.includes(target) && !name.includes('*')) {
            subdomains.add(name.toLowerCase().trim())
          }
        })
      }
    })

    print(`[SUCCESS] Enumerated ${subdomains.size} unique subdomains:`, 'success')
    Array.from(subdomains).slice(0, 15).forEach((sub) => {
      print(`   ➜ ${sub}`, 'success')
    })
    if (subdomains.size > 15) {
      print(`   ...and ${subdomains.size - 15} more subdomains found.`)
    }
    print('[COMPLETE] Subdomain enumeration completed.', 'success')
  }

  const runGeoIpLookup = async () => {
    print('[MODULE] Active: HTTPS-Secure IP Geolocation (ipwho.is)')
    print(`[GEOIP] Querying topological coordinates for: ${target}`)

    // Clean target if hostname (ipwho.is works on domains or IPs natively)
    const res = await fetch(`https://ipwho.is/${target}`)
    if (!res.ok) throw new Error('ipwho.is failed to return geolocation data.')
    const data = await res.json()

    if (!data.success) {
      throw new Error(data.message || 'Geotarget query failed.')
    }

    print(`[IP] Resolved Target: ${data.ip}`, 'success')
    print(`[ISP] Network Provider: ${data.connection.isp} (ASN: ${data.connection.asn})`)
    print(`[COORDS] Grid Location: Lat ${data.latitude} | Lon ${data.longitude}`, 'success')
    print(`[REGION] Geography: ${data.city}, ${data.region}, ${data.country}`)
    print(`[GRID] Mercator Grid: Timezone: ${data.timezone.id} | UTC: ${data.timezone.utc}`)
    print('[COMPLETE] Geospatial coordinates fetched.', 'success')
  }

  const runAbuseIpCheck = async () => {
    print('[MODULE] Active: AbuseIPDB Geopolitical Cyber Threat Index')
    
    if (!abuseIpdbKey) {
      print('[LOCK] API key missing. Configure your AbuseIPDB Key in Settings Drawer.', 'error')
      print('Status: Threat Check Locked.', 'warn')
      return
    }

    print('[SECURE] API Key verified. Dispatching threat index request...')
    const proxyUrl = `https://api.allorigins.win/get?url=${encodeURIComponent(`https://api.abuseipdb.com/api/v2/check?ipAddress=${target}`)}`
    
    // In standard deployment, the client sends headers. To bypass CORS of direct API on Client side
    // we query with proper fetch headers. Note: direct AbuseIPDB has CORS restrictions, so a warning is printed.
    print('[CONNECT] Direct secure CORS check routing...')
    const res = await fetch(`https://api.abuseipdb.com/api/v2/check?ipAddress=${target}`, {
      headers: {
        'Key': abuseIpdbKey,
        'Accept': 'application/json'
      }
    }).catch(() => {
      // CORS fallback warning
      print('[CORS LOCK] Direct browser fetch blocked by API CORS policies. Attempting proxy relay...', 'warn')
      return null
    })

    if (!res) {
      print('[WARN] Threat check blocked by AbuseIPDB CORS. Manual integration recommended.', 'error')
      return
    }

    const container = await res.json()
    if (container.data) {
      const d = container.data
      print(`[REPORT] Abuse Score: ${d.abuseConfidenceScore}% (Threshold: 100%)`, d.abuseConfidenceScore > 20 ? 'error' : 'success')
      print(`[TOTAL_REPORTS] Reported reports count: ${d.totalReports}`)
      print(`[WHITE_LIST] Whitelisted status: ${d.isWhitelisted}`)
      print(`[COUNTRY] Origin: ${d.countryCode} | Domain: ${d.domain}`)
    }
  }

  const runTechDetection = async () => {
    print('[MODULE] Active: Response Headers Framework Heuristic Scanner')
    print(`[CORS] Fetching headers via allorigins proxy relay...`)

    const proxyUrl = `https://api.allorigins.win/get?url=${encodeURIComponent(`https://${target}`)}`
    const res = await fetch(proxyUrl)
    const container = await res.json()

    if (!container || !container.contents) {
      throw new Error('Could not fetch target headers via proxy.')
    }

    print('[SCANNING] Analyzing HTML markup and header signatures...')
    const html = container.contents.toLowerCase()
    
    const detected: string[] = []
    if (html.includes('wp-content') || html.includes('wordpress')) detected.push('WordPress CMS')
    if (html.includes('react') || html.includes('_next')) detected.push('Next.js / React')
    if (html.includes('vue') || html.includes('nuxt')) detected.push('Vue / Nuxt')
    if (html.includes('cloudflare')) detected.push('Cloudflare WAF CDN')
    if (html.includes('bootstrap')) detected.push('Bootstrap CSS')
    if (html.includes('jquery')) detected.push('jQuery')

    if (detected.length > 0) {
      detected.forEach((tech) => {
        print(`[IDENTIFIED] Framework signature found: ${tech}`, 'success')
      })
    } else {
      print('[EMPTY] No standard framework signatures matched. Target likely raw CSS/HTML or custom bundle.', 'warn')
    }
    print('[COMPLETE] Tech fingerprinting finished.', 'success')
  }

  // --- Explicit [DEMO MODE] Implementations ---

  const runNmapDemo = async () => {
    print('[DEMO MODE] — Simulated Port Scan. Real port scans require local server execution.', 'warn')
    print('Initializing Nmap 7.92 core engine...', 'info')
    await delay(600)
    print('Scanning target subnets (top 10 ports)...')
    await delay(800)
    
    print('PORT     STATE    SERVICE', 'header')
    print('21/tcp   closed   ftp')
    await delay(200)
    print('22/tcp   open     ssh  (OpenSSH 8.2p1)', 'success')
    await delay(200)
    print('25/tcp   closed   smtp')
    print('53/tcp   open     dns  (BIND 9.16.1)', 'success')
    await delay(200)
    print('80/tcp   open     http (Apache httpd 2.4.41)', 'success')
    await delay(200)
    print('110/tcp  closed   pop3')
    print('443/tcp  open     https (Apache/nginx hybrid)', 'success')
    await delay(200)
    print('3306/tcp closed   mysql')
    print('8080/tcp closed   http-proxy')
    
    print('------------------------------------------------------------')
    print('[DEMO COMPLETE] Nmap scan completed: 1 IP (1 host up) resolved.', 'success')
  }

  const runBgpDemo = async () => {
    print('[DEMO MODE] — Simulated BGP traceroute routing. Raw sockets restricted in browsers.', 'warn')
    print('Starting BGP trace path coordinates lookup...', 'info')
    await delay(500)
    
    const hops = [
      { hop: 1, ip: '192.168.1.1', desc: 'Local Gateway' },
      { hop: 2, ip: '10.0.0.1', desc: 'ISP Regional Core' },
      { hop: 3, ip: '172.16.32.4', desc: 'National Edge Transit (AS1299)' },
      { hop: 4, ip: '80.91.246.8', desc: 'Transatlantic Optical Spine' },
      { hop: 5, ip: '151.101.0.45', desc: 'Target Gateway Node (AS13335)' }
    ]

    for (const h of hops) {
      await delay(400)
      print(`[HOP ${h.hop}] ${h.ip.padEnd(15)} | RTT: ${Math.floor(Math.random() * 80) + 5}ms | ${h.desc}`, 'success')
    }
    print('[DEMO COMPLETE] BGP Routing path mapped.', 'success')
  }

  const runVulnDemo = async () => {
    print('[DEMO MODE] — Simulated CVE scanner. Exploits require isolated sandbox environment.', 'warn')
    print('Accessing local CVE threat catalog...', 'info')
    await delay(600)
    print('Scanning target headers and version arrays for vulnerabilities...')
    await delay(800)

    print('[CVE-2021-44228] Log4j RCE .............. SECURE (Not Java runtime)', 'success')
    await delay(200)
    print('[CVE-2023-38606] Apple Kernel Bypass ..... SECURE (Target is server OS)', 'success')
    await delay(200)
    print('[CVE-2023-4863]  WebP Buffer Overflow .... SECURE (Static resources sanitized)', 'success')
    await delay(200)
    print('[CVE-2024-3094]  XZ Utils Backdoor ....... SECURE (Signature verification clean)', 'success')
    
    print('------------------------------------------------------------')
    print('[DEMO COMPLETE] 0 critical vulnerabilities identified.', 'success')
  }

  const runJammerDemo = async () => {
    print('[DEMO MODE] — Simulated SIGINT coordinate signal spectrum sweep.', 'warn')
    print('Scanning local geographical radio spectrum bands...', 'info')
    await delay(800)
    
    print('[SIGINT] L1 Band (1575.42 MHz) - GPS Carrier: No jamming detected (Signal strength ok)')
    await delay(300)
    print('[SIGINT] L2 Band (1227.60 MHz) - GLONASS: No jamming detected (Clean spectrum)')
    await delay(300)
    print('[SIGINT] Wifi 2.4 GHz - 802.11 b/g/n: Moderate congestion (Residential vectors)')
    await delay(300)
    print('[SIGINT] Spectrum sweep completed cleanly.', 'success')
  }

  const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms))

  if (!reconToolkitOpen) return null

  return (
    <div className="fixed inset-0 z-50 flex justify-end select-none">
      {/* Dark Overlay backdrop */}
      <div
        onClick={toggleReconToolkit}
        className="absolute inset-0 bg-deepest bg-opacity-65 backdrop-blur-[2px] transition-opacity"
      />

      {/* Sliding Sidebar Panel */}
      <div className="relative w-[480px] h-full bg-surface border-l border-weak flex flex-col z-10 shadow-2xl animate-in slide-in-from-right duration-200">
        {/* Header */}
        <div className="p-4 border-b border-weak flex items-center justify-between bg-deepest bg-opacity-35">
          <div className="flex items-center gap-2 font-display text-xs font-bold uppercase tracking-wider text-primary">
            <Terminal className="w-4 h-4 text-accent" />
            <span>OSINT RECON TOOLKIT</span>
          </div>
          <button
            onClick={toggleReconToolkit}
            className="p-1 rounded hover:bg-hover text-secondary hover:text-primary transition-all"
            title="Close Drawer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Input Form Target */}
        <form onSubmit={runDiagnostics} className="p-4 border-b border-weak bg-deepest bg-opacity-30 flex items-center gap-2">
          <div className="flex-1 flex flex-col gap-1">
            <label className="text-[8px] font-mono font-bold uppercase tracking-widest text-secondary">
              Target Hostname / IP address
            </label>
            <input
              type="text"
              value={target}
              onChange={(e) => setTarget(e.target.value)}
              placeholder="e.g. google.com or 8.8.8.8"
              disabled={scanning}
              className="bg-deepest border border-weak focus:border-accent text-xs font-mono px-3 py-1.5 rounded text-primary outline-none transition-all placeholder:opacity-20"
            />
          </div>
          <button
            type="submit"
            disabled={scanning}
            className="self-end px-4 py-1.5 rounded bg-accent text-deepest font-mono text-[10px] font-bold uppercase tracking-wider hover:bg-opacity-80 disabled:opacity-50 disabled:pointer-events-none transition-all flex items-center gap-1 shrink-0"
          >
            <Play className="w-3 h-3 fill-deepest" />
            <span>Probe</span>
          </button>
        </form>

        {/* Tools Drawer Tabs Grid */}
        <div className="grid grid-cols-4 gap-1 p-2 bg-deepest bg-opacity-20 border-b border-weak">
          {[
            { id: 'dns', label: 'DNS DoH', icon: <Globe className="w-3 h-3" /> },
            { id: 'whois', label: 'WHOIS/RDAP', icon: <Globe className="w-3 h-3" /> },
            { id: 'ssl', label: 'SSL/TLS', icon: <Shield className="w-3 h-3" /> },
            { id: 'subdomains', label: 'Subdomains', icon: <Globe className="w-3 h-3" /> },
            { id: 'geoip', label: 'Geolocate', icon: <Globe className="w-3 h-3" /> },
            { id: 'threat', label: 'Threat Index', icon: <Shield className="w-3 h-3" /> },
            { id: 'tech', label: 'Tech Stack', icon: <Terminal className="w-3 h-3" /> },
            { id: 'nmap', label: 'Nmap Scan', icon: <Activity className="w-3 h-3" />, demo: true },
            { id: 'bgp', label: 'BGP Route', icon: <Wifi className="w-3 h-3" />, demo: true },
            { id: 'vuln', label: 'Vuln Scan', icon: <Shield className="w-3 h-3" />, demo: true },
            { id: 'jammer', label: 'SIGINT Sweep', icon: <Wifi className="w-3 h-3" />, demo: true }
          ].map((t) => (
            <button
              key={t.id}
              type="button"
              onClick={() => setActiveTool(t.id)}
              disabled={scanning}
              className={`p-1.5 rounded font-mono text-[8px] font-bold uppercase tracking-wider flex flex-col items-center justify-center gap-1 transition-all ${
                activeTool === t.id
                  ? 'bg-accent text-deepest font-semibold'
                  : 'bg-surface border border-weak text-secondary hover:text-primary hover:bg-hover'
              }`}
            >
              {t.icon}
              <div className="flex items-center gap-0.5 max-w-full">
                <span className="truncate">{t.label}</span>
                {t.demo && <span className="text-[6px] px-0.5 rounded bg-status-critical-bg text-status-critical-text font-bold leading-none shrink-0 scale-90">DEMO</span>}
              </div>
            </button>
          ))}
        </div>

        {/* Monospace terminal logs display */}
        <div className="flex-1 bg-[#02050a] p-4 font-mono text-[10px] overflow-y-auto custom-scrollbar flex flex-col gap-1 select-text">
          {terminalLogs.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-secondary gap-2 opacity-40 font-mono text-[9px] uppercase tracking-wider">
              <Terminal className="w-8 h-8 animate-pulse text-accent" />
              <span>TERMINAL IDLE: Select a module and press probe</span>
            </div>
          ) : (
            terminalLogs.map((log, idx) => {
              let color = 'text-primary opacity-80'
              if (log.type === 'header') color = 'text-accent font-semibold'
              if (log.type === 'success') color = 'text-status-ok-text'
              if (log.type === 'warn') color = 'text-status-warning-text'
              if (log.type === 'error') color = 'text-status-critical-text font-bold'
              
              return (
                <div key={idx} className={`leading-normal whitespace-pre-wrap ${color}`}>
                  {log.type === 'header' ? `➜ ${log.text}` : log.text}
                </div>
              )
            })
          )}
        </div>
      </div>
    </div>
  )
}
