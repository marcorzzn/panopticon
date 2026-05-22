package ingestion

import (
	"context"
	"log"
	"math"
	"time"

	"backend/pkg/db"
)

type SimSatellite struct {
	ID          string
	Name        string
	NoradID     int
	Type        string
	Inclination float64 // degrees
	AltitudeKM  float64 // km
	VelocityKMS float64 // km/s
	StartLon    float64 // degrees
	PhaseOffset float64 // radians
	PeriodMin   float64 // minutes
	TleLine1    string
	TleLine2    string
}

// 12 curated active and debris satellites with authentic characteristics
var simSatellites = []SimSatellite{
	{
		ID:          "iss",
		Name:        "ISS (Zarya)",
		NoradID:     25544,
		Type:        "telecom",
		Inclination: 51.64,
		AltitudeKM:  421.25,
		VelocityKMS: 7.660,
		StartLon:    -120.0,
		PhaseOffset: 0.0,
		PeriodMin:   92.8,
		TleLine1:    "1 25544U 98067A   26142.56209539  .00014324  00000-0  25574-3 0  9997",
		TleLine2:    "2 25544  51.6418 142.3245 0005432  64.3218 295.8924 15.49830214569342",
	},
	{
		ID:          "usa-224",
		Name:        "USA-224 (KH-11 Spy)",
		NoradID:     37348,
		Type:        "recon",
		Inclination: 97.40,
		AltitudeKM:  285.50,
		VelocityKMS: 7.790,
		StartLon:    45.0,
		PhaseOffset: 1.2,
		PeriodMin:   90.2,
		TleLine1:    "1 37348U 11002A   26142.11029482  .00021940  00000-0  18234-4 0  9995",
		TleLine2:    "2 37348  97.4012  85.2018 0002845  42.1892 318.4902 15.96420185792341",
	},
	{
		ID:          "usa-245",
		Name:        "USA-245 (KH-11 Spy)",
		NoradID:     40964,
		Type:        "recon",
		Inclination: 97.80,
		AltitudeKM:  392.40,
		VelocityKMS: 7.680,
		StartLon:    -75.0,
		PhaseOffset: 2.5,
		PeriodMin:   92.4,
		TleLine1:    "1 40964U 15045A   26142.38920194  .00009210  00000-0  10492-4 0  9991",
		TleLine2:    "2 40964  97.8045 210.4839 0003102 120.4832 240.5902 15.58910482934211",
	},
	{
		ID:          "hubble",
		Name:        "Hubble Space Telescope",
		NoradID:     20580,
		Type:        "telecom",
		Inclination: 28.47,
		AltitudeKM:  540.20,
		VelocityKMS: 7.590,
		StartLon:    10.0,
		PhaseOffset: 0.8,
		PeriodMin:   95.4,
		TleLine1:    "1 20580U 90037B   26142.45920392  .00001048  00000-0  12485-5 0  9998",
		TleLine2:    "2 20580  28.4682 342.1849 0007234  90.4829 270.4820 15.09420849204839",
	},
	{
		ID:          "starlink-3045",
		Name:        "Starlink-3045 (Telecom)",
		NoradID:     51000,
		Type:        "telecom",
		Inclination: 53.21,
		AltitudeKM:  550.00,
		VelocityKMS: 7.580,
		StartLon:    160.0,
		PhaseOffset: 3.1,
		PeriodMin:   95.6,
		TleLine1:    "1 51000U 22005A   26142.19028492  .00001248  00000-0  59204-5 0  9992",
		TleLine2:    "2 51000  53.2145 198.4829 0001492  35.4892 324.9012 15.06421890284920",
	},
	{
		ID:          "starlink-3046",
		Name:        "Starlink-3046 (Telecom)",
		NoradID:     51001,
		Type:        "telecom",
		Inclination: 53.21,
		AltitudeKM:  550.00,
		VelocityKMS: 7.580,
		StartLon:    140.0,
		PhaseOffset: 4.5,
		PeriodMin:   95.6,
		TleLine1:    "1 51001U 22005B   26142.19128402  .00001250  00000-0  59210-5 0  9993",
		TleLine2:    "2 51001  53.2148 178.4890 0001490  45.4829 314.9018 15.06421891029482",
	},
	{
		ID:          "noaa-20",
		Name:        "NOAA-20 (Weather)",
		NoradID:     43013,
		Type:        "recon",
		Inclination: 98.70,
		AltitudeKM:  824.10,
		VelocityKMS: 7.440,
		StartLon:    -30.0,
		PhaseOffset: 0.5,
		PeriodMin:   101.4,
		TleLine1:    "1 43013U 17073A   26142.20184920  .00000084  00000-0  21094-5 0  9996",
		TleLine2:    "2 43013  98.7012 312.4829 0001489  74.2048 285.9018 14.19830294820194",
	},
	{
		ID:          "sentinel-1a",
		Name:        "Sentinel-1A (Radar)",
		NoradID:     39634,
		Type:        "recon",
		Inclination: 98.18,
		AltitudeKM:  693.00,
		VelocityKMS: 7.500,
		StartLon:    90.0,
		PhaseOffset: 5.2,
		PeriodMin:   98.6,
		TleLine1:    "1 39634U 14016A   26142.10284920  .00000120  00000-0  34902-5 0  9994",
		TleLine2:    "2 39634  98.1823  42.1890 0001280  98.2045 261.9023 14.59830198402948",
	},
	{
		ID:          "envisat",
		Name:        "Envisat Space Debris",
		NoradID:     27386,
		Type:        "debris",
		Inclination: 98.54,
		AltitudeKM:  762.30,
		VelocityKMS: 7.470,
		StartLon:    110.0,
		PhaseOffset: 3.8,
		PeriodMin:   100.1,
		TleLine1:    "1 27386U 02009A   26142.48291048  -.00000012 00000-0  00000-0 0  9999",
		TleLine2:    "2 27386  98.5402 120.4839 0001184 140.2948 220.1948 14.38290185930284",
	},
	{
		ID:          "sl-12-rb",
		Name:        "SL-12 R/B (Soviet Debris)",
		NoradID:     22234,
		Type:        "debris",
		Inclination: 64.80,
		AltitudeKM:  1192.40,
		VelocityKMS: 7.250,
		StartLon:    -10.0,
		PhaseOffset: 1.8,
		PeriodMin:   109.3,
		TleLine1:    "1 22234U 92080B   26142.50291849  .00000210  00000-0  59234-4 0  9990",
		TleLine2:    "2 22234  64.8012 284.1849 0008294 180.2045 180.1940 13.16920194820194",
	},
	{
		ID:          "cosmos-2251-deb",
		Name:        "COSMOS 2251 Debris",
		NoradID:     35000,
		Type:        "debris",
		Inclination: 74.00,
		AltitudeKM:  780.00,
		VelocityKMS: 7.460,
		StartLon:    30.0,
		PhaseOffset: 2.1,
		PeriodMin:   100.5,
		TleLine1:    "1 35000U 93036AP  26142.30294820  .00004928  00000-0  48293-4 0  9992",
		TleLine2:    "2 35000  74.0018 190.2849 0003892  95.4892 265.4890 14.32980194820492",
	},
	{
		ID:          "iridium-33-deb",
		Name:        "Iridium 33 Debris",
		NoradID:     36000,
		Type:        "debris",
		Inclination: 86.40,
		AltitudeKM:  770.00,
		VelocityKMS: 7.460,
		StartLon:    -160.0,
		PhaseOffset: 4.8,
		PeriodMin:   100.2,
		TleLine1:    "1 36000U 97051AL  26142.31294820  .00003920  00000-0  38294-4 0  9993",
		TleLine2:    "2 36000  86.4012  45.2890 0003490  85.4892 275.4890 14.36420194820938",
	},
}

// Supervisor loop to seed and propagate orbits continuously
func (m *Manager) runSpacePoller() {
	// Seed active satellite nodes
	m.seedSatellites()

	ticker := time.NewTicker(2 * time.Second)
	defer ticker.Stop()

	log.Println("Space & Orbital Intelligence propagator daemon running (Ticker: 2s)")

	for {
		select {
		case <-m.ctx.Done():
			return
		case <-ticker.C:
			m.propagateOrbits()
		}
	}
}

func (m *Manager) seedSatellites() {
	ctx := context.Background()
	insertedCount := 0

	for _, sat := range simSatellites {
		// Insert initial dummy coordinates [0, 0] — will be updated by propagator
		_, err := db.Pool.Exec(ctx, `
			INSERT INTO satellites (id, name, norad_id, satellite_type, coordinates, altitude_km, inclination, velocity_kms, tle_line1, tle_line2, updated_at)
			VALUES ($1, $2, $3, $4, ST_SetSRID(ST_MakePoint($5, $6), 4326), $7, $8, $9, $10, $11, NOW())
			ON CONFLICT (id) DO NOTHING;
		`, sat.ID, sat.Name, sat.NoradID, sat.Type, sat.StartLon, 0.0, sat.AltitudeKM, sat.Inclination, sat.VelocityKMS, sat.TleLine1, sat.TleLine2)
		if err != nil {
			log.Printf("Failed to seed satellite %s: %v", sat.ID, err)
			continue
		}
		insertedCount++
	}

	if insertedCount > 0 {
		log.Printf("Space Seeder: Initialized %d orbital tracking assets in PostGIS", insertedCount)
	}
}

func (m *Manager) propagateOrbits() {
	ctx := context.Background()
	now := time.Now().Unix()
	nowFloat := float64(now)
	updatedCount := 0

	earthRotationSpeed := 360.0 / 86400.0 // Earth rotates 360 deg in 24h (deg/sec)

	for _, sat := range simSatellites {
		// 1. Calculate ground track positions
		// Period in seconds
		periodSec := sat.PeriodMin * 60.0
		angularSpeed := (2.0 * math.Pi) / periodSec

		// Mean anomaly
		meanAnomaly := (angularSpeed * nowFloat) + sat.PhaseOffset

		// Latitude: sinusoidal oscillation between [-inclination, inclination]
		latRad := (sat.Inclination * math.Pi / 180.0) * math.Sin(meanAnomaly)
		lat := latRad * 180.0 / math.Pi

		// Longitude: StartLon + orbital longitude shift - Earth's eastward rotation
		// Satellite orbits eastward or westward. Polar and prograde orbits.
		orbitalSpeedDegSec := 360.0 / periodSec
		// Starlink/ISS is prograde, polar is slightly retrograde
		dirMultiplier := 1.0
		if sat.Inclination > 90.0 {
			dirMultiplier = -1.0
		}

		lonShift := dirMultiplier * orbitalSpeedDegSec * nowFloat
		earthRotationShift := earthRotationSpeed * nowFloat

		lon := sat.StartLon + lonShift - earthRotationShift

		// Clamp longitude to [-180, 180]
		lon = math.Mod(lon, 360.0)
		if lon > 180.0 {
			lon -= 360.0
		} else if lon < -180.0 {
			lon += 360.0
		}

		// 2. Altitude eccentricity simulation (slight oscillation +/- 5 km)
		altOscillation := 5.0 * math.Cos(meanAnomaly*2.0)
		currentAlt := sat.AltitudeKM + altOscillation

		// 3. Speed variation according to altitude
		// speed varies slightly depending on perigee/apogee
		currentSpeed := sat.VelocityKMS * (1.0 - 0.005*math.Cos(meanAnomaly*2.0))

		// 4. Save to PostGIS
		_, err := db.Pool.Exec(ctx, `
			UPDATE satellites SET
				coordinates = ST_SetSRID(ST_MakePoint($2, $3), 4326),
				altitude_km = $4,
				velocity_kms = $5,
				updated_at = NOW()
			WHERE id = $1;
		`, sat.ID, lon, lat, currentAlt, currentSpeed)
		if err != nil {
			log.Printf("Failed to propagate orbit for %s: %v", sat.ID, err)
			continue
		}
		updatedCount++
	}

	// Quiet down the console log to avoid massive spam, but keep a rolling status indicator
	if now%60 == 0 {
		log.Printf("Space Tracking Propagator: propagated ground tracks for %d active satellites", updatedCount)
	}
}
