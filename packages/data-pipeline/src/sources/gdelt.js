import { IntelligenceDomain } from '@panopticon/core/types';
function getSeverityFromGoldstein(goldstein) {
    if (goldstein <= -7.0)
        return 'critical';
    if (goldstein <= -4.0)
        return 'high';
    if (goldstein <= 0.0)
        return 'moderate';
    if (goldstein <= 4.0)
        return 'low';
    return 'info';
}
export async function fetchGdeltEvents(query = 'protest') {
    const url = `https://api.gdeltproject.org/api/v2/geo/geo?query=${encodeURIComponent(query)}&format=GeoJSON`;
    const response = await fetch(url);
    if (!response.ok) {
        throw new Error(`GDELT Geo API returned status ${response.status}`);
    }
    const data = await response.json();
    if (!data || !Array.isArray(data.features)) {
        throw new Error('GDELT Geo API returned invalid structure');
    }
    // Cap at 100 features to maintain high performance in Phase 1
    const features = data.features.slice(0, 100);
    return features.map((feature, index) => {
        const props = feature.properties || {};
        const geom = feature.geometry || {};
        const coords = geom.coordinates || [0, 0];
        // GDELT coordinate ordering: [lng, lat]
        const longitude = coords[0] ?? 0;
        const latitude = coords[1] ?? 0;
        // Parse the GDELT properties. They typically contain HTML-formatted text in props.html
        const name = props.name || 'Global Event';
        const html = props.html || '';
        // Attempt to extract source URL from HTML link, e.g. <a href="URL">...</a>
        let sourceUrl = '';
        const hrefMatch = html.match(/href="([^"]+)"/);
        if (hrefMatch && hrefMatch[1]) {
            sourceUrl = hrefMatch[1];
        }
        const goldsteinScale = props.goldstein ?? (props.tone ? parseFloat(props.tone) / 2 : 0); // fallback approximation
        const avgTone = props.tone ? parseFloat(props.tone) : 0;
        const numMentions = props.count ? parseInt(props.count) : 1;
        const eventCode = props.cameo || '010'; // Cameo "make public statement" as fallback
        const actor1 = props.actor1 || 'Unknown Actor';
        const actor2 = props.actor2 || 'Unknown Target';
        const timestamp = Date.now() - index * 60000; // stagger timestamps slightly for display
        return {
            id: feature.id || `gdelt-${index}-${timestamp}`,
            coordinates: [longitude, latitude],
            domain: IntelligenceDomain.GEOPOLITICAL,
            timestamp,
            label: name.replace(/<[^>]*>/g, ''), // Strip any HTML tags from name
            severity: getSeverityFromGoldstein(goldsteinScale),
            eventCode,
            goldsteinScale,
            numMentions,
            numSources: Math.ceil(numMentions * 0.7),
            numArticles: numMentions,
            avgTone,
            sourceUrl,
            actor1,
            actor2,
        };
    });
}
//# sourceMappingURL=gdelt.js.map