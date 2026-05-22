package config

import (
	"os"
	"strconv"

	"github.com/joho/godotenv"
)

type Config struct {
	DatabaseURL      string
	Port             string
	OpenSkyUsername  string
	OpenSkyPassword  string
	NasaFirmsKey     string
	GdeltQuery       string
	PruneIntervalMin int
}

func LoadConfig() (*Config, error) {
	// Try loading .env file if it exists, ignore error if missing
	_ = godotenv.Load()

	dbURL := os.Getenv("DATABASE_URL")
	if dbURL == "" {
		dbURL = "postgres://admin:secret_dev_password@localhost:5432/panopticon"
	}

	port := os.Getenv("PORT")
	if port == "" {
		port = "8080"
	}

	gdeltQuery := os.Getenv("GDELT_QUERY")
	if gdeltQuery == "" {
		gdeltQuery = "protest"
	}

	pruneMinStr := os.Getenv("PRUNE_INTERVAL_MIN")
	pruneInterval := 10
	if pruneMinStr != "" {
		if val, err := strconv.Atoi(pruneMinStr); err == nil {
			pruneInterval = val
		}
	}

	return &Config{
		DatabaseURL:      dbURL,
		Port:             port,
		OpenSkyUsername:  os.Getenv("OPENSKY_USERNAME"),
		OpenSkyPassword:  os.Getenv("OPENSKY_PASSWORD"),
		NasaFirmsKey:     os.Getenv("NASA_FIRMS_KEY"),
		GdeltQuery:       gdeltQuery,
		PruneIntervalMin: pruneInterval,
	}, nil
}
