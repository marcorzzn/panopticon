import type { WebcamEntity } from '@panopticon/core/types'
import { IntelligenceDomain } from '@panopticon/core/types'

export async function fetchWebcams(): Promise<WebcamEntity[]> {
	// Standalone client-side catalog fallback for clean CORS-free deployment
	return getMockWebcams()
}

function getMockWebcams(): WebcamEntity[] {
	const baseWebcams = [
		// Americas (12)
		{ id: "cam-1", name: "New York - Times Square Central", lat: 40.7580, lon: -73.9855, status: "healthy" as const, streamUrl: "https://images.webcams.travel/preview/1173873454.jpg" },
		{ id: "cam-2", name: "Los Angeles - Venice Beach Boardwalk", lat: 33.9850, lon: -118.4695, status: "healthy" as const, streamUrl: "https://images.webcams.travel/preview/1000283454.jpg" },
		{ id: "cam-3", name: "Chicago - Millennium Park Plaza", lat: 41.8827, lon: -87.6227, status: "healthy" as const, streamUrl: "https://images.webcams.travel/preview/1020283454.jpg" },
		{ id: "cam-4", name: "San Francisco - Golden Gate Bridge View", lat: 37.8199, lon: -122.4783, status: "healthy" as const, streamUrl: "https://images.webcams.travel/preview/1030283454.jpg" },
		{ id: "cam-5", name: "Miami - South Beach Ocean Drive", lat: 25.7781, lon: -80.1313, status: "healthy" as const, streamUrl: "https://images.webcams.travel/preview/1040283454.jpg" },
		{ id: "cam-6", name: "Toronto - CN Tower Summit Panorama", lat: 43.6426, lon: -79.3871, status: "healthy" as const, streamUrl: "https://images.webcams.travel/preview/1050283454.jpg" },
		{ id: "cam-7", name: "Vancouver - Stanley Park Seawall", lat: 49.3017, lon: -123.1417, status: "healthy" as const, streamUrl: "https://images.webcams.travel/preview/1060283454.jpg" },
		{ id: "cam-8", name: "Mexico City - Zocalo Plaza Central", lat: 19.4326, lon: -99.1332, status: "degraded" as const, streamUrl: "https://images.webcams.travel/preview/1070283454.jpg" },
		{ id: "cam-9", name: "Rio de Janeiro - Copacabana Beach Cam", lat: -22.9714, lon: -43.1824, status: "healthy" as const, streamUrl: "https://images.webcams.travel/preview/1080283454.jpg" },
		{ id: "cam-10", name: "Buenos Aires - Obelisco Intersection", lat: -34.6037, lon: -58.3816, status: "healthy" as const, streamUrl: "https://images.webcams.travel/preview/1090283454.jpg" },
		{ id: "cam-11", name: "Santiago - Plaza de Armas Central", lat: -33.4372, lon: -70.6506, status: "degraded" as const, streamUrl: "https://images.webcams.travel/preview/1100283454.jpg" },
		{ id: "cam-12", name: "Bogota - Bolivar Square Surveillance", lat: 4.5981, lon: -74.0760, status: "healthy" as const, streamUrl: "https://images.webcams.travel/preview/1110283454.jpg" },
		
		// Europe (13)
		{ id: "cam-13", name: "London - Piccadilly Circus Surveillance", lat: 51.5101, lon: -0.1349, status: "healthy" as const, streamUrl: "https://images.webcams.travel/preview/1402849021.jpg" },
		{ id: "cam-14", name: "Paris - Eiffel Tower Esplanade", lat: 48.8584, lon: 2.2945, status: "healthy" as const, streamUrl: "https://images.webcams.travel/preview/1130283454.jpg" },
		{ id: "cam-15", name: "Rome - Colosseum Security Camera", lat: 41.8902, lon: 12.4922, status: "degraded" as const, streamUrl: "https://images.webcams.travel/preview/1209348291.jpg" },
		{ id: "cam-16", name: "Venice - Rialto Bridge Live Stream", lat: 45.4380, lon: 12.3359, status: "healthy" as const, streamUrl: "https://images.webcams.travel/preview/1502948209.jpg" },
		{ id: "cam-17", name: "Berlin - Brandenburg Gate Sector", lat: 52.5163, lon: 13.3777, status: "healthy" as const, streamUrl: "https://images.webcams.travel/preview/1160283454.jpg" },
		{ id: "cam-18", name: "Madrid - Puerta del Sol Intersection", lat: 40.4168, lon: -3.7038, status: "healthy" as const, streamUrl: "https://images.webcams.travel/preview/1170283454.jpg" },
		{ id: "cam-19", name: "Amsterdam - Dam Square Public Monitor", lat: 52.3731, lon: 4.8926, status: "healthy" as const, streamUrl: "https://images.webcams.travel/preview/1180283454.jpg" },
		{ id: "cam-20", name: "Vienna - Stephansplatz Cathedral Plaza", lat: 48.2082, lon: 16.3738, status: "healthy" as const, streamUrl: "https://images.webcams.travel/preview/1190283454.jpg" },
		{ id: "cam-21", name: "Athens - Acropolis Ancient Panorama", lat: 37.9715, lon: 23.7257, status: "degraded" as const, streamUrl: "https://images.webcams.travel/preview/1200283454.jpg" },
		{ id: "cam-22", name: "Prague - Old Town Square Clock view", lat: 50.0875, lon: 14.4212, status: "healthy" as const, streamUrl: "https://images.webcams.travel/preview/1210283454.jpg" },
		{ id: "cam-23", name: "Reykjavik - Harpa Concert Hall Port", lat: 64.1504, lon: -21.9326, status: "healthy" as const, streamUrl: "https://images.webcams.travel/preview/1220283454.jpg" },
		{ id: "cam-24", name: "Oslo - Opera House Roof Viewpoint", lat: 59.9075, lon: 10.7531, status: "healthy" as const, streamUrl: "https://images.webcams.travel/preview/1230283454.jpg" },
		{ id: "cam-25", name: "Stockholm - Gamla Stan Royal Palace", lat: 59.3262, lon: 18.0722, status: "healthy" as const, streamUrl: "https://images.webcams.travel/preview/1240283454.jpg" },
		
		// Asia (13)
		{ id: "cam-26", name: "Tokyo - Shibuya Crossing Feed", lat: 35.6596, lon: 139.7018, status: "healthy" as const, streamUrl: "https://images.webcams.travel/preview/1301984218.jpg" },
		{ id: "cam-27", name: "Kyoto - Gion Traditional Street View", lat: 35.0037, lon: 135.7782, status: "healthy" as const, streamUrl: "https://images.webcams.travel/preview/1260283454.jpg" },
		{ id: "cam-28", name: "Seoul - Myeongdong Shopping District", lat: 37.5635, lon: 126.9845, status: "healthy" as const, streamUrl: "https://images.webcams.travel/preview/1270283454.jpg" },
		{ id: "cam-29", name: "Taipei - Taipei 101 Tower View", lat: 25.0338, lon: 121.5646, status: "healthy" as const, streamUrl: "https://images.webcams.travel/preview/1280283454.jpg" },
		{ id: "cam-30", name: "Hong Kong - Victoria Harbour Panorama", lat: 22.2855, lon: 114.1577, status: "healthy" as const, streamUrl: "https://images.webcams.travel/preview/1290283454.jpg" },
		{ id: "cam-31", name: "Singapore - Marina Bay Sands Skyline", lat: 1.2863, lon: 103.8598, status: "healthy" as const, streamUrl: "https://images.webcams.travel/preview/1300283454.jpg" },
		{ id: "cam-32", name: "Bangkok - Grand Palace Temple View", lat: 13.7500, lon: 100.4913, status: "degraded" as const, streamUrl: "https://images.webcams.travel/preview/1310283454.jpg" },
		{ id: "cam-33", name: "Mumbai - Gateway of India Landmark", lat: 18.9220, lon: 72.8347, status: "healthy" as const, streamUrl: "https://images.webcams.travel/preview/1320283454.jpg" },
		{ id: "cam-34", name: "Delhi - Connaught Place Circle", lat: 28.6304, lon: 77.2177, status: "healthy" as const, streamUrl: "https://images.webcams.travel/preview/1330283454.jpg" },
		{ id: "cam-35", name: "Shanghai - The Bund Waterfront Feed", lat: 31.2397, lon: 121.4897, status: "healthy" as const, streamUrl: "https://images.webcams.travel/preview/1340283454.jpg" },
		{ id: "cam-36", name: "Beijing - Tiananmen Square Security", lat: 39.9042, lon: 116.4074, status: "healthy" as const, streamUrl: "https://images.webcams.travel/preview/1350283454.jpg" },
		{ id: "cam-37", name: "Kuala Lumpur - Petronas Twin Towers", lat: 3.1578, lon: 101.7120, status: "healthy" as const, streamUrl: "https://images.webcams.travel/preview/1360283454.jpg" },
		{ id: "cam-38", name: "Bali - Ubud Sacred Forest Outskirts", lat: -8.5069, lon: 115.2625, status: "healthy" as const, streamUrl: "https://images.webcams.travel/preview/1370283454.jpg" },
		
		// Oceania (6)
		{ id: "cam-39", name: "Sydney - Opera House Harbor Front", lat: -33.8568, lon: 151.2153, status: "healthy" as const, streamUrl: "https://images.webcams.travel/preview/1380283454.jpg" },
		{ id: "cam-40", name: "Melbourne - Federation Square Hub", lat: -37.8180, lon: 144.9680, status: "healthy" as const, streamUrl: "https://images.webcams.travel/preview/1390283454.jpg" },
		{ id: "cam-41", name: "Auckland - Sky Tower Harbor view", lat: -36.8485, lon: 174.7633, status: "healthy" as const, streamUrl: "https://images.webcams.travel/preview/1400283454.jpg" },
		{ id: "cam-42", name: "Wellington - Queens Wharf Harbour", lat: -41.2865, lon: 174.7762, status: "healthy" as const, streamUrl: "https://images.webcams.travel/preview/1410283454.jpg" },
		{ id: "cam-43", name: "Fiji - Suva Kings Wharf Security", lat: -18.1248, lon: 178.4501, status: "degraded" as const, streamUrl: "https://images.webcams.travel/preview/1420283454.jpg" },
		{ id: "cam-44", name: "Hawaii - Waikiki Beach Surf Monitor", lat: 21.2765, lon: -157.8271, status: "healthy" as const, streamUrl: "https://images.webcams.travel/preview/1430283454.jpg" },
		
		// Africa (6)
		{ id: "cam-45", name: "Cairo - Pyramids of Giza Panorama", lat: 29.9792, lon: 31.1342, status: "healthy" as const, streamUrl: "https://images.webcams.travel/preview/1440283454.jpg" },
		{ id: "cam-46", name: "Cape Town - Table Mountain Base", lat: -33.9249, lon: 18.4241, status: "healthy" as const, streamUrl: "https://images.webcams.travel/preview/1450283454.jpg" },
		{ id: "cam-47", name: "Johannesburg - Nelson Mandela Square", lat: -26.1075, lon: 28.0531, status: "healthy" as const, streamUrl: "https://images.webcams.travel/preview/1460283454.jpg" },
		{ id: "cam-48", name: "Nairobi - Kenyatta Avenue Node", lat: -1.2864, lon: 36.8172, status: "degraded" as const, streamUrl: "https://images.webcams.travel/preview/1470283454.jpg" },
		{ id: "cam-49", name: "Marrakech - Jemaa el-Fnaa Bazaar", lat: 31.6258, lon: -7.9891, status: "healthy" as const, streamUrl: "https://images.webcams.travel/preview/1480283454.jpg" },
		{ id: "cam-50", name: "Lagos - Victoria Island Commerce View", lat: 6.4281, lon: 3.4219, status: "offline" as const, streamUrl: "https://images.webcams.travel/preview/1490283454.jpg" }
	]
	
	return baseWebcams.map((cam) => ({
		id: cam.id,
		coordinates: [cam.lon, cam.lat],
		domain: IntelligenceDomain.GEOPOLITICAL,
		timestamp: Date.now(),
		label: `CCTV: ${cam.name} [${cam.status.toUpperCase()}]`,
		streamUrl: cam.streamUrl,
		status: cam.status,
	}))
}
