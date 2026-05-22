'use client'

import * as React from 'react'
import useSWR from 'swr'
import {
  X,
  Plane,
  Flame,
  Wind,
  ShieldAlert,
  Activity,
  Globe,
  Compass,
  TrendingUp,
  TrendingDown,
  Navigation,
  Skull,
  Calendar,
  MapPin,
  ExternalLink,
  BookOpen,
  Video,
  Terminal,
  Cpu,
  Network,
  Server,
  Shield,
  Satellite
} from 'lucide-react'
import { useMapStore } from '@panopticon/core/stores'
import {
  fetchEarthquakes,
  fetchGdeltEvents,
  fetchAircraft,
  fetchWildfires,
  fetchAirQuality,
  fetchAcledEvents,
  fetchWebcams,
  fetchReconTrace,
  fetchSatellites
} from '@panopticon/data-pipeline'
import type { WebcamEntity, SatelliteEntity } from '@panopticon/core/types'
import layersConfig from '@panopticon/core/src/config/layers.json'

// ── DETERMINISTIC SEED-HASHED RANDOM GENERATOR ────────────────────────────────
function seedRandom(seedStr: string) {
  let hash = 0
  for (let i = 0; i < seedStr.length; i++) {
    hash = seedStr.charCodeAt(i) + ((hash << 5) - hash)
  }
  return function() {
    const x = Math.sin(hash++) * 10000
    return x - Math.floor(x)
  }
}

// ── 1. HELPER FOR ENTITY RECON TARGET GENERATION ────────────────────────────
const getEntityReconTarget = (entity: { type: string; data: any }) => {
  if (!entity) return ''
  const { type, data } = entity
  switch (type) {
    case 'aviation':
      return `adsb-${data.callsign ? data.callsign.trim() : data.id}.opensky-network.org`
    case 'wildfire':
      return `firms-node-${data.id.slice(0, 8)}.nasa.gov`
    case 'airquality':
      return `openaq-sensor-${data.id.slice(0, 8)}.airquality.org`
    case 'acled':
      return `acled-alert-${data.id.slice(0, 8)}.conflict-alert.net`
    case 'earthquake':
      return `seismic-sensor-${data.id.slice(0, 8)}.usgs.gov`
    case 'gdelt':
      if (data.sourceUrl) {
        try {
          const url = new URL(data.sourceUrl)
          return url.hostname
        } catch {
          // ignore
        }
      }
      return `gdelt-node-${data.id.slice(0, 8)}.gdeltproject.org`
    case 'space':
      return `norad-${data.noradId || data.id}.orbital-recon.panopticon.internal`
    default:
      return `${type}-node.panopticon.internal`
  }
}

// ── 2. REAL-TIME CANVAS CCTV SIMULATOR COMPONENT ─────────────────────────────
function CctvLiveFeed({ id, name, status, coordinates }: { id: string; name: string; status: string; coordinates: [number, number] }) {
  const [snapshotUrl, setSnapshotUrl] = React.useState<string>('')
  const canvasRef = React.useRef<HTMLCanvasElement | null>(null)

  // Snapshot polling effect for healthy/degraded cameras
  React.useEffect(() => {
    if (status === 'offline') return

    const updateSnapshot = () => {
      // Bypass CORS via secure backend snapshot proxy with cache-busting timestamp
      setSnapshotUrl(`/api/v1/webcams/proxy?id=${encodeURIComponent(id)}&type=snapshot&t=${Date.now()}`)
    }

    updateSnapshot()
    const interval = setInterval(updateSnapshot, 3000)

    return () => clearInterval(interval)
  }, [id, status])

  // Canvas radar sweep effect for offline cameras
  React.useEffect(() => {
    if (status !== 'offline') return

    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    let animationFrameId: number
    let frameCount = 0

    // Random noise elements
    const blips: { x: number; y: number; size: number; alpha: number; label: string }[] = []
    
    // Seed a couple of signal interference blips around the center
    for (let i = 0; i < 3; i++) {
      blips.push({
        x: 160 + (Math.random() - 0.5) * 100,
        y: 90 + (Math.random() - 0.5) * 60,
        size: 3 + Math.random() * 4,
        alpha: 0.1 + Math.random() * 0.4,
        label: `INTERFERENCE_SEC_${Math.floor(Math.random() * 900 + 100)}`
      })
    }

    const render = () => {
      frameCount++
      
      // 1. Dark tactical background (OLED black/deep green)
      ctx.fillStyle = '#030805'
      ctx.fillRect(0, 0, 320, 180)

      // 2. Draw Concentric Radar rings
      ctx.strokeStyle = 'rgba(0, 255, 0, 0.08)'
      ctx.lineWidth = 1
      for (let r = 20; r <= 140; r += 25) {
        ctx.beginPath()
        ctx.arc(160, 90, r, 0, Math.PI * 2)
        ctx.stroke()
      }

      // Draw crosshairs
      ctx.strokeStyle = 'rgba(0, 255, 0, 0.05)'
      ctx.beginPath()
      ctx.moveTo(160, 10)
      ctx.lineTo(160, 170)
      ctx.moveTo(10, 90)
      ctx.lineTo(310, 90)
      ctx.stroke()

      // 3. Draw Radar Sweep (Green rotating line with fading gradient)
      const sweepAngle = (frameCount * 0.02) % (Math.PI * 2)
      
      // Draw tail trail sweeps for maximum visual fidelity
      for (let i = 0; i < 20; i++) {
        const angle = sweepAngle - (i * 0.015)
        const alpha = Math.max(0, 0.3 - (i * 0.015))
        ctx.strokeStyle = `rgba(0, 255, 0, ${alpha})`
        ctx.lineWidth = i === 0 ? 2.0 : 1.0
        ctx.beginPath()
        ctx.moveTo(160, 90)
        ctx.lineTo(
          160 + 140 * Math.cos(angle),
          90 + 140 * Math.sin(angle)
        )
        ctx.stroke()
      }

      // 4. Draw noise/interference blips
      blips.forEach((b) => {
        // Calculate angular distance to sweep line to make them "light up" when radar passes
        const blipAngle = Math.atan2(b.y - 90, b.x - 160)
        const diff = Math.abs((sweepAngle - blipAngle + Math.PI * 2) % (Math.PI * 2))
        
        let currentAlpha = b.alpha
        if (diff < 0.15) {
          currentAlpha = 0.8 // Flash brightly on sweep pass
        } else {
          // Slow decay
          currentAlpha = Math.max(b.alpha, currentAlpha - 0.02)
        }

        ctx.fillStyle = `rgba(0, 255, 0, ${currentAlpha})`
        ctx.beginPath()
        ctx.arc(b.x, b.y, b.size, 0, Math.PI * 2)
        ctx.fill()

        if (diff < 0.15) {
          ctx.strokeStyle = `rgba(0, 255, 0, ${currentAlpha * 0.5})`
          ctx.strokeRect(b.x - b.size - 2, b.y - b.size - 2, b.size * 2 + 4, b.size * 2 + 4)
          ctx.font = '5px monospace'
          ctx.fillText(b.label, b.x + b.size + 4, b.y + 2)
        }
      })

      // 5. Draw Center Lock Target Box (Simulated Satellite search lock over Cam coordinates)
      ctx.strokeStyle = '#00ff00'
      ctx.lineWidth = 1.5
      ctx.strokeRect(150, 80, 20, 20)
      
      // Target brackets corner indicators
      ctx.beginPath()
      // Top left
      ctx.moveTo(146, 80); ctx.lineTo(146, 76); ctx.lineTo(150, 76)
      // Top right
      ctx.moveTo(174, 80); ctx.lineTo(174, 76); ctx.lineTo(170, 76)
      // Bottom left
      ctx.moveTo(146, 100); ctx.lineTo(146, 104); ctx.lineTo(150, 104)
      // Bottom right
      ctx.moveTo(174, 100); ctx.lineTo(174, 104); ctx.lineTo(170, 104)
      ctx.stroke()

      // 6. HUD text overlay
      ctx.fillStyle = '#00ff00'
      ctx.font = '7px monospace'
      ctx.fillText(`CAM_ID: ${id.toUpperCase()}`, 10, 15)
      ctx.fillText('STATUS: DOWNLINK_FAILURE', 10, 25)
      ctx.fillText('MODE: GEOSPATIAL_RADAR_SWEEP', 10, 35)

      // Warning text
      const isFlash = Math.floor(frameCount / 20) % 2 === 0
      if (isFlash) {
        ctx.fillStyle = '#ff3b30'
        ctx.fillText('NO SIGNAL / LOCKING TELEMETRY...', 10, 180 - 15)
      } else {
        ctx.fillStyle = '#ffcc00'
        ctx.fillText('SCANNING COORDINATES SECTOR...', 10, 180 - 15)
      }

      ctx.fillStyle = '#00ff00'
      ctx.fillText(`LAT: ${coordinates[1].toFixed(5)}`, 320 - 95, 15)
      ctx.fillText(`LON: ${coordinates[0].toFixed(5)}`, 320 - 95, 25)
      
      const sweepPercent = ((sweepAngle / (Math.PI * 2)) * 100).toFixed(0)
      ctx.fillText(`SWEEP_REFRESH: ${sweepPercent}%`, 320 - 95, 180 - 15)

      animationFrameId = requestAnimationFrame(render)
    }

    render()

    return () => {
      cancelAnimationFrame(animationFrameId)
    }
  }, [id, status, coordinates])

  if (status === 'offline') {
    return (
      <div className="relative border border-red-500/30 rounded overflow-hidden bg-[#030805]">
        <canvas
          ref={canvasRef}
          width={320}
          height={180}
          className="w-full h-auto block aspect-video"
        />
        <div className="absolute inset-0 flex items-center justify-center bg-red-950/10 pointer-events-none animate-pulse">
          <span className="px-2 py-0.5 border border-red-500 text-red-500 font-mono text-[9px] font-bold bg-[#0b0f1a]/95 rounded tracking-widest uppercase">
            FEED OFFLINE
          </span>
        </div>
      </div>
    )
  }

  return (
    <div className="relative border border-[#fffb00]/30 rounded overflow-hidden bg-deepest aspect-video flex items-center justify-center">
      {/* Fallback image with automatic snapshot updates */}
      <img
        src={snapshotUrl}
        alt={name}
        className="w-full h-full object-cover animate-fade-in"
        onError={(e) => {
          // If image load fails due to dev environment/offline state, show a custom tactical placeholder grid
          e.currentTarget.style.display = 'none'
          const parent = e.currentTarget.parentElement
          if (parent) {
            const existingFallback = parent.querySelector('.proxy-fallback')
            if (!existingFallback) {
              const fallbackDiv = document.createElement('div')
              fallbackDiv.className = 'proxy-fallback w-full h-full flex flex-col items-center justify-center bg-[#0b0f1a] text-secondary font-mono text-[9px] gap-2 border-dashed border border-[#fffb00]/25'
              fallbackDiv.innerHTML = `
                <div class="w-2.5 h-2.5 rounded-full bg-yellow-400 animate-ping"></div>
                <span class="text-yellow-400 font-bold uppercase tracking-wider">CONNECTING PROXY...</span>
                <span class="opacity-70 text-[8px]">SNAPSHOT ACQUISITION IN PROGRESS</span>
              `
              parent.appendChild(fallbackDiv)
            }
          }
        }}
      />
      {status === 'degraded' && (
        <div className="absolute inset-0 flex items-center justify-center bg-yellow-950/15 pointer-events-none animate-pulse">
          <span className="px-2 py-0.5 border border-[#e8b00f] text-[#e8b00f] font-mono text-[9px] font-bold bg-[#0b0f1a]/95 rounded tracking-widest uppercase">
            SIGNAL DEGRADED
          </span>
        </div>
      )}
      <div className="absolute top-2 left-2 flex items-center gap-1 font-mono text-[8px] bg-black/60 text-primary px-1.5 py-0.5 border border-[#1e3050] rounded select-none">
        <div className={`w-1.5 h-1.5 rounded-full ${status === 'healthy' ? 'bg-green-400 animate-pulse' : 'bg-yellow-400 animate-pulse'}`} />
        <span className="uppercase text-secondary">PROXY DISPATCH [CAM_${id.toUpperCase()}]</span>
      </div>
    </div>
  )
}



// ── 3. OSINT CYBER RECON CONSOLE PANEL COMPONENT ─────────────────────────────
function EntityReconPanel({ entity }: { entity: { type: string; data: any } }) {
  const { activeReconScan, setActiveReconScan } = useMapStore()
  const target = React.useMemo(() => getEntityReconTarget(entity), [entity])
  
  const [isScanning, setIsScanning] = React.useState(false)
  const [logs, setLogs] = React.useState<string[]>([])
  
  const isCurrentScan = activeReconScan && activeReconScan.target === target

  const addLog = (msg: string) => {
    setLogs((prev) => [...prev, `[${new Date().toLocaleTimeString()}] ${msg}`])
  }

  const runOsintScan = async () => {
    if (isScanning) return
    setIsScanning(true)
    setLogs([])

    addLog(`INIT OSINT RECON FOR TARGET: ${target}`)
    addLog(`GEOLOCATED SOURCE: [LAT: ${entity.data.coordinates[1].toFixed(4)}, LON: ${entity.data.coordinates[0].toFixed(4)}]`)

    const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms))

    await delay(500)
    addLog(`RESOLVING GEOPOLITICAL SUBNET ROUTING PATHS...`)
    
    try {
      const res = await fetchReconTrace(target, entity.data.coordinates[1], entity.data.coordinates[0])
      if (!res) {
        addLog(`[-] RECON FAULT: GO INGESTION BACKEND API UNREACHABLE.`)
        setIsScanning(false)
        return
      }

      addLog(`[+] TARGET RESOLVED TO IP: ${res.resolvedIp} (${res.country})`)
      addLog(`[+] QUANTIFYING SUBNET SECURITY THREAT VALUE...`)
      await delay(600)
      addLog(`[+] EXECUTING VULNERABILITY PORT SCAN SEQUENCE...`)
      await delay(400)
      if (res.openPorts && res.openPorts.length > 0) {
        addLog(`[!] COMPROMISED ENTRANCE PORTS DETECTED: ${res.openPorts.join(', ')}`)
      } else {
        addLog(`[+] STATUS: NO EXPOSED SERVICE PORT SECTOR VULNERABILITIES.`)
      }

      addLog(`[+] TRACING NETWORK ROUTING HOP COORDINATES...`)
      await delay(400)

      for (const hop of res.hops) {
        addLog(`[HOP ${hop.hopNumber}] ${hop.ip.padEnd(15)} | ${hop.pingMs}ms | ${hop.isp}`)
        await delay(120)
      }

      await delay(200)
      addLog(`[+] CYBER GEOGRAPHIC VECTOR INJECTION COMPLETE.`)
      addLog(`[+] RECON DATA DISPATCHED TO PANOPTICON CORE INTERFACE.`)
      
      setActiveReconScan(res)
    } catch (e) {
      addLog(`[-] PIPELINE EXCEPTION: GP-DAEMON TRACER CONFLICT.`)
    } finally {
      setIsScanning(false)
    }
  }

  const logBoxRef = React.useRef<HTMLDivElement | null>(null)
  React.useEffect(() => {
    if (logBoxRef.current) {
      logBoxRef.current.scrollTop = logBoxRef.current.scrollHeight
    }
  }, [logs])

  if (isCurrentScan && activeReconScan) {
    const scan = activeReconScan
    const getThreatClass = (score: number) => {
      if (score >= 80) return { text: 'CRITICAL THREAT', color: 'text-red-500' }
      if (score >= 50) return { text: 'HIGH RISK', color: 'text-orange-400' }
      if (score >= 25) return { text: 'MODERATE RISK', color: 'text-yellow-400' }
      return { text: 'LOW SEC-RISK', color: 'text-green-400' }
    }
    const tc = getThreatClass(scan.threatScore)

    const filledBlocks = Math.round(scan.threatScore / 10)
    const blocksStr = '█'.repeat(filledBlocks) + '░'.repeat(10 - filledBlocks)

    return (
      <div className="space-y-3 text-[10px] font-mono border border-[#00ff00]/25 p-3 rounded bg-black/40">
        <div className="flex justify-between items-center pb-1.5 border-b border-[#00ff00]/15">
          <span className="text-[#00ff00] font-bold">OSINT SYSTEM MATRIX</span>
          <span className="text-[8px] bg-[#00ff00]/10 text-[#00ff00] px-1 border border-[#00ff00]/25 rounded">ACTIVE</span>
        </div>

        <div className="space-y-1">
          <div><span className="text-secondary text-[8px] uppercase">TARGET HOST:</span> <span className="text-primary break-all">{scan.target}</span></div>
          <div><span className="text-secondary text-[8px] uppercase">RESOLVED IP:</span> <span className="text-primary">{scan.resolvedIp} [{scan.country}]</span></div>
        </div>

        <div className="p-2 bg-black/60 border border-[#1e3050] rounded flex flex-col gap-1">
          <div className="flex justify-between items-center text-[9px]">
            <span className="text-secondary font-bold">THREAT LEVEL:</span>
            <span className={`font-extrabold ${tc.color}`}>{tc.text} ({scan.threatScore}%)</span>
          </div>
          <div className={`text-sm font-extrabold font-mono tracking-tighter ${tc.color}`}>
            {blocksStr}
          </div>
        </div>

        <div className="space-y-1">
          <span className="text-secondary text-[8px] uppercase block">OPEN GATEWAYS:</span>
          {scan.openPorts && scan.openPorts.length > 0 ? (
            <div className="flex flex-wrap gap-1 mt-0.5">
              {scan.openPorts.map((port) => {
                const isVuln = [21, 22, 23, 80, 445].includes(port)
                return (
                  <span
                    key={port}
                    className={`px-1.5 py-0.5 rounded border text-[9px] font-bold ${
                      isVuln ? 'bg-red-950/20 border-red-500/35 text-red-400' : 'bg-green-950/10 border-green-500/25 text-green-400'
                    }`}
                  >
                    {port}/{port === 22 ? 'SSH' : port === 80 ? 'HTTP' : port === 443 ? 'HTTPS' : port === 21 ? 'FTP' : port === 23 ? 'TELNET' : port === 445 ? 'SMB' : 'TCP'}
                  </span>
                )
              })}
            </div>
          ) : (
            <span className="text-green-400 font-semibold italic text-[9px]">NO PORTS DETECTED</span>
          )}
        </div>

        <div className="space-y-1 border-t border-[#1e3050]/55 pt-2">
          <span className="text-secondary text-[8px] uppercase block">DNS ARCHIVE:</span>
          <div className="bg-black/30 p-1.5 border border-[#1e3050]/55 rounded text-[8px] space-y-1">
            {scan.dnsRecords?.a && (
              <div><span className="text-[#00ff00]">A:</span> {scan.dnsRecords.a.join(', ')}</div>
            )}
            {scan.dnsRecords?.mx && (
              <div><span className="text-[#00ff00]">MX:</span> {scan.dnsRecords.mx.join(', ')}</div>
            )}
            {scan.dnsRecords?.ns && (
              <div><span className="text-[#00ff00]">NS:</span> {scan.dnsRecords.ns.join(', ')}</div>
            )}
          </div>
        </div>

        <div className="space-y-1 border-t border-[#1e3050]/55 pt-2">
          <span className="text-secondary text-[8px] uppercase block">TRACEROUTE HOPS:</span>
          <div className="max-h-24 overflow-y-auto custom-scrollbar bg-black/80 border border-[#00ff00]/15 rounded p-1.5 text-[8px] space-y-1 leading-relaxed text-[#00ff00]/95">
            {scan.hops.map((hop) => (
              <div key={hop.hopNumber} className="flex justify-between font-mono gap-1 hover:bg-[#00ff00]/5 py-0.5 px-1 rounded transition-colors">
                <span className="font-bold flex-shrink-0">H{hop.hopNumber}</span>
                <span className="truncate max-w-[75px] text-primary">{hop.ip}</span>
                <span className="truncate flex-1 max-w-[65px] text-right text-secondary">{hop.isp}</span>
                <span className="text-right flex-shrink-0 font-bold tabular-nums">{hop.pingMs}ms</span>
              </div>
            ))}
          </div>
        </div>

        <button
          onClick={runOsintScan}
          className="w-full text-center py-2 px-3 border border-[#00ff00]/30 hover:border-[#00ff00] bg-[#00ff00]/5 hover:bg-[#00ff00]/15 text-[#00ff00] hover:shadow-[0_0_10px_rgba(0,255,0,0.15)] font-bold rounded transition-all mt-1 uppercase"
        >
          [ RE-LAUNCH RECON VECTOR SCAN ]
        </button>
      </div>
    )
  }

  if (isScanning) {
    return (
      <div className="space-y-2 text-[10px] font-mono border border-[#00ff00]/35 p-3 rounded bg-black/80 flex flex-col">
        <div className="flex items-center justify-between pb-1.5 border-b border-[#00ff00]/20">
          <span className="text-[#00ff00] font-bold animate-pulse uppercase">C2 CYBER RECON ACTIVE</span>
          <div className="w-2 h-2 rounded-full bg-[#00ff00] animate-ping" />
        </div>
        
        <div
          ref={logBoxRef}
          className="h-40 overflow-y-auto custom-scrollbar font-mono text-[8.5px] text-[#00ff00] space-y-1 bg-black/60 p-2 border border-[#00ff00]/15 rounded leading-relaxed"
        >
          {logs.map((line, idx) => (
            <div key={idx} className="break-all whitespace-pre-wrap">{line}</div>
          ))}
          <div className="flex items-center gap-1 mt-1 animate-pulse">
            <span className="inline-block w-1.5 h-3 bg-[#00ff00]" />
            <span className="text-secondary text-[7.5px]">INDEXING SERVICE NODES...</span>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="p-3 bg-black/30 border border-[#1e3050] rounded font-mono text-[10px] space-y-2.5">
      <div className="flex flex-col gap-1">
        <span className="text-secondary text-[8px] uppercase">SECURITY ENDPOINT TARGET:</span>
        <span className="text-primary font-semibold break-all">{target}</span>
      </div>
      <p className="text-secondary text-[9px] leading-relaxed">
        Establish secure network geometry and assess security topology profiles across global hops.
      </p>
      <button
        onClick={runOsintScan}
        className="w-full text-center py-2.5 px-4 border border-[#00ff00]/40 hover:border-[#00ff00] bg-[#00ff00]/5 hover:bg-[#00ff00]/15 text-[#00ff00] hover:shadow-[0_0_12px_rgba(0,255,0,0.25)] font-bold rounded transition-all uppercase"
      >
        [ RUN OSINT CYBER RECON SCAN ]
      </button>
    </div>
  )
}

// ── 3.5. SATELLITE OPTICAL SENSOR DOWNLINK COMPONENT ────────────────────────
function SatelliteOpticalDownlink({ sat }: { sat: SatelliteEntity }) {
  const canvasRef = React.useRef<HTMLCanvasElement | null>(null)

  React.useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    let animationFrameId: number
    let frameCount = 0

    // Stars / terrain points
    const stars: { x: number; y: number; size: number; alpha: number }[] = []
    for (let i = 0; i < 15; i++) {
      stars.push({
        x: Math.random() * 320,
        y: Math.random() * 180,
        size: Math.random() * 1.5,
        alpha: 0.2 + Math.random() * 0.8,
      })
    }

    const render = () => {
      frameCount++
      
      // 1. Dark cyan-green base
      ctx.fillStyle = '#040b07'
      ctx.fillRect(0, 0, 320, 180)

      // 2. Stars
      ctx.fillStyle = 'rgba(0, 240, 255, 0.2)'
      stars.forEach((s) => {
        ctx.fillRect(s.x, s.y, s.size, s.size)
        if (Math.random() < 0.05) {
          s.alpha = 0.2 + Math.random() * 0.8
        }
      })

      // 3. Grid lines
      ctx.strokeStyle = 'rgba(0, 240, 255, 0.06)'
      ctx.lineWidth = 1
      for (let x = 0; x < 320; x += 25) {
        ctx.beginPath()
        ctx.moveTo(x, 0)
        ctx.lineTo(x, 180)
        ctx.stroke()
      }
      const scrollY = (frameCount * 0.5) % 25
      for (let y = scrollY; y < 180; y += 25) {
        ctx.beginPath()
        ctx.moveTo(0, y)
        ctx.lineTo(320, y)
        ctx.stroke()
      }

      // 4. Scanning Radar
      ctx.strokeStyle = 'rgba(0, 240, 255, 0.1)'
      ctx.beginPath()
      ctx.arc(160, 90, 70, 0, Math.PI * 2)
      ctx.stroke()

      ctx.beginPath()
      ctx.arc(160, 90, 76, 0, Math.PI * 2)
      ctx.stroke()

      const sweepAngle = (frameCount * 0.02) % (Math.PI * 2)
      ctx.strokeStyle = 'rgba(0, 240, 255, 0.3)'
      ctx.lineWidth = 1.5
      ctx.beginPath()
      ctx.moveTo(160, 90)
      ctx.lineTo(
        160 + 70 * Math.cos(sweepAngle),
        90 + 70 * Math.sin(sweepAngle)
      )
      ctx.stroke()

      // Target lock box
      const targetX = 160 + Math.sin(frameCount * 0.01) * 35
      const targetY = 90 + Math.cos(frameCount * 0.015) * 20
      
      ctx.strokeStyle = '#00f0ff'
      ctx.lineWidth = 1.2
      ctx.beginPath()
      ctx.moveTo(targetX - 8, targetY)
      ctx.lineTo(targetX + 8, targetY)
      ctx.moveTo(targetX, targetY - 8)
      ctx.lineTo(targetX, targetY + 8)
      ctx.stroke()
      
      ctx.strokeRect(targetX - 5, targetY - 5, 10, 10)
      
      ctx.fillStyle = '#00f0ff'
      ctx.font = '6px monospace'
      ctx.fillText(`LOCK: LAT ${sat.coordinates[1].toFixed(4)}`, targetX + 12, targetY - 2)
      ctx.fillText(`LON ${sat.coordinates[0].toFixed(4)}`, targetX + 12, targetY + 5)

      // Downlink Overlays
      const blink = Math.floor(frameCount / 15) % 2 === 0
      if (blink) {
        ctx.fillStyle = '#00f0ff'
        ctx.fillText('RECEIVING DOWNLINK...', 12, 18)
        
        ctx.beginPath()
        ctx.arc(320 - 32, 15, 2.5, 0, Math.PI * 2)
        ctx.fill()
      }
      ctx.fillStyle = '#00f0ff'
      ctx.fillText('C2_DOWNLINK', 320 - 64, 18)

      // HUD text details
      ctx.font = '7px monospace'
      ctx.fillText(`ORBITAL SPEED: ${sat.velocityKms.toFixed(3)} KM/S`, 12, 180 - 24)
      ctx.fillText(`ALTITUDE SECTOR: ${sat.altitudeKm.toFixed(2)} KM`, 12, 180 - 14)
      ctx.fillText(`ORBITAL CLASS: ${sat.satelliteType.toUpperCase()}`, 12, 180 - 4)

      const signalQualityStr = blink ? 'OPTIMAL' : 'STABLE'
      ctx.fillText(`SIG: ${signalQualityStr}`, 320 - 64, 180 - 4)

      animationFrameId = requestAnimationFrame(render)
    }

    render()

    return () => {
      cancelAnimationFrame(animationFrameId)
    }
  }, [sat.id, sat.coordinates, sat.velocityKms, sat.altitudeKm, sat.satelliteType])

  return (
    <div className="relative border border-[#00f0ff]/30 rounded overflow-hidden bg-[#040b07]">
      <canvas
        ref={canvasRef}
        width={320}
        height={180}
        className="w-full h-auto block aspect-video"
      />
      <div className="absolute top-2 left-2 flex items-center gap-1 font-mono text-[8px] bg-black/40 text-secondary px-1 border border-[#1e3050] rounded">
        <div className="w-1.5 h-1.5 rounded-full bg-accent animate-pulse" />
        <span>SATELLITE OPTICAL SENSOR FEED</span>
      </div>
    </div>
  )
}

// ── 3.6. NEXT PASSOVER FLYBYS COMPONENT ──────────────────────────────────────
function FlyoverTimers({ sat }: { sat: SatelliteEntity }) {
  const [timers, setTimers] = React.useState({
    tokyo: 0,
    london: 0,
    newYork: 0,
  })

  React.useEffect(() => {
    // Seed random starting intervals in seconds
    const initialTimers = {
      tokyo: 300 + Math.floor(Math.random() * 900),
      london: 1200 + Math.floor(Math.random() * 1500),
      newYork: 2400 + Math.floor(Math.random() * 2000),
    }
    setTimers(initialTimers)

    const interval = setInterval(() => {
      setTimers((prev) => {
        const next = {
          tokyo: prev.tokyo > 0 ? prev.tokyo - 1 : 1800,
          london: prev.london > 0 ? prev.london - 1 : 2700,
          newYork: prev.newYork > 0 ? prev.newYork - 1 : 3600,
        }
        return next
      })
    }, 1000)

    return () => clearInterval(interval)
  }, [sat.id])

  const formatTime = (sec: number) => {
    const m = Math.floor(sec / 60)
    const s = sec % 60
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`
  }

  return (
    <div className="p-3 bg-deepest/45 border border-[#1e3050] rounded space-y-2.5 font-mono">
      <span className="text-[8px] text-secondary tracking-widest uppercase block border-b border-[#1e3050] pb-1">NEXT C2 PASSOVER FLYBYS</span>
      
      <div className="flex justify-between items-center text-[10px]">
        <span className="text-secondary text-[8px] uppercase">TOKYO DOWNTOWN (NRT):</span>
        <span className="font-extrabold text-[#00f0ff] tabular-nums">{formatTime(timers.tokyo)}</span>
      </div>
      <div className="flex justify-between items-center text-[10px] border-t border-[#1e3050] pt-1.5">
        <span className="text-secondary text-[8px] uppercase">LONDON SECTOR (LHR):</span>
        <span className="font-extrabold text-[#00f0ff] tabular-nums">{formatTime(timers.london)}</span>
      </div>
      <div className="flex justify-between items-center text-[10px] border-t border-[#1e3050] pt-1.5">
        <span className="text-secondary text-[8px] uppercase">NEW YORK HUDSON (JFK):</span>
        <span className="font-extrabold text-[#00f0ff] tabular-nums">{formatTime(timers.newYork)}</span>
      </div>
    </div>
  )
}

// ── 4. MAIN DETAIL INSPECTOR PANEL EXPORT ────────────────────────────────────
export default function DetailInspector() {
  const { selectedEntityId, setSelectedEntityId, activeReconScan } = useMapStore()

  // Fetch SWR Cache states
  const { data: earthquakes = [] } = useSWR('usgs-earthquakes-core', fetchEarthquakes)
  const { data: gdeltEvents = [] } = useSWR(['gdelt-events-core', 'protest'], () => fetchGdeltEvents('protest'))
  const { data: aircraft = [] } = useSWR('opensky-aircraft-core', fetchAircraft)
  const { data: wildfires = [] } = useSWR('nasa-wildfires-core', fetchWildfires)
  const { data: airquality = [] } = useSWR('openaq-airquality-core', fetchAirQuality)
  const { data: acledEvents = [] } = useSWR('acled-conflicts-core', fetchAcledEvents)
  const { data: webcams = [] } = useSWR('webcams-core', fetchWebcams)
  const { data: satellites = [] } = useSWR('space-satellites-core', fetchSatellites)

  // Search for the active selected entity across domains
  const entity = React.useMemo(() => {
    if (!selectedEntityId) return null

    // Search custom add-on layers
    if (selectedEntityId.includes('-add-') && selectedEntityId.includes('-node-')) {
      const match = selectedEntityId.match(/^([a-z]+-add-\d+)-node-(\d+)$/)
      if (match) {
        const layerId = match[1]
        const nodeIndex = parseInt(match[2]!, 10)
        // Find the layer definition in config
        const layerDef = (layersConfig as any[]).find(l => l.id === layerId)
        if (layerDef) {
          // Re-generate the feature using our deterministic generator
          const rand = seedRandom(layerId)
          const count = Math.floor(rand() * 11) + 5
          if (nodeIndex >= 0 && nodeIndex < count) {
            // Find that specific node's data
            let targetNode = null
            for (let i = 0; i <= nodeIndex; i++) {
              const lat = rand() * 140 - 70
              const lng = rand() * 360 - 180
              const intensity = Math.floor(rand() * 100)
              const status = rand() > 0.15 ? 'NOMINAL' : 'DEGRADED'
              if (i === nodeIndex) {
                targetNode = {
                  id: selectedEntityId,
                  coordinates: [lng, lat],
                  label: `${layerDef.name} Node #${i + 1}`,
                  intensity,
                  status,
                  description: `Operational Telemetry Node for ${layerDef.name}. Signal strength: ${intensity}%. Status: ACTIVE.`,
                  layerName: layerDef.name,
                  color: layerDef.paint['circle-color'] || '#0066cc',
                  domainName: layerDef.id.startsWith('climate') ? 'Climate & Atmosphere' :
                              layerDef.id.startsWith('geopol') ? 'Geopolitical & Threat' :
                              layerDef.id.startsWith('cyber') ? 'OSINT & Cyber Recon' : 'Logistics & Infrastructure'
                }
                break
              }
            }
            if (targetNode) {
              return { type: 'custom-node', data: targetNode }
            }
          }
        }
      }
    }

    // Search Space Satellites
    const sat = satellites.find((item) => item.id === selectedEntityId)
    if (sat) return { type: 'space', data: sat }

    // Search Webcams
    const cam = webcams.find((item) => item.id === selectedEntityId)
    if (cam) return { type: 'webcam', data: cam }

    // Search Active Traceroute Hops
    if (activeReconScan && Array.isArray(activeReconScan.hops)) {
      const hop = activeReconScan.hops.find((h) => `hop-${h.hopNumber}` === selectedEntityId)
      if (hop) return { type: 'recon-hop', data: hop }
    }

    // Search Aviation
    const ac = aircraft.find((item) => item.id === selectedEntityId)
    if (ac) return { type: 'aviation', data: ac }

    // Search Wildfires
    const wf = wildfires.find((item) => item.id === selectedEntityId)
    if (wf) return { type: 'wildfire', data: wf }

    // Search Air Quality
    const aq = airquality.find((item) => item.id === selectedEntityId)
    if (aq) return { type: 'airquality', data: aq }

    // Search ACLED Geopolitical Conflicts
    const acl = acledEvents.find((item) => item.id === selectedEntityId)
    if (acl) return { type: 'acled', data: acl }

    // Search Earthquakes
    const eq = earthquakes.find((item) => item.id === selectedEntityId)
    if (eq) return { type: 'earthquake', data: eq }

    // Search GDELT
    const gd = gdeltEvents.find((item) => item.id === selectedEntityId)
    if (gd) return { type: 'gdelt', data: gd }

    return null
  }, [selectedEntityId, webcams, activeReconScan, aircraft, wildfires, airquality, acledEvents, earthquakes, gdeltEvents, satellites])

  if (!selectedEntityId || !entity) return null

  const handleClose = () => {
    setSelectedEntityId(null)
  }

  // Helper for Air Quality AQI banding
  const getAqiStatus = (val: number) => {
    if (val <= 12.0) return { label: 'GOOD', color: 'text-status-info-text', bg: 'bg-[#34c759]/10', border: 'border-[#34c759]/30', desc: 'Air quality is satisfactory, and air pollution poses little or no risk.' }
    if (val <= 35.4) return { label: 'MODERATE', color: 'text-yellow-400', bg: 'bg-yellow-400/10', border: 'border-yellow-400/30', desc: 'Air quality is acceptable; however, sensitive individuals may experience moderate symptoms.' }
    if (val <= 55.4) return { label: 'UNHEALTHY SENSITIVE', color: 'text-orange-400', bg: 'bg-orange-400/10', border: 'border-orange-400/30', desc: 'Members of sensitive groups may experience health effects.' }
    if (val <= 150.4) return { label: 'UNHEALTHY', color: 'text-red-500', bg: 'bg-red-500/10', border: 'border-red-500/30', desc: 'Everyone may begin to experience health effects; sensitive members may experience more serious effects.' }
    return { label: 'HAZARDOUS', color: 'text-purple-400', bg: 'bg-[#af52de]/10', border: 'border-[#af52de]/30', desc: 'Health warning of emergency conditions; the entire population is more likely to be affected.' }
  }

  return (
    <div className="absolute right-4 top-4 bottom-4 w-80 z-30 flex flex-col bg-[#0b0f1a]/85 backdrop-blur-md border border-[#1e3050] rounded-lg shadow-2xl overflow-hidden animate-slide-in">
      {/* ── HEADER ────────────────────────────────────────────────────────── */}
      <div className="flex items-center justify-between p-4 border-b border-[#1e3050] bg-deepest/55">
        <div className="flex items-center gap-2">
          {entity.type === 'webcam' && <Video className="w-4 h-4 text-[#fffb00]" />}
          {entity.type === 'recon-hop' && <Network className="w-4 h-4 text-[#00ff00]" />}
          {entity.type === 'aviation' && <Plane className="w-4 h-4 text-[#00f0ff]" />}
          {entity.type === 'wildfire' && <Flame className="w-4 h-4 text-[#ff3b30]" />}
          {entity.type === 'airquality' && <Wind className="w-4 h-4 text-[#34c759]" />}
          {entity.type === 'acled' && <ShieldAlert className="w-4 h-4 text-[#ff9500]" />}
          {entity.type === 'earthquake' && <Activity className="w-4 h-4 text-red-500" />}
          {entity.type === 'gdelt' && <Globe className="w-4 h-4 text-emerald-400" />}
          {entity.type === 'space' && <Satellite className="w-4 h-4 text-[#00f0ff]" />}
          <span className="text-[10px] font-mono font-bold tracking-widest text-secondary uppercase">
            {entity.type} DETAILED INTEL
          </span>
        </div>
        <button
          onClick={handleClose}
          className="p-1 rounded hover:bg-hover transition-colors text-secondary hover:text-primary"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* ── CONTENTS ──────────────────────────────────────────────────────── */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4 custom-scrollbar text-xs">
        
        {/* ── WEBCAM DETAILS ── */}
        {entity.type === 'webcam' && (() => {
          const cam = entity.data as WebcamEntity
          return (
            <div className="space-y-4 font-mono">
              <div className="p-3 bg-deepest/60 border border-[#fffb00]/30 rounded flex flex-col gap-1 items-center justify-center">
                <Video className="w-8 h-8 text-[#fffb00] animate-pulse" />
                <span className="text-sm font-bold tracking-wider text-[#fffb00] mt-1 text-center">
                  CCTV SURVEILLANCE FEED
                </span>
                <span className="text-[9px] text-secondary">
                  SECURE ENDPOINT INTEL SOURCE
                </span>
              </div>

              {/* Simulated Live Feed Canvas */}
              <CctvLiveFeed id={cam.id} name={cam.label} status={cam.status} coordinates={cam.coordinates} />

              {/* Status and details grid */}
              <div className="p-3 bg-deepest/45 border border-[#1e3050] rounded space-y-2.5">
                <span className="text-[8px] text-secondary tracking-widest uppercase block border-b border-[#1e3050] pb-1">ENDPOINT TELEMETRY</span>
                
                <div className="flex justify-between items-center text-[10px]">
                  <span className="text-secondary text-[8px] uppercase">ENDPOINT NAME:</span>
                  <span className="font-semibold text-primary max-w-[130px] truncate">{cam.label.replace('CCTV: ', '')}</span>
                </div>

                <div className="flex justify-between items-center text-[10px] border-t border-[#1e3050] pt-1.5">
                  <span className="text-secondary text-[8px] uppercase">ENDPOINT ID:</span>
                  <span className="text-[#fffb00] font-semibold">{cam.id}</span>
                </div>

                <div className="flex justify-between items-center text-[10px] border-t border-[#1e3050] pt-1.5">
                  <span className="text-secondary text-[8px] uppercase">FEED STATUS:</span>
                  <span className={`font-semibold uppercase ${
                    cam.status === 'healthy' ? 'text-green-400' : cam.status === 'degraded' ? 'text-yellow-400' : 'text-red-500'
                  }`}>{cam.status}</span>
                </div>

                <div className="flex justify-between items-center text-[10px] border-t border-[#1e3050] pt-1.5">
                  <span className="text-secondary text-[8px] uppercase">LATITUDE:</span>
                  <span className="text-primary tabular-nums">{cam.coordinates[1]?.toFixed(5)}</span>
                </div>

                <div className="flex justify-between items-center text-[10px] border-t border-[#1e3050] pt-1.5">
                  <span className="text-secondary text-[8px] uppercase">LONGITUDE:</span>
                  <span className="text-primary tabular-nums">{cam.coordinates[0]?.toFixed(5)}</span>
                </div>

                <div className="flex flex-col gap-1 border-t border-[#1e3050] pt-1.5">
                  <span className="text-secondary text-[8px] uppercase">SECURE RTSP TARGET:</span>
                  <span className="text-[9px] text-[#00f0ff] break-all bg-deepest/50 p-1.5 rounded border border-[#1e3050] select-all">
                    {cam.streamUrl || `rtsp://admin:secure@${cam.coordinates[1]?.toFixed(3)}:554/live`}
                  </span>
                </div>
              </div>
            </div>
          )
        })()}

        {/* ── RECON HOP DETAILS ── */}
        {entity.type === 'recon-hop' && (() => {
          const hop = entity.data as any
          return (
            <div className="space-y-4 font-mono">
              <div className="p-3 bg-deepest/60 border border-[#00ff00]/30 rounded flex flex-col gap-1 items-center justify-center">
                <Network className="w-8 h-8 text-[#00ff00] animate-pulse" />
                <span className="text-sm font-bold tracking-wider text-[#00ff00] mt-1 text-center">
                  TRACEROUTE HOP NODE
                </span>
                <span className="text-[9px] text-secondary">
                  INTERMEDIATE ROUTING ENDPOINT
                </span>
              </div>

              {/* Hop Details */}
              <div className="p-3 bg-deepest/45 border border-[#1e3050] rounded space-y-2.5">
                <span className="text-[8px] text-secondary tracking-widest uppercase block border-b border-[#1e3050] pb-1">HOP DATA METRICS</span>
                
                <div className="flex justify-between items-center text-[10px]">
                  <span className="text-secondary text-[8px] uppercase">HOP INDEX:</span>
                  <span className="font-semibold text-[#00ff00]">#{hop.hopNumber}</span>
                </div>

                <div className="flex justify-between items-center text-[10px] border-t border-[#1e3050] pt-1.5">
                  <span className="text-secondary text-[8px] uppercase">IP ADDRESS:</span>
                  <span className="text-primary font-semibold select-all">{hop.ip}</span>
                </div>

                <div className="flex justify-between items-center text-[10px] border-t border-[#1e3050] pt-1.5">
                  <span className="text-secondary text-[8px] uppercase">PING LATENCY:</span>
                  <span className="text-green-400 font-semibold tabular-nums">{hop.pingMs} MS</span>
                </div>

                <div className="flex justify-between items-center text-[10px] border-t border-[#1e3050] pt-1.5">
                  <span className="text-secondary text-[8px] uppercase">ISP / NETWORK:</span>
                  <span className="text-primary font-semibold max-w-[130px] truncate" title={hop.isp}>{hop.isp}</span>
                </div>

                <div className="flex justify-between items-center text-[10px] border-t border-[#1e3050] pt-1.5">
                  <span className="text-secondary text-[8px] uppercase">COORDINATES:</span>
                  <span className="text-primary">[{hop.lat.toFixed(4)}, {hop.lon.toFixed(4)}]</span>
                </div>
              </div>
            </div>
          )
        })()}
        
        {/* ── AVIATION DETAILS ── */}
        {entity.type === 'aviation' && (() => {
          const ac = entity.data as any
          const altFt = ac.baroAltitude ? ac.baroAltitude * 3.28084 : 0
          const fl = Math.round(altFt / 100)
          const speedKts = ac.velocity ? ac.velocity * 1.94384 : 0
          const vRateFpm = ac.verticalRate ? ac.verticalRate * 196.85 : 0

          return (
            <div className="space-y-4 font-mono">
              <div className="p-3 bg-deepest/60 border border-[#1e3050] rounded flex flex-col gap-1 items-center justify-center">
                <span className="text-2xl font-bold tracking-wider text-[#00f0ff]">
                  {ac.callsign || 'N/A'}
                </span>
                <span className="text-[9px] text-secondary">
                  ICAO24: {ac.id} | ORIGIN: {ac.originCountry || 'N/A'}
                </span>
              </div>

              {/* Grid Widgets */}
              <div className="grid grid-cols-2 gap-2">
                <div className="p-2.5 bg-deepest/45 border border-[#1e3050] rounded flex flex-col">
                  <span className="text-[8px] text-secondary uppercase">Altitude</span>
                  <span className="text-sm font-semibold text-[#00f0ff] mt-0.5">
                    {altFt > 0 ? `${altFt.toLocaleString(undefined, { maximumFractionDigits: 0 })} FT` : 'GROUND'}
                  </span>
                  {altFt > 0 && (
                    <span className="text-[8px] text-secondary mt-0.5">Flight Level FL{fl}</span>
                  )}
                </div>

                <div className="p-2.5 bg-deepest/45 border border-[#1e3050] rounded flex flex-col">
                  <span className="text-[8px] text-secondary uppercase">Velocity</span>
                  <span className="text-sm font-semibold text-[#00f0ff] mt-0.5">
                    {speedKts > 0 ? `${Math.round(speedKts)} KTS` : '0 KTS'}
                  </span>
                  <span className="text-[8px] text-secondary mt-0.5">{Math.round(ac.velocity || 0)} M/S GS</span>
                </div>

                <div className="p-2.5 bg-deepest/45 border border-[#1e3050] rounded flex flex-col">
                  <span className="text-[8px] text-secondary uppercase flex items-center gap-1">
                    True Track <Compass className="w-2.5 h-2.5" />
                  </span>
                  <span className="text-sm font-semibold text-primary mt-0.5">
                    {Math.round(ac.trueTrack || 0)}°
                  </span>
                  <div className="flex items-center gap-1 text-[8px] text-secondary mt-0.5">
                    <Navigation
                      className="w-2 h-2 text-[#00f0ff]"
                      style={{ transform: `rotate(${ac.trueTrack || 0}deg)` }}
                    />
                    <span>HEADING VECTOR</span>
                  </div>
                </div>

                <div className="p-2.5 bg-deepest/45 border border-[#1e3050] rounded flex flex-col">
                  <span className="text-[8px] text-secondary uppercase flex items-center gap-1">
                    V-Rate {vRateFpm > 0 ? <TrendingUp className="w-2.5 h-2.5 text-[#34c759]" /> : vRateFpm < 0 ? <TrendingDown className="w-2.5 h-2.5 text-[#ff3b30]" /> : null}
                  </span>
                  <span className={`text-sm font-semibold mt-0.5 ${vRateFpm > 0 ? 'text-[#34c759]' : vRateFpm < 0 ? 'text-[#ff3b30]' : 'text-primary'}`}>
                    {vRateFpm > 0 ? `+${Math.round(vRateFpm)}` : Math.round(vRateFpm)}
                  </span>
                  <span className="text-[8px] text-secondary mt-0.5">FT/MIN VERTICAL</span>
                </div>
              </div>

              {/* Map positioning details */}
              <div className="p-2.5 bg-deepest/45 border border-[#1e3050] rounded space-y-1.5">
                <span className="text-[8px] text-secondary uppercase block">Position Coordinate</span>
                <div className="flex justify-between text-[10px]">
                  <span>LATITUDE:</span>
                  <span className="text-primary tabular-nums">{ac.coordinates[1]?.toFixed(5)}</span>
                </div>
                <div className="flex justify-between text-[10px]">
                  <span>LONGITUDE:</span>
                  <span className="text-primary tabular-nums">{ac.coordinates[0]?.toFixed(5)}</span>
                </div>
              </div>

              {/* OSINT CYBER RECON BLOCK */}
              <div className="border-t border-[#1e3050] pt-4 space-y-3 font-mono">
                <span className="text-[8px] font-bold tracking-widest text-[#00ff00] uppercase block">
                  🛡️ OSINT CYBER SEC-OPS
                </span>
                <EntityReconPanel entity={entity} />
              </div>
            </div>
          )
        })()}

        {/* ── WILDFIRE DETAILS ── */}
        {entity.type === 'wildfire' && (() => {
          const wf = entity.data as any
          return (
            <div className="space-y-4 font-mono">
              <div className="p-3 bg-deepest/60 border border-[#ff3b30]/35 rounded flex flex-col gap-1 items-center justify-center">
                <Flame className="w-8 h-8 text-[#ff3b30] animate-pulse" />
                <span className="text-xl font-bold tracking-wider text-[#ff3b30] mt-1">
                  ACTIVE WILDFIRE
                </span>
                <span className="text-[9px] text-secondary">
                  HOTSPOT DETECTED BY {wf.satellite || 'MODIS'}
                </span>
              </div>

              {/* Fire Radiative Power Widget */}
              <div className="p-3.5 bg-[#ff3b30]/5 border border-[#ff3b30]/25 rounded flex flex-col gap-1">
                <span className="text-[8px] text-[#ff3b30] font-semibold tracking-wider uppercase">Fire Radiative Power (FRP)</span>
                <div className="flex items-baseline gap-1 mt-1">
                  <span className="text-3xl font-extrabold text-[#ff3b30]">{wf.frp?.toFixed(1)}</span>
                  <span className="text-xs text-secondary">MW</span>
                </div>
                <span className="text-[9px] text-secondary mt-1">
                  Total electromagnetic energy output radiated per unit time. Indicates combustion intensity.
                </span>
              </div>

              {/* Extra parameters */}
              <div className="p-3 bg-deepest/45 border border-[#1e3050] rounded space-y-2">
                <div className="flex justify-between items-center pb-1.5 border-b border-[#1e3050]">
                  <span className="text-[8px] text-secondary uppercase">Confidence</span>
                  <span className="text-[10px] font-semibold text-primary">{wf.confidence || 'N/A'}</span>
                </div>
                <div className="flex justify-between items-center pb-1.5 border-b border-[#1e3050]">
                  <span className="text-[8px] text-secondary uppercase">Brightness</span>
                  <span className="text-[10px] font-semibold text-primary">{wf.brightness?.toFixed(1)} K</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-[8px] text-secondary uppercase">Coordinates</span>
                  <span className="text-[10px] font-semibold text-primary">[{wf.coordinates[1]?.toFixed(4)}, {wf.coordinates[0]?.toFixed(4)}]</span>
                </div>
              </div>

              {/* OSINT CYBER RECON BLOCK */}
              <div className="border-t border-[#1e3050] pt-4 space-y-3 font-mono">
                <span className="text-[8px] font-bold tracking-widest text-[#00ff00] uppercase block">
                  🛡️ OSINT CYBER SEC-OPS
                </span>
                <EntityReconPanel entity={entity} />
              </div>
            </div>
          )
        })()}

        {/* ── AIR QUALITY DETAILS ── */}
        {entity.type === 'airquality' && (() => {
          const aq = entity.data as any
          const aqi = getAqiStatus(aq.value)

          return (
            <div className="space-y-4">
              <div className="p-3 bg-deepest/60 border border-[#1e3050] rounded flex flex-col gap-1 items-center justify-center font-mono">
                <Wind className="w-7 h-7 text-[#34c759]" />
                <span className="text-sm font-bold tracking-wider text-primary mt-1 text-center max-w-[200px] truncate">
                  {aq.location || 'Monitoring Station'}
                </span>
                <span className="text-[9px] text-secondary">
                  Global OpenAQ Observation Network
                </span>
              </div>

              {/* AQI Level Card */}
              <div className={`p-4 border ${aqi.border} ${aqi.bg} rounded flex flex-col items-center gap-1`}>
                <span className="text-[8px] text-secondary font-bold font-mono tracking-widest uppercase">EPA AQI CLASSIFICATION</span>
                <span className={`text-lg font-extrabold tracking-wider ${aqi.color} font-mono mt-0.5`}>
                  {aqi.label}
                </span>
                <div className="flex items-baseline gap-1 mt-1 font-mono">
                  <span className="text-3xl font-extrabold text-primary">{aq.value?.toFixed(1)}</span>
                  <span className="text-xs text-secondary">{aq.unit || 'µg/m³'}</span>
                </div>
                <span className="text-[8px] text-secondary font-bold font-mono uppercase mt-1">PARAMETER: {aq.parameter?.toUpperCase()}</span>
                <span className="text-[10px] text-secondary text-center mt-2 leading-relaxed font-mono">
                  {aqi.desc}
                </span>
              </div>

              {/* Geographic anchor */}
              <div className="p-2.5 bg-deepest/45 border border-[#1e3050] rounded space-y-1.5 font-mono">
                <div className="flex justify-between text-[10px]">
                  <span className="text-secondary text-[8px] uppercase">COORDINATES:</span>
                  <span className="text-primary">[{aq.coordinates[1]?.toFixed(4)}, {aq.coordinates[0]?.toFixed(4)}]</span>
                </div>
              </div>

              {/* OSINT CYBER RECON BLOCK */}
              <div className="border-t border-[#1e3050] pt-4 space-y-3 font-mono">
                <span className="text-[8px] font-bold tracking-widest text-[#00ff00] uppercase block">
                  🛡️ OSINT CYBER SEC-OPS
                </span>
                <EntityReconPanel entity={entity} />
              </div>
            </div>
          )
        })()}

        {/* ── ACLED CONFLICT DETAILS ── */}
        {entity.type === 'acled' && (() => {
          const acl = entity.data as any
          const dateStr = acl.timestamp ? new Date(acl.timestamp).toLocaleDateString() : 'N/A'

          return (
            <div className="space-y-4">
              <div className="p-3 bg-deepest/60 border border-[#ff9500]/25 rounded flex flex-col gap-1 items-center justify-center font-mono">
                <ShieldAlert className="w-7 h-7 text-[#ff9500] animate-pulse" />
                <span className="text-sm font-bold tracking-wider text-[#ff9500] mt-1 uppercase text-center">
                  {acl.eventType || 'Conflict Event'}
                </span>
                <span className="text-[9px] text-secondary">
                  ACLED Armed Conflict Intelligence
                </span>
              </div>

              {/* Fatalities badge */}
              <div className={`p-3 border rounded flex items-center justify-between font-mono ${
                acl.fatalities > 0 ? 'bg-red-500/10 border-red-500/30' : 'bg-[#ff9500]/10 border-[#ff9500]/30'
              }`}>
                <div className="flex items-center gap-2">
                  <Skull className={`w-5 h-5 ${acl.fatalities > 0 ? 'text-red-500' : 'text-[#ff9500]'}`} />
                  <div className="flex flex-col">
                    <span className="text-[8px] text-secondary uppercase font-semibold">Reported Fatalities</span>
                    <span className={`text-base font-extrabold ${acl.fatalities > 0 ? 'text-red-500' : 'text-primary'}`}>
                      {acl.fatalities || 'ZERO'}
                    </span>
                  </div>
                </div>
              </div>

              {/* Geopolitical Actors involved */}
              <div className="p-3 bg-deepest/45 border border-[#1e3050] rounded space-y-2.5 font-mono">
                <span className="text-[8px] text-secondary tracking-widest uppercase block border-b border-[#1e3050] pb-1">COMBATANTS / ACTORS</span>
                
                <div className="space-y-1">
                  <span className="text-[8px] text-secondary uppercase">Primary Actor:</span>
                  <span className="text-[11px] font-semibold text-primary block leading-tight">{acl.actor1 || 'Unknown Group'}</span>
                </div>

                {acl.actor2 && (
                  <div className="space-y-1 border-t border-[#1e3050] pt-1.5">
                    <span className="text-[8px] text-secondary uppercase">Opposing Actor:</span>
                    <span className="text-[11px] font-semibold text-red-400 block leading-tight">{acl.actor2}</span>
                  </div>
                )}
              </div>

              {/* Location & Log Entries */}
              <div className="p-3 bg-deepest/45 border border-[#1e3050] rounded space-y-2 font-mono">
                <div className="flex items-start gap-1.5 text-[10px]">
                  <MapPin className="w-3.5 h-3.5 text-secondary flex-shrink-0 mt-0.5" />
                  <div className="flex flex-col leading-tight">
                    <span className="text-[8px] text-secondary uppercase">Operational Area</span>
                    <span className="text-primary font-semibold mt-0.5">{acl.country || 'International Area'}</span>
                  </div>
                </div>

                <div className="flex items-start gap-1.5 text-[10px] border-t border-[#1e3050] pt-2">
                  <Calendar className="w-3.5 h-3.5 text-secondary flex-shrink-0 mt-0.5" />
                  <div className="flex flex-col leading-tight">
                    <span className="text-[8px] text-secondary uppercase">Intel Timestamp</span>
                    <span className="text-primary mt-0.5">{dateStr}</span>
                  </div>
                </div>

                <div className="flex flex-col gap-1 border-t border-[#1e3050] pt-2">
                  <span className="text-[8px] text-secondary uppercase flex items-center gap-1">
                    <BookOpen className="w-2.5 h-2.5 text-[#ff9500]" /> Intelligence Notes:
                  </span>
                  <p className="text-[10px] text-secondary leading-relaxed bg-deepest/20 p-2 border border-[#1e3050]/50 rounded mt-0.5 max-h-36 overflow-y-auto custom-scrollbar">
                    {acl.notes || 'No detailed dispatches cataloged for this incident.'}
                  </p>
                </div>
              </div>

              {/* OSINT CYBER RECON BLOCK */}
              <div className="border-t border-[#1e3050] pt-4 space-y-3 font-mono">
                <span className="text-[8px] font-bold tracking-widest text-[#00ff00] uppercase block">
                  🛡️ OSINT CYBER SEC-OPS
                </span>
                <EntityReconPanel entity={entity} />
              </div>
            </div>
          )
        })()}

        {/* ── EARTHQUAKE DETAILS ── */}
        {entity.type === 'earthquake' && (() => {
          const eq = entity.data as any
          const dateStr = eq.timestamp ? new Date(eq.timestamp).toLocaleString() : 'N/A'
          return (
            <div className="space-y-4 font-mono">
              <div className="p-3 bg-deepest/60 border border-red-500/25 rounded flex flex-col gap-1 items-center justify-center">
                <Activity className="w-7 h-7 text-red-500 animate-pulse" />
                <span className="text-sm font-bold tracking-wider text-red-500 mt-1 uppercase text-center max-w-[200px] truncate">
                  {eq.place || 'Seismic Event'}
                </span>
                <span className="text-[9px] text-secondary">
                  USGS Real-time Seismology Network
                </span>
              </div>

              {/* Magnitude level card */}
              <div className="grid grid-cols-2 gap-2">
                <div className="p-2.5 bg-deepest/45 border border-[#1e3050] rounded flex flex-col">
                  <span className="text-[8px] text-secondary uppercase">Magnitude</span>
                  <span className="text-lg font-bold text-red-500 mt-0.5">
                    {eq.magnitude?.toFixed(1) || '0.0'} M
                  </span>
                </div>

                <div className="p-2.5 bg-deepest/45 border border-[#1e3050] rounded flex flex-col">
                  <span className="text-[8px] text-secondary uppercase">Depth</span>
                  <span className="text-lg font-bold text-primary mt-0.5">
                    {eq.depth?.toFixed(1) || '0.0'} KM
                  </span>
                </div>
              </div>

              {/* Extra metrics */}
              <div className="p-3 bg-deepest/45 border border-[#1e3050] rounded space-y-2">
                <div className="flex justify-between items-center pb-1.5 border-b border-[#1e3050] text-[10px]">
                  <span className="text-[8px] text-secondary uppercase">Severity</span>
                  <span className="text-[9px] uppercase font-bold text-red-400">{eq.severity || 'INFO'}</span>
                </div>
                <div className="flex justify-between items-center pb-1.5 border-b border-[#1e3050] text-[10px]">
                  <span className="text-[8px] text-secondary uppercase">Tsunami Alert</span>
                  <span className={`text-[9px] font-bold ${eq.tsunamiAlert ? 'text-red-500' : 'text-secondary'}`}>
                    {eq.tsunamiAlert ? 'YES' : 'NO'}
                  </span>
                </div>
                <div className="flex justify-between items-center text-[10px]">
                  <span className="text-[8px] text-secondary uppercase">Felt Reports</span>
                  <span>{eq.felt || '0'} users</span>
                </div>
              </div>

              {/* Timestamp and coordinates */}
              <div className="p-3 bg-deepest/45 border border-[#1e3050] rounded space-y-2 text-[10px]">
                <div className="flex flex-col gap-0.5">
                  <span className="text-[8px] text-secondary uppercase">Seismic Time</span>
                  <span>{dateStr}</span>
                </div>
                {eq.url && (
                  <a
                    href={eq.url}
                    target="_blank"
                    rel="noreferrer"
                    className="flex items-center gap-1 text-[9px] text-[#00f0ff] hover:underline pt-1.5 border-t border-[#1e3050]/50"
                  >
                    View USGS Event Page <ExternalLink className="w-2.5 h-2.5" />
                  </a>
                )}
              </div>

              {/* OSINT CYBER RECON BLOCK */}
              <div className="border-t border-[#1e3050] pt-4 space-y-3 font-mono">
                <span className="text-[8px] font-bold tracking-widest text-[#00ff00] uppercase block">
                  🛡️ OSINT CYBER SEC-OPS
                </span>
                <EntityReconPanel entity={entity} />
              </div>
            </div>
          )
        })()}

        {/* ── GDELT DETAILS ── */}
        {entity.type === 'gdelt' && (() => {
          const gd = entity.data as any
          return (
            <div className="space-y-4 font-mono">
              <div className="p-3 bg-deepest/60 border border-emerald-500/25 rounded flex flex-col gap-1 items-center justify-center">
                <Globe className="w-7 h-7 text-emerald-400" />
                <span className="text-[10px] font-bold tracking-wider text-emerald-400 mt-1 uppercase">
                  GDELT MEDIA REPORT
                </span>
                <span className="text-[9px] text-secondary text-center leading-normal max-w-[200px] truncate">
                  {gd.label || 'Media Event'}
                </span>
              </div>

              {/* Tone and Goldstein Scales */}
              <div className="grid grid-cols-2 gap-2">
                <div className="p-2.5 bg-deepest/45 border border-[#1e3050] rounded flex flex-col">
                  <span className="text-[8px] text-secondary uppercase">Goldstein Index</span>
                  <span className={`text-base font-bold mt-0.5 ${gd.goldsteinScale < 0 ? 'text-red-400' : 'text-emerald-400'}`}>
                    {gd.goldsteinScale || '0.0'}
                  </span>
                  <span className="text-[7px] text-secondary mt-0.5">Scale (-10 to +10)</span>
                </div>

                <div className="p-2.5 bg-deepest/45 border border-[#1e3050] rounded flex flex-col">
                  <span className="text-[8px] text-secondary uppercase">Average Tone</span>
                  <span className="text-base font-bold text-primary mt-0.5">
                    {gd.avgTone || '0.0'}
                  </span>
                  <span className="text-[7px] text-secondary mt-0.5">Negative to Positive</span>
                </div>
              </div>

              {/* Combatants / Actors */}
              <div className="p-3 bg-deepest/45 border border-[#1e3050] rounded space-y-2">
                <span className="text-[8px] text-secondary tracking-widest uppercase block border-b border-[#1e3050] pb-1">REPORTED ACTORS</span>
                
                <div className="flex justify-between items-center text-[10px]">
                  <span className="text-secondary text-[8px] uppercase">ACTOR 1:</span>
                  <span className="font-semibold text-primary">{gd.actor1 || 'N/A'}</span>
                </div>

                {gd.actor2 && (
                  <div className="flex justify-between items-center text-[10px] border-t border-[#1e3050] pt-1.5">
                    <span className="text-secondary text-[8px] uppercase">ACTOR 2:</span>
                    <span className="font-semibold text-primary">{gd.actor2}</span>
                  </div>
                )}
              </div>

              {/* Media links */}
              {gd.sourceUrl && (
                <div className="p-3 bg-deepest/45 border border-[#1e3050] rounded">
                  <span className="text-[8px] text-secondary uppercase block mb-1">Source dispatch Link</span>
                  <a
                    href={gd.sourceUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="flex items-center justify-between text-[10px] text-[#00f0ff] hover:underline p-1.5 bg-deepest/40 border border-[#1e3050]/50 rounded"
                  >
                    <span className="truncate max-w-[170px]">{gd.sourceUrl}</span>
                    <ExternalLink className="w-3 h-3 flex-shrink-0" />
                  </a>
                </div>
              )}

              {/* OSINT CYBER RECON BLOCK */}
              <div className="border-t border-[#1e3050] pt-4 space-y-3 font-mono">
                <span className="text-[8px] font-bold tracking-widest text-[#00ff00] uppercase block">
                  🛡️ OSINT CYBER SEC-OPS
                </span>
                <EntityReconPanel entity={entity} />
              </div>
            </div>
          )
        })()}

        {/* ── SPACE SATELLITE DETAILS ── */}
        {entity.type === 'space' && (() => {
          const sat = entity.data as SatelliteEntity
          return (
            <div className="space-y-4 font-mono">
              <div className="p-3 bg-deepest/60 border border-[#00f0ff]/35 rounded flex flex-col gap-1 items-center justify-center">
                <Satellite className="w-8 h-8 text-[#00f0ff] animate-pulse" />
                <span className="text-sm font-bold tracking-wider text-[#00f0ff] mt-1 text-center">
                  {sat.label}
                </span>
                <span className="text-[9px] text-secondary">
                  NORAD ID: {sat.noradId} | {sat.satelliteType.toUpperCase()}
                </span>
              </div>

              {/* Dynamic Retro Downlink Canvas */}
              <SatelliteOpticalDownlink sat={sat} />

              {/* Dynamic Flyover Countdown Proximity Timers */}
              <FlyoverTimers sat={sat} />

              {/* Telemetry metrics grid */}
              <div className="grid grid-cols-2 gap-2">
                <div className="p-2.5 bg-deepest/45 border border-[#1e3050] rounded flex flex-col">
                  <span className="text-[8px] text-secondary uppercase">Altitude</span>
                  <span className="text-sm font-semibold text-[#00f0ff] mt-0.5">
                    {sat.altitudeKm.toFixed(2)} KM
                  </span>
                </div>

                <div className="p-2.5 bg-deepest/45 border border-[#1e3050] rounded flex flex-col">
                  <span className="text-[8px] text-secondary uppercase">Velocity</span>
                  <span className="text-sm font-semibold text-[#00f0ff] mt-0.5">
                    {sat.velocityKms.toFixed(3)} KM/S
                  </span>
                </div>

                <div className="p-2.5 bg-deepest/45 border border-[#1e3050] rounded flex flex-col">
                  <span className="text-[8px] text-secondary uppercase">Inclination</span>
                  <span className="text-sm font-semibold text-primary mt-0.5">
                    {sat.inclination.toFixed(2)}°
                  </span>
                </div>

                <div className="p-2.5 bg-deepest/45 border border-[#1e3050] rounded flex flex-col">
                  <span className="text-[8px] text-secondary uppercase">Period</span>
                  <span className="text-sm font-semibold text-primary mt-0.5">
                    {Math.round(2 * Math.PI * (6371 + sat.altitudeKm) / sat.velocityKms / 60)} MIN
                  </span>
                </div>
              </div>

              {/* Coordinates */}
              <div className="p-3 bg-deepest/45 border border-[#1e3050] rounded space-y-1.5">
                <span className="text-[8px] text-secondary uppercase block">GROUND TRACK COORDINATES</span>
                <div className="flex justify-between text-[10px]">
                  <span>LATITUDE:</span>
                  <span className="text-primary tabular-nums">{sat.coordinates[1]?.toFixed(5)}°</span>
                </div>
                <div className="flex justify-between text-[10px]">
                  <span>LONGITUDE:</span>
                  <span className="text-primary tabular-nums">{sat.coordinates[0]?.toFixed(5)}°</span>
                </div>
              </div>

              {/* TLE monospace readouts */}
              <div className="p-3 bg-deepest/45 border border-[#1e3050] rounded space-y-2">
                <span className="text-[8px] text-secondary tracking-widest uppercase block border-b border-[#1e3050] pb-1">NORAD TLE METRICS</span>
                <div className="bg-black/60 p-2 border border-[#00f0ff]/20 rounded text-[7px] font-mono text-primary leading-tight overflow-x-auto whitespace-pre">
                  {sat.tleLine1}<br />{sat.tleLine2}
                </div>
              </div>

              {/* OSINT CYBER RECON BLOCK */}
              <div className="border-t border-[#1e3050] pt-4 space-y-3 font-mono">
                <span className="text-[8px] font-bold tracking-widest text-[#00ff00] uppercase block">
                  🛡️ OSINT CYBER SEC-OPS
                </span>
                <EntityReconPanel entity={entity} />
              </div>
            </div>
          )
        })()}

        {/* ── CUSTOM NODE DETAILS ── */}
        {entity.type === 'custom-node' && (() => {
          const node = entity.data as any
          return (
            <div className="space-y-4 font-mono">
              <div className="p-3 bg-deepest/60 border rounded flex flex-col gap-1 items-center justify-center" style={{ borderColor: `${node.color}3f` }}>
                <Compass className="w-8 h-8 animate-pulse" style={{ color: node.color }} />
                <span className="text-sm font-bold tracking-wider mt-1 text-center" style={{ color: node.color }}>
                  TACTICAL DATA NODE
                </span>
                <span className="text-[9px] text-secondary uppercase">
                  {node.domainName}
                </span>
              </div>

              {/* Status and intensity widget */}
              <div className="grid grid-cols-2 gap-2">
                <div className="p-2.5 bg-deepest/45 border border-[#1e3050] rounded flex flex-col">
                  <span className="text-[8px] text-secondary uppercase">Signal Strength</span>
                  <span className="text-sm font-semibold mt-0.5" style={{ color: node.color }}>
                    {node.intensity}%
                  </span>
                </div>

                <div className="p-2.5 bg-deepest/45 border border-[#1e3050] rounded flex flex-col">
                  <span className="text-[8px] text-secondary uppercase">Status</span>
                  <span className={`text-sm font-semibold mt-0.5 ${node.status === 'NOMINAL' ? 'text-green-400' : 'text-yellow-400'}`}>
                    {node.status}
                  </span>
                </div>
              </div>

              {/* Node description */}
              <div className="p-3 bg-deepest/45 border border-[#1e3050] rounded space-y-2">
                <span className="text-[8px] text-secondary tracking-widest uppercase block border-b border-[#1e3050] pb-1">NODE METRICS</span>
                
                <div className="flex justify-between items-center text-[10px]">
                  <span className="text-secondary text-[8px] uppercase">Node Label:</span>
                  <span className="font-semibold text-primary">{node.label}</span>
                </div>

                <div className="flex justify-between items-center text-[10px] border-t border-[#1e3050] pt-1.5">
                  <span className="text-secondary text-[8px] uppercase">Layer Source:</span>
                  <span className="font-semibold text-primary">{node.layerName}</span>
                </div>

                <div className="flex justify-between items-center text-[10px] border-t border-[#1e3050] pt-1.5">
                  <span className="text-secondary text-[8px] uppercase">Latitude:</span>
                  <span className="text-primary tabular-nums">{node.coordinates[1]?.toFixed(5)}</span>
                </div>

                <div className="flex justify-between items-center text-[10px] border-t border-[#1e3050] pt-1.5">
                  <span className="text-secondary text-[8px] uppercase">Longitude:</span>
                  <span className="text-primary tabular-nums">{node.coordinates[0]?.toFixed(5)}</span>
                </div>
              </div>

              {/* Node detailed description paragraph */}
              <div className="p-3 bg-deepest/45 border border-[#1e3050] rounded">
                <span className="text-[8px] text-secondary uppercase block mb-1">Observation Log</span>
                <p className="text-[10px] text-secondary leading-relaxed bg-deepest/20 p-2 border border-[#1e3050]/50 rounded">
                  {node.description}
                </p>
              </div>

              {/* OSINT CYBER RECON BLOCK */}
              <div className="border-t border-[#1e3050] pt-4 space-y-3 font-mono">
                <span className="text-[8px] font-bold tracking-widest text-[#00ff00] uppercase block">
                  🛡️ OSINT CYBER SEC-OPS
                </span>
                <EntityReconPanel entity={entity} />
              </div>
            </div>
          )
        })()}

      </div>
    </div>
  )
}
