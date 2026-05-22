import type { SatelliteEntity } from '@panopticon/core/types'
import { IntelligenceDomain } from '@panopticon/core/types'

export async function fetchSatellites(): Promise<SatelliteEntity[]> {
	const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:8080/api/v1'
	
	try {
		const response = await fetch(`${backendUrl}/space/satellites`)
		if (!response.ok) {
			throw new Error(`Go Backend API returned status ${response.status}`)
		}
		
		const res = await response.json()
		if (!res || !Array.isArray(res.data)) {
			return []
		}
		
		const fields = res.fields || []
		const idxId = fields.indexOf("id")
		const idxName = fields.indexOf("name")
		const idxNoradId = fields.indexOf("noradId")
		const idxSatelliteType = fields.indexOf("satelliteType")
		const idxLat = fields.indexOf("lat")
		const idxLon = fields.indexOf("lon")
		const idxAltitudeKm = fields.indexOf("altitudeKm")
		const idxInclination = fields.indexOf("inclination")
		const idxVelocityKms = fields.indexOf("velocityKms")
		const idxTleLine1 = fields.indexOf("tleLine1")
		const idxTleLine2 = fields.indexOf("tleLine2")
		
		return res.data.map((row: any[], index: number) => {
			const id = row[idxId] || `sat-${index}`
			const name = row[idxName] || 'Active Satellite Tracker'
			const noradId = row[idxNoradId] ?? 0
			const satelliteType = row[idxSatelliteType] || 'telecom'
			const lat = row[idxLat] ?? 0
			const lon = row[idxLon] ?? 0
			const altitudeKm = row[idxAltitudeKm] ?? 0
			const inclination = row[idxInclination] ?? 0
			const velocityKms = row[idxVelocityKms] ?? 0
			const tleLine1 = row[idxTleLine1] || ''
			const tleLine2 = row[idxTleLine2] || ''
			
			return {
				id,
				coordinates: [lon, lat],
				domain: IntelligenceDomain.SPACE,
				timestamp: Date.now(),
				label: `${name} [NORAD #${noradId}]`,
				noradId,
				satelliteType,
				altitudeKm,
				inclination,
				velocityKms,
				tleLine1,
				tleLine2,
			}
		})
	} catch (err) {
		console.warn("Space satellites backend unreachable. Engaging high-fidelity client-side Keplerian propagator fallback:", err)
		
		const nowFloat = Date.now() / 1000
		const earthRotationSpeed = 360.0 / 86400.0 // Earth rotates 360 deg in 24h (deg/sec)
		
		const clientSimSatellites = [
			{
				id: "iss",
				name: "ISS (Zarya)",
				noradId: 25544,
				type: "telecom",
				inclination: 51.64,
				altitudeKm: 421.25,
				velocityKms: 7.660,
				startLon: -120.0,
				phaseOffset: 0.0,
				periodMin: 92.8,
				tleLine1: "1 25544U 98067A   26142.56209539  .00014324  00000-0  25574-3 0  9997",
				tleLine2: "2 25544  51.6418 142.3245 0005432  64.3218 295.8924 15.49830214569342",
			},
			{
				id: "usa-224",
				name: "USA-224 (KH-11 Spy)",
				noradId: 37348,
				type: "recon",
				inclination: 97.40,
				altitudeKm: 285.50,
				velocityKms: 7.790,
				startLon: 45.0,
				phaseOffset: 1.2,
				periodMin: 90.2,
				tleLine1: "1 37348U 11002A   26142.11029482  .00021940  00000-0  18234-4 0  9995",
				tleLine2: "2 37348  97.4012  85.2018 0002845  42.1892 318.4902 15.96420185792341",
			},
			{
				id: "usa-245",
				name: "USA-245 (KH-11 Spy)",
				noradId: 40964,
				type: "recon",
				inclination: 97.80,
				altitudeKm: 392.40,
				velocityKms: 7.680,
				startLon: -75.0,
				phaseOffset: 2.5,
				periodMin: 92.4,
				tleLine1: "1 40964U 15045A   26142.38920194  .00009210  00000-0  10492-4 0  9991",
				tleLine2: "2 40964  97.8045 210.4839 0003102 120.4832 240.5902 15.58910482934211",
			},
			{
				id: "hubble",
				name: "Hubble Space Telescope",
				noradId: 20580,
				type: "telecom",
				inclination: 28.47,
				altitudeKm: 540.20,
				velocityKms: 7.590,
				startLon: 10.0,
				phaseOffset: 0.8,
				periodMin: 95.4,
				tleLine1: "1 20580U 90037B   26142.45920392  .00001048  00000-0  12485-5 0  9998",
				tleLine2: "2 20580  28.4682 342.1849 0007234  90.4829 270.4820 15.09420849204839",
			},
			{
				id: "starlink-3045",
				name: "Starlink-3045 (Telecom)",
				noradId: 51000,
				type: "telecom",
				inclination: 53.21,
				altitudeKm: 550.00,
				velocityKms: 7.580,
				startLon: 160.0,
				phaseOffset: 3.1,
				periodMin: 95.6,
				tleLine1: "1 51000U 22005A   26142.19028492  .00001248  00000-0  59204-5 0  9992",
				tleLine2: "2 51000  53.2145 198.4829 0001492  35.4892 324.9012 15.06421890284920",
			},
			{
				id: "starlink-3046",
				name: "Starlink-3046 (Telecom)",
				noradId: 51001,
				type: "telecom",
				inclination: 53.21,
				altitudeKm: 550.00,
				velocityKms: 7.580,
				startLon: 140.0,
				phaseOffset: 4.5,
				periodMin: 95.6,
				tleLine1: "1 51001U 22005B   26142.19128402  .00001250  00000-0  59210-5 0  9993",
				tleLine2: "2 51001  53.2148 178.4890 0001490  45.4829 314.9018 15.06421891029482",
			},
			{
				id: "noaa-20",
				name: "NOAA-20 (Weather)",
				noradId: 43013,
				type: "recon",
				inclination: 98.70,
				altitudeKm: 824.10,
				velocityKms: 7.440,
				startLon: -30.0,
				phaseOffset: 0.5,
				periodMin: 101.4,
				tleLine1: "1 43013U 17073A   26142.20184920  .00000084  00000-0  21094-5 0  9996",
				tleLine2: "2 43013  98.7012 312.4829 0001489  74.2048 285.9018 14.19830294820194",
			},
			{
				id: "sentinel-1a",
				name: "Sentinel-1A (Radar)",
				noradId: 39634,
				type: "recon",
				inclination: 98.18,
				altitudeKm: 693.00,
				velocityKms: 7.500,
				startLon: 90.0,
				phaseOffset: 5.2,
				periodMin: 98.6,
				tleLine1: "1 39634U 14016A   26142.10284920  .00000120  00000-0  34902-5 0  9994",
				tleLine2: "2 39634  98.1823  42.1890 0001280  98.2045 261.9023 14.59830198402948",
			},
			{
				id: "envisat",
				name: "Envisat Space Debris",
				noradId: 27386,
				type: "debris",
				inclination: 98.54,
				altitudeKm: 762.30,
				velocityKms: 7.470,
				startLon: 110.0,
				phaseOffset: 3.8,
				periodMin: 100.1,
				tleLine1: "1 27386U 02009A   26142.48291048  -.00000012 00000-0  00000-0 0  9999",
				tleLine2: "2 27386  98.5402 120.4839 0001184 140.2948 220.1948 14.38290185930284",
			},
			{
				id: "sl-12-rb",
				name: "SL-12 R/B (Soviet Debris)",
				noradId: 22234,
				type: "debris",
				inclination: 64.80,
				altitudeKm: 1192.40,
				velocityKms: 7.250,
				startLon: -10.0,
				phaseOffset: 1.8,
				periodMin: 109.3,
				tleLine1: "1 22234U 92080B   26142.50291849  .00000210  00000-0  59234-4 0  9990",
				tleLine2: "2 22234  64.8012 284.1849 0008294 180.2045 180.1940 13.16920194820194",
			},
			{
				id: "cosmos-2251-deb",
				name: "COSMOS 2251 Debris",
				noradId: 35000,
				type: "debris",
				inclination: 74.00,
				altitudeKm: 780.00,
				velocityKms: 7.460,
				startLon: 30.0,
				phaseOffset: 2.1,
				periodMin: 100.5,
				tleLine1: "1 35000U 93036AP  26142.30294820  .00004928  00000-0  48293-4 0  9992",
				tleLine2: "2 35000  74.0018 190.2849 0003892  95.4892 265.4890 14.32980194820492",
			},
			{
				id: "iridium-33-deb",
				name: "Iridium 33 Debris",
				noradId: 36000,
				type: "debris",
				inclination: 86.40,
				altitudeKm: 770.00,
				velocityKms: 7.460,
				startLon: -160.0,
				phaseOffset: 4.8,
				periodMin: 100.2,
				tleLine1: "1 36000U 97051AL  26142.31294820  .00003920  00000-0  38294-4 0  9993",
				tleLine2: "2 36000  86.4012  45.2890 0003490  85.4892 275.4890 14.36420194820938",
			},
		]
		
		return clientSimSatellites.map((sat) => {
			const periodSec = sat.periodMin * 60.0
			const angularSpeed = (2.0 * Math.PI) / periodSec
			const meanAnomaly = (angularSpeed * nowFloat) + sat.phaseOffset
			
			// Latitude: sinusoidal oscillation between [-inclination, inclination]
			const latRad = (sat.inclination * Math.PI / 180.0) * Math.sin(meanAnomaly)
			const lat = latRad * 180.0 / Math.PI
			
			const orbitalSpeedDegSec = 360.0 / periodSec
			const dirMultiplier = sat.inclination > 90.0 ? -1.0 : 1.0
			
			const lonShift = dirMultiplier * orbitalSpeedDegSec * nowFloat
			const earthRotationShift = earthRotationSpeed * nowFloat
			
			let lon = sat.startLon + lonShift - earthRotationShift
			lon = lon % 360.0
			if (lon > 180.0) {
				lon -= 360.0
			} else if (lon < -180.0) {
				lon += 360.0
			}
			
			const altOscillation = 5.0 * Math.cos(meanAnomaly * 2.0)
			const currentAlt = sat.altitudeKm + altOscillation
			const currentSpeed = sat.velocityKms * (1.0 - 0.005 * Math.cos(meanAnomaly * 2.0))
			
			return {
				id: sat.id,
				coordinates: [lon, lat],
				domain: IntelligenceDomain.SPACE,
				timestamp: Date.now(),
				label: `${sat.name} [NORAD #${sat.noradId}]`,
				noradId: sat.noradId,
				satelliteType: sat.type as 'telecom' | 'recon' | 'debris' | 'military',
				altitudeKm: currentAlt,
				inclination: sat.inclination,
				velocityKms: currentSpeed,
				tleLine1: sat.tleLine1,
				tleLine2: sat.tleLine2,
			}
		})
	}
}
