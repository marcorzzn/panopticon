import { IntelligenceDomain } from '@panopticon/core/types';
export async function fetchAcledEvents() {
    const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:8080/api/v1';
    try {
        const response = await fetch(`${backendUrl}/geopolitical/acled`);
        if (!response.ok) {
            throw new Error(`Go Backend API returned status ${response.status}`);
        }
        const res = await response.json();
        if (!res || !Array.isArray(res.data)) {
            return [];
        }
        const fields = res.fields || [];
        const idxId = fields.indexOf("id");
        const idxEventType = fields.indexOf("event_type");
        const idxActor1 = fields.indexOf("actor1");
        const idxActor2 = fields.indexOf("actor2");
        const idxLat = fields.indexOf("lat");
        const idxLon = fields.indexOf("lon");
        const idxFatalities = fields.indexOf("fatalities");
        const idxNotes = fields.indexOf("notes");
        const idxEventDate = fields.indexOf("event_date");
        return res.data.map((row, index) => {
            const id = row[idxId] || `sim-acled-${index}`;
            const eventType = row[idxEventType] || 'Conflict Event';
            const actor1 = row[idxActor1] || 'Unknown Group';
            const actor2 = row[idxActor2] || '';
            const lat = row[idxLat] ?? 0;
            const lon = row[idxLon] ?? 0;
            const fatalities = row[idxFatalities] ?? 0;
            const notes = row[idxNotes] || 'Geopolitical incident registered.';
            const eventDateSec = row[idxEventDate] || (Date.now() / 1000);
            const label = `${eventType} (${actor1}${actor2 ? ' vs ' + actor2 : ''}) - Fatalities: ${fatalities}`;
            return {
                id,
                coordinates: [lon, lat],
                domain: IntelligenceDomain.GEOPOLITICAL,
                timestamp: eventDateSec * 1000,
                label,
                eventType,
                subEventType: eventType,
                actor1,
                actor2,
                country: 'Regional',
                location: 'Operational Area',
                fatalities,
                notes,
                source: 'ACLED',
            };
        });
    }
    catch (err) {
        console.warn("ACLED geopolitical events backend unreachable. Standard client-side fallback engaged:", err);
        return [];
    }
}
//# sourceMappingURL=acled.js.map