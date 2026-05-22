import { IntelligenceDomain } from '@panopticon/core/types';
export async function fetchAircraft() {
    const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:8080/api/v1';
    try {
        const response = await fetch(`${backendUrl}/aviation/states`);
        if (!response.ok) {
            throw new Error(`Go Backend API returned status ${response.status}`);
        }
        const res = await response.json();
        if (!res || !Array.isArray(res.data)) {
            return [];
        }
        const fields = res.fields || [];
        const idxIcao = fields.indexOf("icao24");
        const idxCallsign = fields.indexOf("callsign");
        const idxLat = fields.indexOf("lat");
        const idxLon = fields.indexOf("lon");
        const idxHeading = fields.indexOf("heading");
        const idxAlt = fields.indexOf("altitude");
        const idxVel = fields.indexOf("velocity");
        return res.data.map((row, index) => {
            const icao24 = row[idxIcao] || `sim-ac-${index}`;
            const callsign = row[idxCallsign] || 'UNKNOWN';
            const lat = row[idxLat] ?? 0;
            const lon = row[idxLon] ?? 0;
            const heading = row[idxHeading] ?? 0;
            const altitude = row[idxAlt] ?? 0;
            const velocity = row[idxVel] ?? 0;
            return {
                id: icao24,
                coordinates: [lon, lat],
                domain: IntelligenceDomain.AVIATION,
                timestamp: res.timestamp * 1000,
                label: `${callsign} [${icao24.toUpperCase()}]`,
                callsign,
                originCountry: 'International',
                baroAltitude: altitude,
                velocity,
                trueTrack: heading,
                verticalRate: 0,
            };
        });
    }
    catch (err) {
        console.warn("Aviation telemetry backend unreachable. Standard client-side fallback engaged:", err);
        return [];
    }
}
//# sourceMappingURL=aviation.js.map