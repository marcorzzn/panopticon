package db

import (
	"context"
	"log"
	"time"

	"github.com/jackc/pgx/v5/pgxpool"
)

func RunMigrations(pool *pgxpool.Pool) error {
	ctx, cancel := context.WithTimeout(context.Background(), 30*time.Second)
	defer cancel()

	log.Println("Running database migrations...")

	// 1. Enable PostGIS Extension
	_, err := pool.Exec(ctx, "CREATE EXTENSION IF NOT EXISTS postgis;")
	if err != nil {
		log.Printf("Warning: Failed to enable PostGIS extension (may already be enabled or missing permission): %v", err)
	}

	// 2. Data Sources Health Table
	_, err = pool.Exec(ctx, `
		CREATE TABLE IF NOT EXISTS data_sources (
			id VARCHAR(50) PRIMARY KEY,
			name VARCHAR(100) NOT NULL,
			status VARCHAR(20) NOT NULL,
			last_success_at TIMESTAMPTZ,
			last_error_at TIMESTAMPTZ,
			last_error TEXT,
			consecutive_failures INT DEFAULT 0,
			avg_response_ms INT DEFAULT 0
		);
	`)
	if err != nil {
		return err
	}

	// 3. Earthquakes Table
	_, err = pool.Exec(ctx, `
		CREATE TABLE IF NOT EXISTS earthquakes (
			id VARCHAR(50) PRIMARY KEY,
			magnitude NUMERIC(3,1) NOT NULL,
			place TEXT NOT NULL,
			time TIMESTAMPTZ NOT NULL,
			coordinates GEOMETRY(Point, 4326) NOT NULL,
			depth NUMERIC(6,2) NOT NULL,
			severity VARCHAR(20) NOT NULL,
			label TEXT NOT NULL,
			created_at TIMESTAMPTZ DEFAULT NOW()
		);
		CREATE INDEX IF NOT EXISTS idx_eq_geom ON earthquakes USING GIST(coordinates);
		CREATE INDEX IF NOT EXISTS idx_eq_time ON earthquakes(time DESC);
	`)
	if err != nil {
		return err
	}

	// 4. GDELT Geopolitical Events Table
	_, err = pool.Exec(ctx, `
		CREATE TABLE IF NOT EXISTS gdelt_events (
			id VARCHAR(50) PRIMARY KEY,
			label TEXT NOT NULL,
			actor1 VARCHAR(100),
			actor2 VARCHAR(100),
			goldstein_scale NUMERIC(4,1) NOT NULL,
			avg_tone NUMERIC(4,2) NOT NULL,
			coordinates GEOMETRY(Point, 4326) NOT NULL,
			source_url TEXT,
			time TIMESTAMPTZ NOT NULL,
			created_at TIMESTAMPTZ DEFAULT NOW()
		);
		CREATE INDEX IF NOT EXISTS idx_gdelt_geom ON gdelt_events USING GIST(coordinates);
		CREATE INDEX IF NOT EXISTS idx_gdelt_time ON gdelt_events(time DESC);
	`)
	if err != nil {
		return err
	}

	// 5. Aircraft Live Telemetry Table (ON CONFLICT Upsert)
	_, err = pool.Exec(ctx, `
		CREATE TABLE IF NOT EXISTS aircraft (
			icao24 VARCHAR(10) PRIMARY KEY,
			callsign VARCHAR(20),
			origin_country VARCHAR(100),
			time_position TIMESTAMPTZ,
			coordinates GEOMETRY(Point, 4326) NOT NULL,
			baro_altitude NUMERIC(8,2),
			velocity NUMERIC(6,2),
			true_track NUMERIC(5,2),
			vertical_rate NUMERIC(6,2),
			updated_at TIMESTAMPTZ NOT NULL
		);
		CREATE INDEX IF NOT EXISTS idx_air_geom ON aircraft USING GIST(coordinates);
		CREATE INDEX IF NOT EXISTS idx_air_updated ON aircraft(updated_at DESC);
	`)
	if err != nil {
		return err
	}

	// 6. Active Wildfires Table (ON CONFLICT Upsert)
	_, err = pool.Exec(ctx, `
		CREATE TABLE IF NOT EXISTS wildfires (
			id VARCHAR(100) PRIMARY KEY,
			coordinates GEOMETRY(Point, 4326) NOT NULL,
			brightness NUMERIC(6,2),
			confidence VARCHAR(20),
			frp NUMERIC(8,2),
			satellite VARCHAR(20),
			acq_time TIMESTAMPTZ NOT NULL,
			updated_at TIMESTAMPTZ NOT NULL
		);
		CREATE INDEX IF NOT EXISTS idx_fire_geom ON wildfires USING GIST(coordinates);
		CREATE INDEX IF NOT EXISTS idx_fire_updated ON wildfires(updated_at DESC);
	`)
	if err != nil {
		return err
	}

	// 7. Air Quality Table (OpenAQ, ON CONFLICT Upsert)
	_, err = pool.Exec(ctx, `
		CREATE TABLE IF NOT EXISTS air_quality (
			id VARCHAR(100) PRIMARY KEY,
			location VARCHAR(150) NOT NULL,
			parameter VARCHAR(50) NOT NULL,
			value NUMERIC(8,2) NOT NULL,
			unit VARCHAR(20) NOT NULL,
			coordinates GEOMETRY(Point, 4326) NOT NULL,
			last_updated TIMESTAMPTZ NOT NULL,
			created_at TIMESTAMPTZ DEFAULT NOW()
		);
		CREATE INDEX IF NOT EXISTS idx_aq_geom ON air_quality USING GIST(coordinates);
		CREATE INDEX IF NOT EXISTS idx_aq_updated ON air_quality(last_updated DESC);
	`)
	if err != nil {
		return err
	}

	// 8. ACLED Conflict Events Table (ON CONFLICT Upsert)
	_, err = pool.Exec(ctx, `
		CREATE TABLE IF NOT EXISTS acled_events (
			id VARCHAR(50) PRIMARY KEY,
			event_date TIMESTAMPTZ NOT NULL,
			event_type VARCHAR(100) NOT NULL,
			sub_event_type VARCHAR(100),
			actor1 VARCHAR(150),
			actor2 VARCHAR(150),
			country VARCHAR(100) NOT NULL,
			location VARCHAR(150),
			coordinates GEOMETRY(Point, 4326) NOT NULL,
			fatalities INT DEFAULT 0,
			notes TEXT,
			source VARCHAR(150),
			created_at TIMESTAMPTZ DEFAULT NOW()
		);
		CREATE INDEX IF NOT EXISTS idx_acled_geom ON acled_events USING GIST(coordinates);
		CREATE INDEX IF NOT EXISTS idx_acled_time ON acled_events(event_date DESC);
	`)
	if err != nil {
		return err
	}

	// 9. Webcams & CCTV Feeds Table
	_, err = pool.Exec(ctx, `
		CREATE TABLE IF NOT EXISTS webcams (
			id VARCHAR(100) PRIMARY KEY,
			name VARCHAR(150) NOT NULL,
			coordinates GEOMETRY(Point, 4326) NOT NULL,
			stream_url VARCHAR(255) NOT NULL,
			status VARCHAR(20) DEFAULT 'healthy',
			created_at TIMESTAMPTZ DEFAULT NOW()
		);
		CREATE INDEX IF NOT EXISTS idx_webcams_geom ON webcams USING GIST(coordinates);
	`)
	if err != nil {
		return err
	}

	// 10. OSINT Recon Scans Table
	_, err = pool.Exec(ctx, `
		CREATE TABLE IF NOT EXISTS recon_scans (
			id VARCHAR(100) PRIMARY KEY,
			target VARCHAR(150) NOT NULL,
			resolved_ip VARCHAR(50) NOT NULL,
			country VARCHAR(100) NOT NULL,
			coordinates GEOMETRY(Point, 4326) NOT NULL,
			threat_score INT DEFAULT 0,
			open_ports INT[] DEFAULT '{}',
			dns_records JSONB DEFAULT '{}',
			scan_date TIMESTAMPTZ DEFAULT NOW()
		);
		CREATE INDEX IF NOT EXISTS idx_recon_geom ON recon_scans USING GIST(coordinates);
	`)
	if err != nil {
		return err
	}

	// 11. Space & Orbital Satellites Table
	_, err = pool.Exec(ctx, `
		CREATE TABLE IF NOT EXISTS satellites (
			id VARCHAR(100) PRIMARY KEY,
			name VARCHAR(150) NOT NULL,
			norad_id INT NOT NULL UNIQUE,
			satellite_type VARCHAR(50) NOT NULL,
			coordinates GEOMETRY(Point, 4326) NOT NULL,
			altitude_km NUMERIC(8,2) NOT NULL,
			inclination NUMERIC(5,2) NOT NULL,
			velocity_kms NUMERIC(6,3) NOT NULL,
			tle_line1 VARCHAR(100) NOT NULL,
			tle_line2 VARCHAR(100) NOT NULL,
			updated_at TIMESTAMPTZ NOT NULL
		);
		CREATE INDEX IF NOT EXISTS idx_satellites_geom ON satellites USING GIST(coordinates);
	`)
	if err != nil {
		return err
	}

	log.Println("Database migrations executed successfully")
	return nil
}

