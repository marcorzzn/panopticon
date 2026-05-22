import { IntelligenceDomain } from '@panopticon/core/types';
export async function fetchReconTrace(target, lat, lon) {
    const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:8080/api/v1';
    try {
        const response = await fetch(`${backendUrl}/recon/trace?target=${encodeURIComponent(target)}&lat=${lat}&lon=${lon}`);
        if (!response.ok) {
            throw new Error(`Go Backend API returned status ${response.status}`);
        }
        const res = await response.json();
        if (!res) {
            return null;
        }
        const fields = res.fields || [];
        const idxHop = fields.indexOf("hop_number");
        const idxIp = fields.indexOf("ip");
        const idxLat = fields.indexOf("lat");
        const idxLon = fields.indexOf("lon");
        const idxPing = fields.indexOf("ping_ms");
        const idxIsp = fields.indexOf("isp");
        const hops = Array.isArray(res.data)
            ? res.data.map((row) => ({
                hopNumber: row[idxHop] || 0,
                ip: row[idxIp] || '',
                lat: row[idxLat] ?? 0,
                lon: row[idxLon] ?? 0,
                pingMs: row[idxPing] ?? 0,
                isp: row[idxIsp] || '',
            }))
            : [];
        return {
            id: `scan-${target}`,
            coordinates: [lon, lat],
            domain: IntelligenceDomain.CYBER,
            timestamp: res.timestamp * 1000,
            label: `OSINT SCAN: ${target} [IP: ${res.resolvedIp}]`,
            target: res.target || target,
            resolvedIp: res.resolvedIp || '0.0.0.0',
            country: res.country || 'Unknown',
            threatScore: res.threatScore ?? 0,
            openPorts: Array.isArray(res.openPorts) ? res.openPorts : [],
            dnsRecords: res.dnsRecords || {},
            hops,
        };
    }
    catch (err) {
        console.warn("Recon traceroute backend unreachable. Standard client-side fallback engaged:", err);
        return null;
    }
}
//# sourceMappingURL=recon.js.map