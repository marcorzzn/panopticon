import type { WebcamEntity } from '@panopticon/core/types'
import { IntelligenceDomain } from '@panopticon/core/types'
import amosWebcams from '../../../core/src/config/amos-webcams.json'
import earthcamWebcams from '../../../core/src/config/earthcam-webcams.json'

export async function fetchWebcams(): Promise<WebcamEntity[]> {
  const merged: WebcamEntity[] = []

  // 1. EarthCam high-fidelity video embeds (type: iframe_embed)
  earthcamWebcams.forEach((cam: any) => {
    merged.push({
      id: cam.id,
      coordinates: [cam.lon, cam.lat],
      domain: IntelligenceDomain.GEOPOLITICAL,
      timestamp: Date.now(),
      label: `CCTV: ${cam.name} [LIVE]`,
      streamUrl: cam.streamUrl,
      status: cam.status as 'healthy' | 'degraded' | 'offline',
      type: cam.type as 'iframe_embed' | 'static_snapshot',
      provider: 'EarthCam',
    })
  })

  // 2. AMOS static snapshot cameras (type: static_snapshot)
  amosWebcams.forEach((cam: any) => {
    merged.push({
      id: cam.id,
      coordinates: [cam.lon, cam.lat],
      domain: IntelligenceDomain.GEOPOLITICAL,
      timestamp: Date.now(),
      label: `CCTV: ${cam.name} [${cam.status.toUpperCase()}]`,
      streamUrl: cam.streamUrl,
      status: cam.status as 'healthy' | 'degraded' | 'offline',
      type: cam.type as 'iframe_embed' | 'static_snapshot',
      provider: 'AMOS',
    })
  })

  return merged
}
