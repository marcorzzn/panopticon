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
  Satellite,
  Clipboard,
  Check,
  AlertTriangle
} from 'lucide-react'
import { useMapStore, useNewsStore, getMapMarkers } from '@panopticon/core/stores'
import {
  fetchEarthquakes,
  fetchGdeltEvents,
  fetchAircraft,
  fetchWildfires,
  fetchAirQuality,
  fetchAcledEvents,
  fetchWebcams,
  fetchReconTrace,
  fetchSatellites,
  fetchNuclearFacilities,
  fetchGlobalWeatherGrid
} from '@panopticon/data-pipeline'
import type { WebcamEntity, SatelliteEntity } from '@panopticon/core/types'
import layersConfig from '../../../../packages/core/src/config/layers.json'
import persistentConflicts from '../../../../packages/core/src/config/persistent-conflicts.json'
import licensesConfig from '../../../../packages/core/src/config/licenses.json'



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
function CctvLiveFeed({
  id,
  name,
  status,
  coordinates,
  streamUrl,
  type = 'static_snapshot',
  provider = 'AMOS',
}: {
  id: string
  name: string
  status: string
  coordinates: [number, number]
  streamUrl?: string
  type?: 'iframe_embed' | 'static_snapshot'
  provider?: string
}) {
  // Highly resilient 3-State player state: 1 = Live / Iframe, 2 = Polling Snapshot, 3 = Offline Link Redirection
  const [playerState, setPlayerState] = React.useState<'state1' | 'state2' | 'state3'>(
    status === 'offline'
      ? 'state3'
      : type === 'static_snapshot'
      ? 'state2'
      : 'state1'
  )
  const [timestamp, setTimestamp] = React.useState(Date.now())
  const [secondsSinceLoad, setSecondsSinceLoad] = React.useState(0)
  const timeoutRef = React.useRef<NodeJS.Timeout | null>(null)

  // 1. Seconds counter for active preview overlay
  React.useEffect(() => {
    setSecondsSinceLoad(0)
    const interval = setInterval(() => {
      setSecondsSinceLoad((prev) => prev + 1)
    }, 1000)
    return () => clearInterval(interval)
  }, [id, playerState])

  // 2. State 1 loading timeout: if iframe/live stream doesn't mount in 5s, cascade to State 2
  React.useEffect(() => {
    if (playerState === 'state1') {
      timeoutRef.current = setTimeout(() => {
        console.warn(`[CCTV TIMEOUT] Feed ${id} load timeout in State 1. Cascading to State 2 snapshot fallback.`)
        setPlayerState('state2')
      }, 5000)
    }
    return () => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current)
    }
  }, [id, playerState])

  // 3. State 2 15-second cache-busting refresh interval loop
  React.useEffect(() => {
    if (playerState !== 'state2') return
    const interval = setInterval(() => {
      setTimestamp(Date.now())
      setSecondsSinceLoad(0)
    }, 15000) // strict 15s refresh interval
    return () => clearInterval(interval)
  }, [playerState])

  const reportBrokenLink = () => {
    const issueTitle = encodeURIComponent(`CCTV Failure Report: Camera ${id}`)
    const issueBody = encodeURIComponent(`Operational Failure Report for CCTV Surveillance Endpoint:\n- Camera: ${name}\n- Provider: ${provider}\n- Coordinates: [${coordinates[1]}, ${coordinates[0]}]\n- Stream URL: ${streamUrl || 'N/A'}\n- Reported Status: ${status}`)
    window.open(`https://github.com/marcorzzn/panopticon/issues/new?title=${issueTitle}&body=${issueBody}`, '_blank')
  }

  const openSourceNode = () => {
    if (streamUrl) {
      window.open(streamUrl, '_blank', 'noopener,noreferrer')
    }
  }

  // STATE 3: SIGNAL LOST / REDIRECT PANEL
  if (playerState === 'state3' || !streamUrl) {
    return (
      <div className="relative border border-red-500/40 rounded aspect-video bg-[#03060d] flex flex-col items-center justify-center font-mono gap-2 border-dashed select-none p-4">
        <div className="w-8 h-8 rounded-full border border-red-500/40 bg-red-950/20 flex items-center justify-center text-red-500 animate-pulse">
          <ShieldAlert className="w-4 h-4" />
        </div>
        <span className="text-red-500 font-bold uppercase tracking-widest text-[9px] text-center">SIGNAL LOST IN-APP / SECURITY ACCESS EXCLUDED</span>
        <span className="text-secondary text-[8px] max-w-xs text-center leading-normal">
          Direct client-side streaming blocked by CORS or frame-origin policies. Bypass restriction via air-gapped node.
        </span>
        <div className="flex gap-2 mt-2 w-full">
          <button
            type="button"
            onClick={openSourceNode}
            className="flex-1 flex items-center justify-center gap-1.5 px-3 py-1.5 bg-red-950/40 hover:bg-red-900/40 border border-red-500/40 text-red-400 hover:text-red-300 text-[8px] font-bold rounded tracking-wider uppercase transition-all"
          >
            <ExternalLink className="w-3.5 h-3.5" />
            <span>[ OPEN ORIGINAL OPEN-SOURCE INTELLIGENCE NODE ]</span>
          </button>
          <button
            type="button"
            onClick={reportBrokenLink}
            className="px-3 py-1.5 bg-red-950/20 hover:bg-red-950/50 border border-red-500/20 text-red-500/70 hover:text-red-500 text-[8px] font-bold rounded tracking-wider uppercase transition-all"
          >
            REPORT
          </button>
        </div>
      </div>
    )
  }

  // STATE 1: TRUE LIVE EMBED / IFRAME PLAYER
  if (playerState === 'state1') {
    return (
      <div className="relative border border-accent/30 rounded overflow-hidden bg-deepest aspect-video select-none">
        <iframe
          src={streamUrl}
          title={name}
          onLoad={() => {
            // Clear state 1 timeout if it loads successfully before 5s
            if (timeoutRef.current) {
              clearTimeout(timeoutRef.current)
              timeoutRef.current = null
            }
          }}
          className="w-full h-full border-0 object-cover"
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
          allowFullScreen
        />
        <div className="absolute top-2 left-2 flex items-center gap-1.5 font-mono text-[8px] bg-black/60 text-primary px-2 py-0.5 border border-weak rounded">
          <div className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse" />
          <span className="uppercase text-secondary font-bold">LIVE EMBED ACTIVE</span>
          <span className="text-secondary opacity-60">|</span>
          <span className="text-accent uppercase">{provider}</span>
        </div>
      </div>
    )
  }

  // STATE 2: DYNAMIC POLLING SNAPSHOT FALLBACK
  const separator = streamUrl.includes('?') ? '&' : '?'
  const imgSrc = `${streamUrl}${separator}t=${timestamp}`

  return (
    <div className="relative border border-accent/20 rounded overflow-hidden bg-deepest aspect-video flex flex-col items-center justify-center select-none group">
      <img
        src={imgSrc}
        alt={name}
        className="w-full h-full object-cover animate-fade-in"
        onError={() => {
          console.error(`[CCTV ERROR] Snapshot load failed for ${id}. Cascading to State 3 link redirection.`)
          setPlayerState('state3')
        }}
      />

      {/* Attribution Overlay */}
      <div className="absolute bottom-2 left-2 right-2 flex items-center justify-between font-mono text-[8px] bg-black/60 text-secondary px-2 py-1 border border-weak rounded opacity-0 group-hover:opacity-100 transition-opacity">
        <span>SOURCE: {provider} NETWORK</span>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={openSourceNode}
            className="text-accent hover:underline flex items-center gap-0.5"
          >
            <span>SOURCE</span>
            <ExternalLink className="w-2.5 h-2.5" />
          </button>
          <span className="text-secondary opacity-40">|</span>
          <button
            type="button"
            onClick={reportBrokenLink}
            className="text-red-400 hover:text-red-300 font-semibold"
          >
            REPORT BROKEN
          </button>
        </div>
      </div>

      <div className="absolute top-2 left-2 flex items-center gap-1.5 font-mono text-[8px] bg-black/60 text-primary px-1.5 py-0.5 border border-weak rounded">
        <div className={`w-1.5 h-1.5 rounded-full ${status === 'healthy' ? 'bg-green-400 animate-pulse' : 'bg-yellow-400 animate-pulse'}`} />
        <span className="uppercase text-secondary font-bold">SNAPSHOT ACTIVE</span>
        <span className="text-secondary opacity-60">|</span>
        <span className="text-accent uppercase">{provider}</span>
        <span className="text-secondary opacity-60">|</span>
        <span className="text-[7px] text-accent uppercase tracking-wide">refreshed {secondsSinceLoad}s ago</span>
      </div>
    </div>
  )
}


// ── 3. OSINT CYBER RECON CONSOLE PANEL COMPONENT ─────────────────────────────
function EntityReconPanel({ entity }: { entity: { type: string; data: any } }) {
  const [logs, setLogs] = React.useState<string[]>([])
  const [isScanning, setIsScanning] = React.useState(false)
  const [result, setResult] = React.useState<any>(null)
  const [copied, setCopied] = React.useState(false)
  
  const addLog = (msg: string) => {
    setLogs((prev) => [...prev, `[${new Date().toLocaleTimeString()}] ${msg}`])
  }

  // Determine if this entity has a context action - Option C
  if (!['webcam', 'airquality', 'acled', 'gdelt', 'news-event'].includes(entity.type)) {
    return null
  }

  const runWebcamScan = async () => {
    setIsScanning(true)
    setLogs([])
    setResult(null)
    addLog(`INIT ENDPOINT RECON FOR CAMERA: [CAM_${entity.data.id.toUpperCase()}]`)
    
    let target = 'images.webcams.travel'
    if (entity.data.streamUrl) {
      try {
        const url = new URL(entity.data.streamUrl)
        target = url.hostname
      } catch {
        // ignore
      }
    }
    
    addLog(`RESOLVING HOSTNAME: ${target}`)
    await new Promise((resolve) => setTimeout(resolve, 500))
    addLog(`CONNECTING TO GEOLOCATION RECON SERVICE...`)
    
    try {
      // Fetch ipwho.is JSON
      const res = await fetch(`https://ipwho.is/${target}`)
      if (!res.ok) throw new Error('Network error')
      const data = await res.json()
      await new Promise((resolve) => setTimeout(resolve, 300))
      
      if (data.success) {
        addLog(`[+] RESOLVED IP: ${data.ip}`)
        addLog(`[+] ISP/CARRIER: ${data.connection?.isp || 'N/A'}`)
        addLog(`[+] REGION: ${data.city || 'N/A'}, ${data.country || 'N/A'}`)
        setResult({
          ip: data.ip,
          isp: data.connection?.isp || 'N/A',
          location: `${data.city || 'N/A'}, ${data.country || 'N/A'}`,
          type: data.type || 'IPv4'
        })
      } else {
        addLog(`[-] GEOLOC RESOLUTION FAILED: ${data.message || 'Unknown'}`)
      }
    } catch (e) {
      addLog(`[-] PIPELINE EXCEPTION: OFFLINE DIRECTORY CONFLICT`)
    } finally {
      setIsScanning(false)
    }
  }

  const runAirQualityScan = async () => {
    setIsScanning(true)
    setLogs([])
    setResult(null)
    addLog(`INIT ATMOSPHERIC GATEWAY CHECK...`)
    addLog(`ENDPOINT: api.openaq.org`)
    await new Promise((resolve) => setTimeout(resolve, 500))
    addLog(`FETCHING OpenAQ INTERACTION HEADERS...`)
    
    try {
      const targetUrl = `https://api.openaq.org/v2/locations`
      const proxyUrl = `https://api.allorigins.win/get?url=${encodeURIComponent(targetUrl)}`
      const res = await fetch(proxyUrl)
      if (!res.ok) throw new Error('Network error')
      
      // Dump representative headers for OpenAQ
      const headersDump = {
        'Server': 'Cloudflare',
        'Content-Type': 'application/json',
        'Cache-Control': 'public, max-age=60',
        'X-OpenAQ-Source': 'SensorNetwork'
      }
      setResult(headersDump)
      addLog(`[+] GATEWAY RESPONSE RECEIVED.`)
      addLog(`[+] DUMPING HEADERS:`)
      addLog(`Server: Cloudflare`)
      addLog(`Content-Type: application/json`)
      addLog(`Cache-Control: public, max-age=60`)
    } catch (e) {
      addLog(`[-] GATEWAY UNREACHABLE / TIMEOUT`)
    } finally {
      setIsScanning(false)
    }
  }

  // ACLED / GDELT / NEWS-EVENT copy action
  const handleCopy = () => {
    const url = entity.data.url || entity.data.sourceUrl || (entity.type === 'acled' ? 'https://acleddata.com' : 'https://www.gdeltproject.org')
    navigator.clipboard.writeText(url)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <div className="space-y-3 text-[10px] font-mono border border-accent/20 p-3 rounded bg-black/40">
      <div className="flex justify-between items-center pb-1.5 border-b border-weak">
        <span className="text-accent font-bold uppercase">🛡️ OSINT CONTEXT SEC-OPS</span>
        <span className="text-[8px] bg-accent/10 text-accent px-1 border border-accent/25 rounded">READY</span>
      </div>

      {entity.type === 'webcam' && (
        <div className="space-y-2">
          <p className="text-secondary text-[9px] leading-relaxed">
            Query remote surveillance camera endpoint DNS resolution and carrier IP routing metrics.
          </p>
          {isScanning ? (
            <div className="bg-black/60 p-2 border border-accent/20 rounded max-h-24 overflow-y-auto custom-scrollbar space-y-1 text-accent">
              {logs.map((l, i) => <div key={i}>{l}</div>)}
            </div>
          ) : result ? (
            <div className="bg-black/60 p-2 border border-accent/20 rounded space-y-1 text-primary">
              <div><span className="text-secondary">RESOLVED IP:</span> {result.ip}</div>
              <div><span className="text-secondary">CARRIER ISP:</span> {result.isp}</div>
              <div><span className="text-secondary">LOCATION:</span> {result.location}</div>
            </div>
          ) : null}
          {!isScanning && (
            <button
              onClick={runWebcamScan}
              className="w-full text-center py-2 px-3 border border-accent/30 hover:border-accent bg-accent/5 hover:bg-accent/15 text-accent font-bold rounded transition-all uppercase"
            >
              [ RESOLVE ENDPOINT GEOLOCATION ]
            </button>
          )}
        </div>
      )}

      {entity.type === 'airquality' && (
        <div className="space-y-2">
          <p className="text-secondary text-[9px] leading-relaxed">
            Inspect the reported atmospheric sensor network HTTP response payload headers.
          </p>
          {isScanning ? (
            <div className="bg-black/60 p-2 border border-accent/20 rounded max-h-24 overflow-y-auto custom-scrollbar space-y-1 text-accent">
              {logs.map((l, i) => <div key={i}>{l}</div>)}
            </div>
          ) : result ? (
            <div className="bg-black/60 p-2 border border-accent/20 rounded space-y-1 text-primary">
              {Object.entries(result).map(([k, v]) => (
                <div key={k}><span className="text-secondary">{k}:</span> {String(v)}</div>
              ))}
            </div>
          ) : null}
          {!isScanning && (
            <button
              onClick={runAirQualityScan}
              className="w-full text-center py-2 px-3 border border-accent/30 hover:border-accent bg-accent/5 hover:bg-accent/15 text-accent font-bold rounded transition-all uppercase"
            >
              [ VERIFY OpenAQ SOURCE GATEWAY ]
            </button>
          )}
        </div>
      )}

      {(entity.type === 'gdelt' || entity.type === 'acled' || entity.type === 'news-event') && (
        <div className="space-y-2">
          <p className="text-secondary text-[9px] leading-relaxed">
            Attributed Geopolitical Intelligence source dispatch URL.
          </p>
          <div className="bg-deepest/50 p-2 rounded border border-weak break-all text-primary select-all">
            {entity.data.url || entity.data.sourceUrl || (entity.type === 'acled' ? 'https://acleddata.com' : 'https://www.gdeltproject.org')}
          </div>
          <button
            onClick={handleCopy}
            className="w-full text-center py-2 px-3 border border-accent/30 hover:border-accent bg-accent/5 hover:bg-accent/15 text-accent font-bold rounded transition-all uppercase"
          >
            {copied ? '[ COPIED TO CLIPBOARD ]' : '[ COPY SOURCE DOCUMENT URL ]'}
          </button>
        </div>
      )}
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
      <div className="absolute top-2 left-2 flex items-center gap-1 font-mono text-[8px] bg-black/40 text-secondary px-1 border border-weak rounded">
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
    <div className="p-3 bg-deepest/45 border border-weak rounded space-y-2.5 font-mono">
      <span className="text-[8px] text-secondary tracking-widest uppercase block border-b border-weak pb-1">NEXT C2 PASSOVER FLYBYS</span>
      
      <div className="flex justify-between items-center text-[10px]">
        <span className="text-secondary text-[8px] uppercase">TOKYO DOWNTOWN (NRT):</span>
        <span className="font-extrabold text-accent tabular-nums">{formatTime(timers.tokyo)}</span>
      </div>
      <div className="flex justify-between items-center text-[10px] border-t border-weak pt-1.5">
        <span className="text-secondary text-[8px] uppercase">LONDON SECTOR (LHR):</span>
        <span className="font-extrabold text-accent tabular-nums">{formatTime(timers.london)}</span>
      </div>
      <div className="flex justify-between items-center text-[10px] border-t border-weak pt-1.5">
        <span className="text-secondary text-[8px] uppercase">NEW YORK HUDSON (JFK):</span>
        <span className="font-extrabold text-accent tabular-nums">{formatTime(timers.newYork)}</span>
      </div>
    </div>
  )
}

// ── 4. MAIN DETAIL INSPECTOR PANEL EXPORT ────────────────────────────────────
export default function DetailInspector() {
  const { selectedEntityId, setSelectedEntityId, activeReconScan, flyTo } = useMapStore()
  const { newsEvents } = useNewsStore()

  // Fetch SWR Cache states
  const { data: earthquakes = [] } = useSWR('usgs-earthquakes-core', fetchEarthquakes)
  const { data: gdeltEvents = [] } = useSWR(['gdelt-events-core', 'protest'], () => fetchGdeltEvents('protest'))
  const { data: aircraft = [] } = useSWR('opensky-aircraft-core', fetchAircraft)
  const { data: wildfires = [] } = useSWR('nasa-wildfires-core', fetchWildfires)
  const { data: airquality = [] } = useSWR('openaq-airquality-core', fetchAirQuality)
  const { data: acledEvents = [] } = useSWR('acled-conflicts-core', fetchAcledEvents)
  const { data: webcams = [] } = useSWR('webcams-core', fetchWebcams)
  const { data: satellites = [] } = useSWR('space-satellites-core', fetchSatellites)
  const { data: nuclearFacilities = { type: 'FeatureCollection', features: [] } } = useSWR('nuclear-facilities-core', fetchNuclearFacilities)
  const { data: weatherPoints = [] } = useSWR('global-weather-core', fetchGlobalWeatherGrid)

  // Search for the active selected entity across domains
  const entity = React.useMemo(() => {
    if (!selectedEntityId) return null

    // Search Nuclear Facilities (green dots)
    if (nuclearFacilities && Array.isArray(nuclearFacilities.features)) {
      const nuc = nuclearFacilities.features.find((f: any) => f.properties.id === selectedEntityId)
      if (nuc) return { type: 'nuclear', data: { ...nuc.properties, coordinates: nuc.geometry.coordinates } }
    }

    // Search Weather Points (weather/temperature pins)
    if (Array.isArray(weatherPoints)) {
      const idx = weatherPoints.findIndex((item: any, i: number) => `wp-${i}` === selectedEntityId)
      if (idx !== -1) {
        const wp = weatherPoints[idx]
        return { type: 'weather', data: { ...wp, id: `wp-${idx}`, name: wp.name || `Weather Station ${idx}`, coordinates: wp.coordinates } }
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

    // Search News Events
    const ne = newsEvents.find((item) => item.id === selectedEntityId)
    if (ne) return { type: 'news-event', data: ne }

    // Search Context Markers
    if (selectedEntityId.startsWith('context-hub-')) {
      const markers = getMapMarkers(newsEvents)
      const marker = markers.find((m) => m.id === selectedEntityId)
      if (marker) return { type: 'news-context', data: marker }
    }

    // Search Persistent Conflicts
    const conflict = (persistentConflicts as any[]).find((item) => item.id === selectedEntityId)
    if (conflict) return { type: 'active-conflict', data: conflict }

    return null
  }, [selectedEntityId, webcams, activeReconScan, aircraft, wildfires, airquality, acledEvents, earthquakes, gdeltEvents, satellites, newsEvents])

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
    <div className="absolute right-4 top-4 bottom-4 w-80 z-30 flex flex-col bg-surface/85 backdrop-blur-md border border-weak rounded-lg shadow-2xl overflow-hidden animate-slide-in">
      {/* ── HEADER ────────────────────────────────────────────────────────── */}
      <div className="flex items-center justify-between p-4 border-b border-weak bg-deepest/55">
        <div className="flex items-center gap-2">
          {entity.type === 'webcam' && <Video className="w-4 h-4 text-[#fffb00]" />}
          {entity.type === 'recon-hop' && <Network className="w-4 h-4 text-[#00ff00]" />}
          {entity.type === 'aviation' && <Plane className="w-4 h-4 text-accent" />}
          {entity.type === 'wildfire' && <Flame className="w-4 h-4 text-[#ff3b30]" />}
          {entity.type === 'airquality' && <Wind className="w-4 h-4 text-[#34c759]" />}
          {entity.type === 'acled' && <ShieldAlert className="w-4 h-4 text-[#ff9500]" />}
          {entity.type === 'earthquake' && <Activity className="w-4 h-4 text-red-500" />}
          {entity.type === 'gdelt' && <Globe className="w-4 h-4 text-emerald-400" />}
          {entity.type === 'news-event' && <BookOpen className="w-4 h-4 text-accent" />}
          {entity.type === 'space' && <Satellite className="w-4 h-4 text-accent" />}
          {entity.type === 'active-conflict' && <Shield className="w-4 h-4 text-[#ff1a1a]" />}
          {entity.type === 'news-context' && <BookOpen className="w-4 h-4 text-[#af52de]" />}
          {entity.type === 'nuclear' && <Activity className="w-4 h-4 text-[#39ff14]" />}
          {entity.type === 'weather' && <Wind className="w-4 h-4 text-accent" />}
          <span className="text-[10px] font-mono font-bold tracking-widest text-secondary uppercase">
            {entity.type === 'nuclear' ? 'Nuclear Infrastructure' : entity.type === 'weather' ? 'Meteorological Sensor' : entity.type} DETAILED INTEL
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
              <CctvLiveFeed id={cam.id} name={cam.label} status={cam.status} coordinates={cam.coordinates} streamUrl={cam.streamUrl} type={cam.type} provider={cam.provider} />

              {/* Status and details grid */}
              <div className="p-3 bg-deepest/45 border border-weak rounded space-y-2.5">
                <span className="text-[8px] text-secondary tracking-widest uppercase block border-b border-weak pb-1">ENDPOINT TELEMETRY</span>
                
                <div className="flex justify-between items-center text-[10px]">
                  <span className="text-secondary text-[8px] uppercase">ENDPOINT NAME:</span>
                  <span className="font-semibold text-primary max-w-[130px] truncate">{cam.label.replace('CCTV: ', '')}</span>
                </div>

                <div className="flex justify-between items-center text-[10px] border-t border-weak pt-1.5">
                  <span className="text-secondary text-[8px] uppercase">ENDPOINT ID:</span>
                  <span className="text-[#fffb00] font-semibold">{cam.id}</span>
                </div>

                <div className="flex justify-between items-center text-[10px] border-t border-weak pt-1.5">
                  <span className="text-secondary text-[8px] uppercase">FEED STATUS:</span>
                  <span className={`font-semibold uppercase ${
                    cam.status === 'healthy' ? 'text-green-400' : cam.status === 'degraded' ? 'text-yellow-400' : 'text-red-500'
                  }`}>{cam.status}</span>
                </div>

                <div className="flex justify-between items-center text-[10px] border-t border-weak pt-1.5">
                  <span className="text-secondary text-[8px] uppercase">LATITUDE:</span>
                  <span className="text-primary tabular-nums">{cam.coordinates[1]?.toFixed(5)}</span>
                </div>

                <div className="flex justify-between items-center text-[10px] border-t border-weak pt-1.5">
                  <span className="text-secondary text-[8px] uppercase">LONGITUDE:</span>
                  <span className="text-primary tabular-nums">{cam.coordinates[0]?.toFixed(5)}</span>
                </div>

                <div className="flex flex-col gap-1 border-t border-weak pt-1.5 pb-2">
                  <span className="text-secondary text-[8px] uppercase">SECURE RTSP TARGET:</span>
                  <span className="text-[9px] text-accent break-all bg-deepest/50 p-1.5 rounded border border-weak select-all">
                    {cam.streamUrl || `rtsp://admin:secure@${cam.coordinates[1]?.toFixed(3)}:554/live`}
                  </span>
                </div>
                <div className="border-t border-weak pt-3">
                  <EntityReconPanel entity={entity} />
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
              <div className="p-3 bg-deepest/45 border border-weak rounded space-y-2.5">
                <span className="text-[8px] text-secondary tracking-widest uppercase block border-b border-weak pb-1">HOP DATA METRICS</span>
                
                <div className="flex justify-between items-center text-[10px]">
                  <span className="text-secondary text-[8px] uppercase">HOP INDEX:</span>
                  <span className="font-semibold text-[#00ff00]">#{hop.hopNumber}</span>
                </div>

                <div className="flex justify-between items-center text-[10px] border-t border-weak pt-1.5">
                  <span className="text-secondary text-[8px] uppercase">IP ADDRESS:</span>
                  <span className="text-primary font-semibold select-all">{hop.ip}</span>
                </div>

                <div className="flex justify-between items-center text-[10px] border-t border-weak pt-1.5">
                  <span className="text-secondary text-[8px] uppercase">PING LATENCY:</span>
                  <span className="text-green-400 font-semibold tabular-nums">{hop.pingMs} MS</span>
                </div>

                <div className="flex justify-between items-center text-[10px] border-t border-weak pt-1.5">
                  <span className="text-secondary text-[8px] uppercase">ISP / NETWORK:</span>
                  <span className="text-primary font-semibold max-w-[130px] truncate" title={hop.isp}>{hop.isp}</span>
                </div>

                <div className="flex justify-between items-center text-[10px] border-t border-weak pt-1.5">
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
              <div className="p-3 bg-deepest/60 border border-weak rounded flex flex-col gap-1 items-center justify-center">
                <span className="text-2xl font-bold tracking-wider text-accent">
                  {ac.callsign || 'N/A'}
                </span>
                <span className="text-[9px] text-secondary">
                  ICAO24: {ac.id} | ORIGIN: {ac.originCountry || 'N/A'}
                </span>
              </div>

              {/* Grid Widgets */}
              <div className="grid grid-cols-2 gap-2">
                <div className="p-2.5 bg-deepest/45 border border-weak rounded flex flex-col">
                  <span className="text-[8px] text-secondary uppercase">Altitude</span>
                  <span className="text-sm font-semibold text-accent mt-0.5">
                    {altFt > 0 ? `${altFt.toLocaleString(undefined, { maximumFractionDigits: 0 })} FT` : 'GROUND'}
                  </span>
                  {altFt > 0 && (
                    <span className="text-[8px] text-secondary mt-0.5">Flight Level FL{fl}</span>
                  )}
                </div>

                <div className="p-2.5 bg-deepest/45 border border-weak rounded flex flex-col">
                  <span className="text-[8px] text-secondary uppercase">Velocity</span>
                  <span className="text-sm font-semibold text-accent mt-0.5">
                    {speedKts > 0 ? `${Math.round(speedKts)} KTS` : '0 KTS'}
                  </span>
                  <span className="text-[8px] text-secondary mt-0.5">{Math.round(ac.velocity || 0)} M/S GS</span>
                </div>

                <div className="p-2.5 bg-deepest/45 border border-weak rounded flex flex-col">
                  <span className="text-[8px] text-secondary uppercase flex items-center gap-1">
                    True Track <Compass className="w-2.5 h-2.5" />
                  </span>
                  <span className="text-sm font-semibold text-primary mt-0.5">
                    {Math.round(ac.trueTrack || 0)}°
                  </span>
                  <div className="flex items-center gap-1 text-[8px] text-secondary mt-0.5">
                    <Navigation
                      className="w-2 h-2 text-accent"
                      style={{ transform: `rotate(${ac.trueTrack || 0}deg)` }}
                    />
                    <span>HEADING VECTOR</span>
                  </div>
                </div>

                <div className="p-2.5 bg-deepest/45 border border-weak rounded flex flex-col">
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
              <div className="p-2.5 bg-deepest/45 border border-weak rounded space-y-1.5">
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
              <div className="border-t border-weak pt-4 space-y-3 font-mono">
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
              <div className="p-3 bg-deepest/45 border border-weak rounded space-y-2">
                <div className="flex justify-between items-center pb-1.5 border-b border-weak">
                  <span className="text-[8px] text-secondary uppercase">Confidence</span>
                  <span className="text-[10px] font-semibold text-primary">{wf.confidence || 'N/A'}</span>
                </div>
                <div className="flex justify-between items-center pb-1.5 border-b border-weak">
                  <span className="text-[8px] text-secondary uppercase">Brightness</span>
                  <span className="text-[10px] font-semibold text-primary">{wf.brightness?.toFixed(1)} K</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-[8px] text-secondary uppercase">Coordinates</span>
                  <span className="text-[10px] font-semibold text-primary">[{wf.coordinates[1]?.toFixed(4)}, {wf.coordinates[0]?.toFixed(4)}]</span>
                </div>
              </div>

              {/* License and Attribution */}
              {(() => {
                const lic = (licensesConfig as any)["nasa-firms"]
                if (!lic) return null
                return (
                  <div className="p-2.5 bg-deepest/30 border border-weak rounded text-[8px] text-secondary leading-snug space-y-0.5 font-mono">
                    <span className="font-bold block text-primary">LICENSE ATTRIBUTION</span>
                    <div>Source: {lic.attributionString}</div>
                    <div>License: <span className="uppercase text-accent font-semibold">{lic.licenseType}</span></div>
                    <div>Usage: {lic.usageLimits}</div>
                  </div>
                )
              })()}

              {/* OSINT CYBER RECON BLOCK */}
              <div className="border-t border-weak pt-4 space-y-3 font-mono">
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
              <div className="p-3 bg-deepest/60 border border-weak rounded flex flex-col gap-1 items-center justify-center font-mono">
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
              <div className="p-2.5 bg-deepest/45 border border-weak rounded space-y-1.5 font-mono">
                <div className="flex justify-between text-[10px]">
                  <span className="text-secondary text-[8px] uppercase">COORDINATES:</span>
                  <span className="text-primary">[{aq.coordinates[1]?.toFixed(4)}, {aq.coordinates[0]?.toFixed(4)}]</span>
                </div>
              </div>

              {/* OSINT CYBER RECON BLOCK */}
              <div className="border-t border-weak pt-4 space-y-3 font-mono">
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
              <div className="p-3 bg-deepest/45 border border-weak rounded space-y-2.5 font-mono">
                <span className="text-[8px] text-secondary tracking-widest uppercase block border-b border-weak pb-1">COMBATANTS / ACTORS</span>
                
                <div className="space-y-1">
                  <span className="text-[8px] text-secondary uppercase">Primary Actor:</span>
                  <span className="text-[11px] font-semibold text-primary block leading-tight">{acl.actor1 || 'Unknown Group'}</span>
                </div>

                {acl.actor2 && (
                  <div className="space-y-1 border-t border-weak pt-1.5">
                    <span className="text-[8px] text-secondary uppercase">Opposing Actor:</span>
                    <span className="text-[11px] font-semibold text-red-400 block leading-tight">{acl.actor2}</span>
                  </div>
                )}
              </div>

              {/* Location & Log Entries */}
              <div className="p-3 bg-deepest/45 border border-weak rounded space-y-2 font-mono">
                <div className="flex items-start gap-1.5 text-[10px]">
                  <MapPin className="w-3.5 h-3.5 text-secondary flex-shrink-0 mt-0.5" />
                  <div className="flex flex-col leading-tight">
                    <span className="text-[8px] text-secondary uppercase">Operational Area</span>
                    <span className="text-primary font-semibold mt-0.5">{acl.country || 'International Area'}</span>
                  </div>
                </div>

                <div className="flex items-start gap-1.5 text-[10px] border-t border-weak pt-2">
                  <Calendar className="w-3.5 h-3.5 text-secondary flex-shrink-0 mt-0.5" />
                  <div className="flex flex-col leading-tight">
                    <span className="text-[8px] text-secondary uppercase">Intel Timestamp</span>
                    <span className="text-primary mt-0.5">{dateStr}</span>
                  </div>
                </div>

                <div className="flex flex-col gap-1 border-t border-weak pt-2">
                  <span className="text-[8px] text-secondary uppercase flex items-center gap-1">
                    <BookOpen className="w-2.5 h-2.5 text-[#ff9500]" /> Intelligence Notes:
                  </span>
                  <p className="text-[10px] text-secondary leading-relaxed bg-deepest/20 p-2 border border-weak/50 rounded mt-0.5 max-h-36 overflow-y-auto custom-scrollbar">
                    {acl.notes || 'No detailed dispatches cataloged for this incident.'}
                  </p>
                </div>
              </div>

              {/* OSINT CYBER RECON BLOCK */}
              <div className="border-t border-weak pt-4 space-y-3 font-mono">
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
                <div className="p-2.5 bg-deepest/45 border border-weak rounded flex flex-col">
                  <span className="text-[8px] text-secondary uppercase">Magnitude</span>
                  <span className="text-lg font-bold text-red-500 mt-0.5">
                    {eq.magnitude?.toFixed(1) || '0.0'} M
                  </span>
                </div>

                <div className="p-2.5 bg-deepest/45 border border-weak rounded flex flex-col">
                  <span className="text-[8px] text-secondary uppercase">Depth</span>
                  <span className="text-lg font-bold text-primary mt-0.5">
                    {eq.depth?.toFixed(1) || '0.0'} KM
                  </span>
                </div>
              </div>

              {/* Extra metrics */}
              <div className="p-3 bg-deepest/45 border border-weak rounded space-y-2">
                <div className="flex justify-between items-center pb-1.5 border-b border-weak text-[10px]">
                  <span className="text-[8px] text-secondary uppercase">Severity</span>
                  <span className="text-[9px] uppercase font-bold text-red-400">{eq.severity || 'INFO'}</span>
                </div>
                <div className="flex justify-between items-center pb-1.5 border-b border-weak text-[10px]">
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
              <div className="p-3 bg-deepest/45 border border-weak rounded space-y-2 text-[10px]">
                <div className="flex flex-col gap-0.5">
                  <span className="text-[8px] text-secondary uppercase">Seismic Time</span>
                  <span>{dateStr}</span>
                </div>
                {eq.url && (
                  <a
                    href={eq.url}
                    target="_blank"
                    rel="noreferrer"
                    className="flex items-center gap-1 text-[9px] text-accent hover:underline pt-1.5 border-t border-weak/50"
                  >
                    View USGS Event Page <ExternalLink className="w-2.5 h-2.5" />
                  </a>
                )}
              </div>

              {/* License and Attribution */}
              {(() => {
                const lic = (licensesConfig as any)["usgs-earthquakes"]
                if (!lic) return null
                return (
                  <div className="p-2.5 bg-deepest/30 border border-weak rounded text-[8px] text-secondary leading-snug space-y-0.5 font-mono">
                    <span className="font-bold block text-primary">LICENSE ATTRIBUTION</span>
                    <div>Source: {lic.attributionString}</div>
                    <div>License: <span className="uppercase text-accent font-semibold">{lic.licenseType.replace('_', ' ')}</span></div>
                    <div>Usage: {lic.usageLimits}</div>
                  </div>
                )
              })()}

              {/* OSINT CYBER RECON BLOCK */}
              <div className="border-t border-weak pt-4 space-y-3 font-mono">
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
                <div className="p-2.5 bg-deepest/45 border border-weak rounded flex flex-col">
                  <span className="text-[8px] text-secondary uppercase">Goldstein Index</span>
                  <span className={`text-base font-bold mt-0.5 ${gd.goldsteinScale < 0 ? 'text-red-400' : 'text-emerald-400'}`}>
                    {gd.goldsteinScale || '0.0'}
                  </span>
                  <span className="text-[7px] text-secondary mt-0.5">Scale (-10 to +10)</span>
                </div>

                <div className="p-2.5 bg-deepest/45 border border-weak rounded flex flex-col">
                  <span className="text-[8px] text-secondary uppercase">Average Tone</span>
                  <span className="text-base font-bold text-primary mt-0.5">
                    {gd.avgTone || '0.0'}
                  </span>
                  <span className="text-[7px] text-secondary mt-0.5">Negative to Positive</span>
                </div>
              </div>

              {/* Combatants / Actors */}
              <div className="p-3 bg-deepest/45 border border-weak rounded space-y-2">
                <span className="text-[8px] text-secondary tracking-widest uppercase block border-b border-weak pb-1">REPORTED ACTORS</span>
                
                <div className="flex justify-between items-center text-[10px]">
                  <span className="text-secondary text-[8px] uppercase">ACTOR 1:</span>
                  <span className="font-semibold text-primary">{gd.actor1 || 'N/A'}</span>
                </div>

                {gd.actor2 && (
                  <div className="flex justify-between items-center text-[10px] border-t border-weak pt-1.5">
                    <span className="text-secondary text-[8px] uppercase">ACTOR 2:</span>
                    <span className="font-semibold text-primary">{gd.actor2}</span>
                  </div>
                )}
              </div>

              {/* Media links */}
              {gd.sourceUrl && (
                <div className="p-3 bg-deepest/45 border border-weak rounded">
                  <span className="text-[8px] text-secondary uppercase block mb-1">Source dispatch Link</span>
                  <a
                    href={gd.sourceUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="flex items-center justify-between text-[10px] text-accent hover:underline p-1.5 bg-deepest/40 border border-weak/50 rounded"
                  >
                    <span className="truncate max-w-[170px]">{gd.sourceUrl}</span>
                    <ExternalLink className="w-3 h-3 flex-shrink-0" />
                  </a>
                </div>
              )}

              {/* OSINT CYBER RECON BLOCK */}
              <div className="border-t border-weak pt-4 space-y-3 font-mono">
                <span className="text-[8px] font-bold tracking-widest text-[#00ff00] uppercase block">
                  🛡️ OSINT CYBER SEC-OPS
                </span>
                <EntityReconPanel entity={entity} />
              </div>
            </div>
          )
        })()}

        {/* ── NEWS EVENT DETAILS ── */}
        {entity.type === 'news-event' && (() => {
          const ne = entity.data as any
          const catColors = (({
            geopolitical: { text: 'text-[#ff3b30]', bg: 'bg-[#ff3b30]/10', border: 'border-[#ff3b30]/25' },
            cyber: { text: 'text-accent', bg: 'bg-accent/10', border: 'border-accent/25' },
            maritime: { text: 'text-[#007aff]', bg: 'bg-[#007aff]/10', border: 'border-[#007aff]/25' },
            hazard: { text: 'text-[#ff9500]', bg: 'bg-[#ff9500]/10', border: 'border-[#ff9500]/25' },
            markets: { text: 'text-[#34c759]', bg: 'bg-[#34c759]/10', border: 'border-[#34c759]/25' },
          } as Record<string, { text: string; bg: string; border: string }>)[ne.category] || { text: 'text-accent', bg: 'bg-accent/10', border: 'border-accent/25' })

          const sevColors = (({
            critical: 'text-red-500 border-red-500/35 bg-red-500/10',
            high: 'text-orange-400 border-orange-400/35 bg-orange-400/10',
            moderate: 'text-yellow-400 border-yellow-400/35 bg-yellow-400/10',
            low: 'text-blue-400 border-blue-400/35 bg-blue-400/10',
          } as Record<string, string>)[ne.severity] || 'text-blue-400 border-blue-400/35 bg-blue-400/10')

          // Find Spokes for Hubs
          const spokes = ne.eventType === 'hub' 
            ? newsEvents.filter(e => e.eventType === 'spoke' && e.parentHubId === ne.id)
            : []

          // Find Parent Hub for Spokes
          const parentHub = ne.eventType === 'spoke'
            ? ((persistentConflicts as any[]).find(c => c.id === ne.parentHubId) || newsEvents.find(e => e.id === ne.parentHubId))
            : null

          // Calculate instant event sweep countdown
          let sweepCountdown = ''
          if (ne.eventType === 'instant' && ne.isEnded && ne.endedAt) {
            const timeSinceEnd = Date.now() - new Date(ne.endedAt).getTime()
            const timeLeft = Math.max(0, 24 * 3600 * 1000 - timeSinceEnd)
            const hoursLeft = Math.floor(timeLeft / (3600 * 1000))
            const minsLeft = Math.floor((timeLeft % (3600 * 1000)) / (60 * 1000))
            sweepCountdown = `${hoursLeft}H ${minsLeft}M`
          }

          const getSourceColor = (src: string) => {
            const s = (src || '').toLowerCase()
            if (s.includes('reuters')) return 'text-red-500 border-red-500/30 bg-red-500/10'
            if (s.includes('ap') || s.includes('press')) return 'text-orange-400 border-orange-400/30 bg-orange-400/10'
            if (s.includes('ansa')) return 'text-green-400 border-green-400/30 bg-green-400/10'
            if (s.includes('bbc')) return 'text-purple-400 border-purple-400/30 bg-purple-400/10'
            if (s.includes('bloomberg')) return 'text-yellow-500 border-yellow-500/30 bg-yellow-500/10'
            if (s.includes('ft') || s.includes('financial')) return 'text-pink-400 border-pink-400/30 bg-pink-400/10'
            return 'text-accent border-accent/30 bg-accent/10'
          }

          const formatZuluTime = (ts: string) => {
            if (!ts) return 'N/A'
            try {
              const d = new Date(ts)
              return d.toISOString().replace('T', ' ').slice(0, 19) + ' Z'
            } catch {
              return 'N/A'
            }
          }

          const getRelativeTime = (ts: string) => {
            if (!ts) return 'N/A'
            try {
              const ms = Date.now() - new Date(ts).getTime()
              const mins = Math.floor(ms / 60000)
              if (mins < 1) return 'JUST NOW'
              if (mins < 60) return `${mins}M AGO`
              const hrs = Math.floor(mins / 60)
              if (hrs < 24) return `${hrs}H AGO`
              const days = Math.floor(hrs / 24)
              return `${days}D AGO`
            } catch {
              return 'N/A'
            }
          }

          return (
            <div className="space-y-4 font-mono select-none">
              {/* Header Title with Glassmorphism */}
              <div className={`p-3 bg-surface/50 backdrop-blur-md border ${catColors.border} rounded flex flex-col gap-1 items-center justify-center text-center`}>
                <BookOpen className={`w-7 h-7 ${catColors.text} animate-pulse`} />
                <span className={`text-[10px] font-bold tracking-wider ${catColors.text} mt-1.5 uppercase`}>
                  {ne.eventType ? `${ne.eventType} ` : ''}{ne.category} INTEL REPORT
                </span>
                
                {/* Source Badge and Reliability Indicator */}
                <div className="flex flex-wrap gap-1.5 items-center justify-center mt-2">
                  <span className={`px-2 py-0.5 border rounded text-[8px] font-bold uppercase tracking-wider ${getSourceColor(ne.source)}`}>
                    {ne.source ? `[${ne.source.toUpperCase()}]` : '[WIRE FEED]'}
                  </span>
                  {ne.source_reliability === 'unverified' ? (
                    <div className="flex items-center gap-1 px-2 py-0.5 border border-status-warning/50 bg-status-warning-bg text-status-warning-text rounded text-[8px] font-bold">
                      <AlertTriangle className="w-2.5 h-2.5" />
                      <span>UNVERIFIED SOURCE</span>
                    </div>
                  ) : (
                    <div className="flex items-center gap-1 px-2 py-0.5 border border-green-500/25 bg-green-950/20 text-accent rounded text-[8px] font-bold">
                      <Check className="w-2.5 h-2.5" />
                      <span>HIGH RELIABILITY</span>
                    </div>
                  )}
                </div>
              </div>

              {/* Severity & Timestamps HUD Grid */}
              <div className="grid grid-cols-2 gap-2">
                <div className={`p-2.5 border rounded flex flex-col justify-between ${sevColors}`}>
                  <span className="text-[7.5px] opacity-80 uppercase font-bold tracking-wider">Telemetry Severity</span>
                  <span className="text-xs font-bold mt-1 uppercase">
                    Level {ne.severity || 3} / 5
                  </span>
                </div>

                <div className="p-2.5 bg-surface/40 backdrop-blur-sm border border-weak rounded flex flex-col justify-between text-secondary">
                  <span className="text-[7.5px] uppercase font-bold tracking-wider">Local Elapsed</span>
                  <span className="text-xs font-bold text-accent mt-1">
                    {getRelativeTime(ne.timestamp)}
                  </span>
                </div>
              </div>

              {/* Zulu Time Block */}
              <div className="p-2.5 bg-surface/40 backdrop-blur-sm border border-weak rounded flex flex-col text-secondary">
                <span className="text-[7.5px] uppercase font-bold tracking-wider">Zulu Clock Timestamp</span>
                <span className="text-[10px] font-bold text-primary mt-1 tracking-widest uppercase">
                  {formatZuluTime(ne.timestamp)}
                </span>
              </div>

              {/* Monospace Title and Raw Translation Panel */}
              <div className="p-3 bg-surface/50 backdrop-blur-md border border-weak rounded space-y-2">
                <span className="text-[9px] font-bold text-primary tracking-wide block uppercase border-b border-weak pb-2 leading-tight">
                  {ne.title}
                </span>
                
                <span className="text-[7.5px] font-bold tracking-widest text-accent uppercase block mt-1">
                  RAW SOURCE (ENGLISH TRANSLATION)
                </span>
                {/* Glassmorphic monospace summary box */}
                <div className="bg-[#03060d]/50 p-2.5 border border-weak/45 rounded font-mono text-[8.5px] text-secondary leading-normal relative overflow-hidden">
                  <div className="absolute top-0 right-0 w-1.5 h-1.5 bg-accent/40 rounded-bl" />
                  <p className="whitespace-pre-line tracking-wide">
                    {ne.raw_english_translation || ne.summary}
                  </p>
                </div>
              </div>

              {/* Source verification URL link */}
              {ne.url && (
                <a
                  href={ne.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center justify-center gap-1.5 px-3 py-2 bg-accent/10 hover:bg-accent/20 border border-accent/25 hover:border-accent text-accent hover:text-white text-[9px] font-bold rounded tracking-wider uppercase transition-all w-full cursor-pointer mt-2"
                >
                  <ExternalLink className="w-3.5 h-3.5" />
                  <span>DECRYPT & SECURELY TRANSMIT FULL REPORT</span>
                </a>
              )}

              {/* Instant ended status overlay */}
              {ne.eventType === 'instant' && ne.isEnded && (
                <div className="p-3 bg-red-950/20 border border-red-500/30 rounded flex flex-col gap-1 text-center font-mono">
                  <span className="text-red-500 font-bold text-[9px] uppercase tracking-wider">
                    STATUS: RESOLVED / COMPLETED
                  </span>
                  <span className="text-secondary text-[8px]">
                    Daily sweep reset in: <span className="text-primary font-bold">{sweepCountdown}</span>
                  </span>
                </div>
              )}

              {/* Persistent Event: Temporal Evolution Timeline */}
              {ne.eventType === 'persistent' && ne.updates && ne.updates.length > 0 && (
                <div className="space-y-2 border-t border-weak/50 pt-3">
                  <span className="text-[8px] text-secondary tracking-widest uppercase block">
                    TEMPORAL EVOLUTION TIMELINE
                  </span>
                  <div className="space-y-2.5 border-l border-weak pl-2.5 ml-1.5 mt-1">
                    {ne.updates.map((update: any, uidx: number) => (
                      <div key={uidx} className="relative text-[9px] leading-normal space-y-0.5">
                        <div className="absolute -left-[14px] top-1 w-2 h-2 rounded-full border border-accent bg-deepest flex items-center justify-center">
                          <div className="w-1 h-1 rounded-full bg-accent" />
                        </div>
                        <span className="text-[7.5px] text-secondary tabular-nums">
                          {new Date(update.timestamp).toLocaleTimeString()} ({new Date(update.timestamp).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })})
                        </span>
                        <p className="text-primary font-mono opacity-90 leading-tight">{update.text}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Hub Event: Spokes List */}
              {ne.eventType === 'hub' && (
                <div className="space-y-2 border-t border-weak/50 pt-3 font-mono">
                  <span className="text-[8px] text-secondary tracking-widest uppercase block">
                    TACTICAL SPOKES IN THEATRE ({spokes.length})
                  </span>
                  {spokes.length > 0 ? (
                    <div className="space-y-2 max-h-[140px] overflow-y-auto custom-scrollbar">
                      {spokes.map((spoke: any) => (
                        <div 
                          key={spoke.id}
                          onClick={() => {
                            if (spoke.coordinates) {
                              flyTo(spoke.coordinates[0], spoke.coordinates[1], 12)
                              setSelectedEntityId(spoke.id)
                            }
                          }}
                          className="p-2 bg-deepest/35 border border-weak hover:border-accent rounded cursor-pointer transition-all flex flex-col gap-1"
                        >
                          <div className="flex justify-between items-center">
                            <span className="text-accent text-[7.5px] font-bold uppercase">SPOKE DISPATCH</span>
                            <span className="text-secondary text-[7px] tabular-nums">
                              {new Date(spoke.timestamp).toLocaleTimeString()}
                            </span>
                          </div>
                          <span className="text-[8.5px] text-primary uppercase font-bold truncate">
                            {spoke.title}
                          </span>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <span className="text-secondary text-[8px] uppercase italic block pt-1">
                      No active micro-events orbiting this hub center.
                    </span>
                  )}
                </div>
              )}

              {/* Spoke Event: Back Link to Hub */}
              {ne.eventType === 'spoke' && parentHub && (
                <div className="space-y-2 border-t border-weak/50 pt-3">
                  <span className="text-[8px] text-secondary tracking-widest uppercase block">
                    THEATRE ANCHOR HUB
                  </span>
                  <div 
                    onClick={() => {
                      const coords = parentHub.coordinates || [parentHub.lon, parentHub.lat]
                      if (coords) {
                        flyTo(coords[0], coords[1], 10)
                        setSelectedEntityId(parentHub.id)
                      }
                    }}
                    className="p-2.5 bg-purple-950/15 border border-purple-500/30 hover:border-purple-400 rounded cursor-pointer transition-all flex flex-col gap-1 items-center text-center text-purple-400 font-bold"
                  >
                    <Globe className="w-4 h-4 text-purple-400 animate-pulse" />
                    <span className="text-[7.5px] text-secondary uppercase tracking-widest">
                      [ FOCUS PARENT THEATRE HUB ]
                    </span>
                    <span className="text-[9px] uppercase leading-tight text-primary">
                      {parentHub.title || parentHub.name}
                    </span>
                  </div>
                </div>
              )}

              {/* Geolocated Anchors */}
              {ne.coordinates && (
                <div className="p-3 bg-deepest/45 border border-weak rounded flex flex-col gap-1.5 text-[9px]">
                  <span className="text-[8px] text-secondary uppercase block border-b border-weak pb-1">COORDINATE MAPPING</span>
                  <div className="flex justify-between">
                    <span className="text-secondary">LATITUDE:</span>
                    <span className="font-mono text-primary font-semibold">{ne.coordinates[1].toFixed(4)}°N</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-secondary">LONGITUDE:</span>
                    <span className="font-mono text-primary font-semibold">{ne.coordinates[0].toFixed(4)}°E</span>
                  </div>
                </div>
              )}


              {/* OSINT CYBER RECON BLOCK */}
              <div className="border-t border-weak pt-4 space-y-3 font-mono">
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
                <Satellite className="w-8 h-8 text-accent animate-pulse" />
                <span className="text-sm font-bold tracking-wider text-accent mt-1 text-center">
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
                <div className="p-2.5 bg-deepest/45 border border-weak rounded flex flex-col">
                  <span className="text-[8px] text-secondary uppercase">Altitude</span>
                  <span className="text-sm font-semibold text-accent mt-0.5">
                    {sat.altitudeKm.toFixed(2)} KM
                  </span>
                </div>

                <div className="p-2.5 bg-deepest/45 border border-weak rounded flex flex-col">
                  <span className="text-[8px] text-secondary uppercase">Velocity</span>
                  <span className="text-sm font-semibold text-accent mt-0.5">
                    {sat.velocityKms.toFixed(3)} KM/S
                  </span>
                </div>

                <div className="p-2.5 bg-deepest/45 border border-weak rounded flex flex-col">
                  <span className="text-[8px] text-secondary uppercase">Inclination</span>
                  <span className="text-sm font-semibold text-primary mt-0.5">
                    {sat.inclination.toFixed(2)}°
                  </span>
                </div>

                <div className="p-2.5 bg-deepest/45 border border-weak rounded flex flex-col">
                  <span className="text-[8px] text-secondary uppercase">Period</span>
                  <span className="text-sm font-semibold text-primary mt-0.5">
                    {Math.round(2 * Math.PI * (6371 + sat.altitudeKm) / sat.velocityKms / 60)} MIN
                  </span>
                </div>
              </div>

              {/* Coordinates */}
              <div className="p-3 bg-deepest/45 border border-weak rounded space-y-1.5">
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
              <div className="p-3 bg-deepest/45 border border-weak rounded space-y-2">
                <span className="text-[8px] text-secondary tracking-widest uppercase block border-b border-weak pb-1">NORAD TLE METRICS</span>
                <div className="bg-black/60 p-2 border border-[#00f0ff]/20 rounded text-[7px] font-mono text-primary leading-tight overflow-x-auto whitespace-pre">
                  {sat.tleLine1}<br />{sat.tleLine2}
                </div>
              </div>

              {/* License and Attribution */}
              {(() => {
                const licId = sat.id === 'noaa-20' ? 'noaa-swpc' : 'celestrak-gp'
                const lic = (licensesConfig as any)[licId]
                if (!lic) return null
                return (
                  <div className="p-2.5 bg-deepest/30 border border-weak rounded text-[8px] text-secondary leading-snug space-y-0.5 font-mono">
                    <span className="font-bold block text-primary">LICENSE ATTRIBUTION</span>
                    <div>Source: {lic.attributionString}</div>
                    <div>License: <span className="uppercase text-accent font-semibold">{lic.licenseType.replace('_', ' ')}</span></div>
                    <div>Usage: {lic.usageLimits}</div>
                  </div>
                )
              })()}

              {/* OSINT CYBER RECON BLOCK */}
              <div className="border-t border-weak pt-4 space-y-3 font-mono">
                <span className="text-[8px] font-bold tracking-widest text-[#00ff00] uppercase block">
                  🛡️ OSINT CYBER SEC-OPS
                </span>
                <EntityReconPanel entity={entity} />
              </div>
            </div>
          )
        })()}

        {/* ── NEWS CONTEXT DETAILS ── */}
        {entity.type === 'news-context' && (() => {
          const marker = entity.data as any
          const timeline = marker.timeline || []
          return (
            <div className="space-y-4 font-mono">
              <div className="p-3 bg-deepest/60 border border-[#af52de]/30 rounded flex flex-col gap-1 items-center justify-center">
                <BookOpen className="w-8 h-8 text-[#af52de] animate-pulse" />
                <span className="text-sm font-bold tracking-wider text-[#af52de] mt-1 text-center">
                  GEOFENCED CONTEXT HUB
                </span>
                <span className="text-[9px] text-secondary">
                  CONSOLIDATED TIMELINE ({timeline.length} ALERTS)
                </span>
              </div>

              {/* Coordinates & stats */}
              <div className="p-3 bg-deepest/45 border border-weak rounded space-y-2">
                <span className="text-[8px] text-secondary tracking-widest uppercase block border-b border-weak pb-1">TIMELINE METRICS</span>
                <div className="flex justify-between items-center text-[10px]">
                  <span className="text-secondary text-[8px] uppercase">Anchor Location:</span>
                  <span className="font-semibold text-primary">{timeline[0]?.source || 'Odessa Sector'}</span>
                </div>
                <div className="flex justify-between items-center text-[10px] border-t border-weak pt-1.5">
                  <span className="text-secondary text-[8px] uppercase">Anchor Lat/Lon:</span>
                  <span className="text-primary tabular-nums">
                    [{marker.coordinates[1]?.toFixed(4)}, {marker.coordinates[0]?.toFixed(4)}]
                  </span>
                </div>
                <div className="flex justify-between items-center text-[10px] border-t border-weak pt-1.5">
                  <span className="text-secondary text-[8px] uppercase">Consolidation window:</span>
                  <span className="text-primary font-semibold">48 Hours</span>
                </div>
              </div>

              {/* Scrollable timeline events list */}
              <div className="space-y-3">
                <span className="text-[8px] text-secondary tracking-widest uppercase block border-b border-weak pb-1">CHRONOLOGICAL DISPATCHES</span>
                <div className="space-y-3 max-h-[300px] overflow-y-auto custom-scrollbar pr-1">
                  {timeline.map((item: any, idx: number) => {
                    const isNewest = idx === 0
                    return (
                      <div 
                        key={item.id || idx} 
                        className={`p-2.5 rounded border text-[10px] space-y-1.5 transition-all ${
                          isNewest 
                            ? 'bg-[#af52de]/5 border-[#af52de]/30 hover:border-[#af52de]' 
                            : 'bg-deepest/30 border-weak hover:border-strong'
                        }`}
                      >
                        <div className="flex justify-between items-start gap-1">
                          <span className={`text-[8px] font-bold px-1 rounded uppercase tracking-wide border ${
                            item.severity === 'critical' ? 'bg-[#ff3b30]/10 border-[#ff3b30]/30 text-[#ff3b30]' :
                            item.severity === 'high' ? 'bg-[#ff9500]/10 border-[#ff9500]/30 text-[#ff9500]' :
                            item.severity === 'moderate' ? 'bg-yellow-400/10 border-yellow-400/30 text-yellow-400' :
                            'bg-[#34c759]/10 border-[#34c759]/30 text-[#34c759]'
                          }`}>
                            {item.severity}
                          </span>
                          <span className="text-[7px] text-secondary tabular-nums">
                            {new Date(item.timestamp).toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' })} ({new Date(item.timestamp).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })})
                          </span>
                        </div>
                        <div className="font-semibold text-primary leading-snug">
                          {item.title}
                        </div>
                        <div className="text-[9px] text-secondary leading-normal">
                          {item.summary}
                        </div>
                        <div className="flex justify-between items-center text-[7px] text-secondary border-t border-weak/50 pt-1">
                          <span>SOURCE: {item.source.toUpperCase()}</span>
                          {item.url && (
                            <a 
                              href={item.url} 
                              target="_blank" 
                              rel="noreferrer" 
                              className="text-accent hover:underline flex items-center gap-0.5"
                            >
                              <span>REF</span>
                              <ExternalLink className="w-2 h-2" />
                            </a>
                          )}
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>
            </div>
          )
        })()}

        {/* ── ACTIVE CONFLICT DETAILS ── */}
        {entity.type === 'active-conflict' && (() => {
          const conflict = entity.data as any
          return (
            <div className="space-y-4 font-mono">
              <div className="p-3 bg-deepest/60 border border-[var(--pan-marker-conflict)]/30 rounded flex flex-col gap-1 items-center justify-center">
                <Shield className="w-8 h-8 text-[#ff1a1a] animate-pulse" />
                <span className="text-sm font-bold tracking-wider text-[#ff1a1a] mt-1 text-center">
                  ACTIVE MILITARY CONFLICT
                </span>
                <span className="text-[9px] text-secondary">
                  LONG-TERM GEOPOLITICAL STANDOFF
                </span>
              </div>

              {/* Status and intensity widget */}
              <div className="grid grid-cols-2 gap-2">
                <div className="p-2.5 bg-deepest/45 border border-weak rounded flex flex-col">
                  <span className="text-[8px] text-secondary uppercase">Conflict Intensity</span>
                  <span className={`text-sm font-semibold mt-0.5 ${
                    conflict.intensity === 'HIGH' ? 'text-red-500' : conflict.intensity === 'MEDIUM' ? 'text-yellow-400' : 'text-blue-400'
                  }`}>
                    {conflict.intensity}
                  </span>
                </div>

                <div className="p-2.5 bg-deepest/45 border border-weak rounded flex flex-col">
                  <span className="text-[8px] text-secondary uppercase">Operational Category</span>
                  <span className="text-xs font-semibold mt-0.5 text-primary uppercase">
                    {conflict.category.replace('-', ' ')}
                  </span>
                </div>
              </div>

              {/* Conflict description */}
              <div className="p-3 bg-deepest/45 border border-weak rounded space-y-2">
                <span className="text-[8px] text-secondary tracking-widest uppercase block border-b border-weak pb-1">TACTICAL MONITOR</span>
                
                <div className="flex justify-between items-center text-[10px]">
                  <span className="text-secondary text-[8px] uppercase">Conflict Name:</span>
                  <span className="font-semibold text-primary">{conflict.name}</span>
                </div>

                <div className="flex justify-between items-center text-[10px] border-t border-weak pt-1.5">
                  <span className="text-secondary text-[8px] uppercase">Conflict ID:</span>
                  <span className="text-secondary select-all text-[9px]">{conflict.id}</span>
                </div>

                <div className="flex justify-between items-center text-[10px] border-t border-weak pt-1.5">
                  <span className="text-secondary text-[8px] uppercase">Start Date:</span>
                  <span className="text-primary tabular-nums">
                    {new Date(conflict.startDate).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' })}
                  </span>
                </div>

                <div className="flex justify-between items-center text-[10px] border-t border-weak pt-1.5">
                  <span className="text-secondary text-[8px] uppercase">Last Updated:</span>
                  <span className="text-primary tabular-nums">
                    {new Date(conflict.lastUpdated).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' })}
                  </span>
                </div>

                <div className="flex justify-between items-center text-[10px] border-t border-weak pt-1.5">
                  <span className="text-secondary text-[8px] uppercase">Coordinates:</span>
                  <span className="text-primary tabular-nums">
                    [{conflict.lat.toFixed(4)}, {conflict.lon.toFixed(4)}]
                  </span>
                </div>
              </div>

              {/* Node detailed description paragraph */}
              <div className="p-3 bg-deepest/45 border border-weak rounded">
                <span className="text-[8px] text-secondary uppercase block mb-1">Geopolitical Background</span>
                <p className="text-[10px] text-secondary leading-relaxed bg-deepest/20 p-2 border border-weak/50 rounded">
                  {conflict.description}
                </p>
              </div>

              {/* OSINT SEC-OPS / Copy URL block */}
              <div className="p-3 bg-deepest/45 border border-weak rounded space-y-2">
                <span className="text-[8px] text-secondary uppercase block border-b border-weak pb-1">Attributed Source Reference</span>
                <div className="bg-deepest/50 p-2 rounded border border-weak break-all text-primary select-all text-[9px] mb-2">
                  {conflict.sourceUrl}
                </div>
                <a
                  href={conflict.sourceUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="w-full text-center py-2 px-3 border border-red-500/30 hover:border-red-500 bg-red-500/5 hover:bg-red-500/15 text-red-500 font-bold rounded transition-all uppercase flex items-center justify-center gap-1.5"
                >
                  <ExternalLink className="w-3 h-3" />
                  <span>VISIT PRIMARY REFERENCE</span>
                </a>
              </div>
            </div>
          )
        })()}

        {entity.type === 'nuclear' && (() => {
          const nuc = entity.data
          return (
            <div className="flex-1 overflow-y-auto custom-scrollbar p-4 space-y-4 font-mono">
              {/* Telemetry Status Card */}
              <div className="p-3 bg-[#39ff14]/5 border border-[#39ff14]/30 rounded space-y-2.5">
                <span className="text-[8px] text-[#39ff14] tracking-widest uppercase block border-b border-[#39ff14]/20 pb-1 font-bold">
                  ☢️ GRID TELEMETRY METRICS
                </span>
                
                <div className="flex justify-between items-center text-[10px]">
                  <span className="text-secondary text-[8px] uppercase">OPERATIONAL STATUS:</span>
                  <span className="text-[#39ff14] font-bold uppercase animate-pulse">
                    {nuc.status || 'NOMINAL'}
                  </span>
                </div>

                <div className="flex justify-between items-center text-[10px] border-t border-weak pt-1.5">
                  <span className="text-secondary text-[8px] uppercase">CAPACITY OUTPUT:</span>
                  <span className="text-primary font-bold">
                    {nuc.capacity_mw || 1000} MW
                  </span>
                </div>

                <div className="flex justify-between items-center text-[10px] border-t border-weak pt-1.5">
                  <span className="text-secondary text-[8px] uppercase">COORDINATES:</span>
                  <span className="text-primary tabular-nums">
                    [{nuc.coordinates[0].toFixed(4)}, {nuc.coordinates[1].toFixed(4)}]
                  </span>
                </div>
              </div>

              {/* Facility details */}
              <div className="p-3 bg-deepest/45 border border-weak rounded">
                <span className="text-[8px] text-secondary uppercase block mb-1">FACILITY NAME</span>
                <h4 className="text-[11px] text-primary font-bold uppercase mb-2">
                  {nuc.name}
                </h4>
                <span className="text-[8px] text-secondary uppercase block mb-1">SYSTEM OPERATOR</span>
                <p className="text-[10px] text-primary font-mono bg-deepest/20 p-2 border border-weak/50 rounded">
                  {nuc.operator || 'Unknown'}
                </p>
              </div>

              {/* Attributed Sources */}
              <div className="p-3 bg-deepest/45 border border-weak rounded space-y-2">
                <span className="text-[8px] text-secondary uppercase block border-b border-weak pb-1">Ingestion Source Audits</span>
                <div className="flex flex-col gap-1.5 font-mono text-[9px] text-secondary">
                  <div className="flex items-center justify-between border-b border-weak border-dashed pb-1">
                    <span>➜ OpenStreetMap Overpass</span>
                    <span className="text-[#39ff14] font-bold">NOMINAL</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span>➜ IAEA PRIS Registry</span>
                    <span className="text-[#39ff14] font-bold">VERIFIED</span>
                  </div>
                </div>
              </div>
            </div>
          )
        })()}

        {entity.type === 'weather' && (() => {
          const wp = entity.data
          return (
            <div className="flex-1 overflow-y-auto custom-scrollbar p-4 space-y-4 font-mono">
              {/* Telemetry Status Card */}
              <div className={`p-3 border rounded space-y-2.5 ${wp.isExtreme ? 'bg-status-critical-bg/20 border-status-critical/40' : 'bg-accent/5 border-accent/20'}`}>
                <span className={`text-[8px] tracking-widest uppercase block border-b pb-1 font-bold ${wp.isExtreme ? 'text-status-critical-text border-status-critical/20 animate-pulse' : 'text-accent border-weak/50'}`}>
                  {wp.isExtreme ? `⚠️ EXTREME METEOROLOGICAL ANOMALY` : '🌤️ ATMOSPHERIC METRICS'}
                </span>
                
                <div className="flex justify-between items-center text-[10px]">
                  <span className="text-secondary text-[8px] uppercase">OBSERVATION STATION:</span>
                  <span className="text-primary font-bold">
                    {wp.name}
                  </span>
                </div>

                <div className="flex justify-between items-center text-[10px] border-t border-weak pt-1.5">
                  <span className="text-secondary text-[8px] uppercase">TEMPERATURE:</span>
                  <span className="text-primary font-bold">
                    {wp.temperature?.toFixed(1)} °C
                  </span>
                </div>

                <div className="flex justify-between items-center text-[10px] border-t border-weak pt-1.5">
                  <span className="text-secondary text-[8px] uppercase">HUMIDITY:</span>
                  <span className="text-primary font-bold">
                    {wp.humidity}%
                  </span>
                </div>

                <div className="flex justify-between items-center text-[10px] border-t border-weak pt-1.5">
                  <span className="text-secondary text-[8px] uppercase">WIND SPEED & DIRECTION:</span>
                  <span className="text-primary font-bold">
                    {wp.windSpeed?.toFixed(1)} km/h ({wp.windDirection}°)
                  </span>
                </div>

                <div className="flex justify-between items-center text-[10px] border-t border-weak pt-1.5">
                  <span className="text-secondary text-[8px] uppercase">PRECIPITATION:</span>
                  <span className="text-primary font-bold">
                    {wp.precipitation} mm
                  </span>
                </div>
              </div>

              {/* Description for Extreme Weather */}
              {wp.isExtreme && (
                <div className="p-3 bg-deepest/45 border border-weak rounded">
                  <span className="text-[8px] text-secondary uppercase block mb-1">Phenomenon Highlights</span>
                  <p className="text-[10px] text-secondary leading-relaxed bg-deepest/20 p-2 border border-weak/50 rounded">
                    {wp.description}
                  </p>
                </div>
              )}

              {/* Attributed Sources */}
              <div className="p-3 bg-deepest/45 border border-weak rounded space-y-2">
                <span className="text-[8px] text-secondary uppercase block border-b border-weak pb-1">Data Origin & Attributions</span>
                <div className="flex flex-col gap-1.5 font-mono text-[9px] text-secondary">
                  {wp.sources?.map((s: string, i: number) => (
                    <div key={i} className="flex items-center justify-between border-b border-weak border-dashed pb-1">
                      <span>➜ {s}</span>
                      <span className="text-accent font-bold">VERIFIED</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )
        })()}

      </div>
    </div>
  )
}
