export async function fetchPipelineNetworks(): Promise<any> {
  try {
    const query = `[out:json][timeout:15];way["man_made"="pipeline"]["type"~"gas|oil"];out geom 200;`;
    const response = await fetch('https://overpass-api.de/api/interpreter', {
      method: 'POST',
      body: query
    });
    
    if (!response.ok) {
      throw new Error('Overpass API error ' + response.status);
    }
    
    const data = await response.json();
    
    const features = data.elements
      .filter((el: any) => el.type === 'way' && el.geometry)
      .map((el: any) => ({
        type: "Feature",
        geometry: {
          type: "LineString",
          coordinates: el.geometry.map((g: any) => [g.lon, g.lat])
        },
        properties: {
          id: `PIPE-${el.id}`,
          name: el.tags?.name || `Pipeline ${el.id}`,
          type: (el.tags?.type || 'GAS').toUpperCase(),
          status: el.tags?.status || "ACTIVE"
        }
      }));
    
    return {
      type: "FeatureCollection",
      features
    };
  } catch (error) {
    console.error("Failed to fetch live pipeline data from Overpass, falling back to static", error);
    return require('../../../core/src/config/pipeline-networks.json');
  }
}
