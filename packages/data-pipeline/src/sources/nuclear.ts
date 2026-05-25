export async function fetchNuclearFacilities(): Promise<any> {
  try {
    const query = `[out:json][timeout:10];node["generator:source"="nuclear"];out;`;
    const response = await fetch('https://overpass-api.de/api/interpreter', {
      method: 'POST',
      body: query
    });
    
    if (!response.ok) {
      throw new Error('Overpass API error ' + response.status);
    }
    
    const data = await response.json();
    
    const features = data.elements.map((el: any) => ({
      type: "Feature",
      geometry: {
        type: "Point",
        coordinates: [el.lon, el.lat]
      },
      properties: {
        id: `NUC-${el.id}`,
        name: el.tags?.name || `Nuclear Facility ${el.id}`,
        type: "nuclear",
        operator: el.tags?.operator || "Unknown",
        status: "NOMINAL",
        capacity_mw: parseInt(el.tags?.['generator:output:electricity'] || "0", 10) || 1000
      }
    }));
    
    return {
      type: "FeatureCollection",
      features
    };
  } catch (error) {
    console.error("Failed to fetch live nuclear data from Overpass", error);
    return { type: "FeatureCollection", features: [] };
  }
}
