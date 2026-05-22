/**
 * Client-side Day/Night Terminator polygon generator.
 * Computes a GeoJSON Polygon representing the night-side hemisphere of the Earth
 * for a given timestamp.
 */
export function getTerminatorPolygon(time: number = Date.now()): any {
  const date = new Date(time)

  // 1. Calculate Julian date
  const julianDate = date.getTime() / 86400000 + 2440587.5

  // 2. Calculate Julian centuries since J2000.0
  const t = (julianDate - 2451545.0) / 36525.0

  // 3. Solar declination (delta) in radians
  const meanAnomaly = (357.5291 + 35999.0503 * t) * (Math.PI / 180)
  const meanLongitude = (280.4665 + 36000.7698 * t) * (Math.PI / 180)
  const eclipticLongitude =
    meanLongitude +
    (1.9146 - 0.0047 * t) * Math.sin(meanAnomaly) * (Math.PI / 180) +
    0.02 * Math.sin(2 * meanAnomaly) * (Math.PI / 180)
  
  const obliquity = (23.439291 - 0.0130042 * t) * (Math.PI / 180)
  const declination = Math.asin(Math.sin(obliquity) * Math.sin(eclipticLongitude))

  // 4. Equation of time in minutes
  const y = Math.pow(Math.tan(obliquity / 2), 2)
  const equationOfTime =
    4 *
    (y * Math.sin(2 * meanLongitude) -
      2 * meanAnomaly * Math.sin(meanAnomaly) +
      4 * y * meanAnomaly * Math.sin(meanAnomaly) * Math.cos(2 * meanLongitude) -
      0.5 * Math.pow(y, 2) * Math.sin(4 * meanLongitude) -
      1.25 * Math.pow(meanAnomaly, 2) * Math.sin(2 * meanAnomaly)) *
    (180 / Math.PI)

  // 5. Subsolar point coordinate
  const subsolarLatitude = declination // in radians
  const subsolarLongitude =
    -((date.getUTCHours() * 60 + date.getUTCMinutes() + date.getUTCSeconds() / 60 + equationOfTime) / 4) *
    (Math.PI / 180) // in radians

  // 6. Generate terminator coordinates
  // The terminator is a great circle 90 degrees away from the subsolar point.
  // We'll compute 72 points around the circle.
  const coordinates: [number, number][] = []

  for (let i = 0; i <= 360; i += 5) {
    const angle = i * (Math.PI / 180)
    
    // Great circle calculation
    const lat = Math.asin(
      -Math.cos(subsolarLatitude) * Math.sin(angle)
    )
    
    let lng = subsolarLongitude + Math.atan2(
      Math.cos(angle),
      Math.sin(subsolarLatitude) * Math.sin(angle)
    )

    // Normalize longitude between -PI and +PI
    while (lng < -Math.PI) lng += 2 * Math.PI
    while (lng > Math.PI) lng -= 2 * Math.PI

    coordinates.push([lng * (180 / Math.PI), lat * (180 / Math.PI)])
  }

  // To draw a proper night-shadow polygon on a 2D Mercator projection,
  // we must wrap it around the poles depending on whether the subsolar latitude is positive or negative.
  const isNorthernSummer = subsolarLatitude > 0
  const poleLatitude = isNorthernSummer ? -90 : 90

  // Start wrapping points to enclose the dark hemisphere (pole direction)
  const polygonCoordinates: [number, number][] = [...coordinates]

  // Add wrapping coordinates to make sure the polygon renders correctly on flat map
  // Sort coordinates from West to East to make wrapping clean
  polygonCoordinates.sort((a, b) => a[0] - b[0])

  // Wrap around the pole
  polygonCoordinates.push([180, polygonCoordinates[polygonCoordinates.length - 1]![1]])
  polygonCoordinates.push([180, poleLatitude])
  polygonCoordinates.push([-180, poleLatitude])
  polygonCoordinates.push([-180, polygonCoordinates[0]![1]])
  polygonCoordinates.push([polygonCoordinates[0]![0], polygonCoordinates[0]![1]])

  return {
    type: 'Feature',
    properties: {
      id: 'terminator',
      name: 'Day/Night Terminator',
      timestamp: time,
    },
    geometry: {
      type: 'Polygon',
      coordinates: [polygonCoordinates],
    },
  }
}
