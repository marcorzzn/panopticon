package api

import (
	"net/http"

	"github.com/go-chi/chi/v5"
	"github.com/go-chi/chi/v5/middleware"
)

func SetupRouter() *chi.Mux {
	r := chi.NewRouter()

	// 1. Standard middlewares
	r.Use(middleware.Logger)
	r.Use(middleware.Recoverer)
	r.Use(middleware.Compress(5)) // Gzip compression level 5
	r.Use(CorsMiddleware)

	// 2. C2 Situational Telemetry endpoints
	r.Route("/api/v1", func(r chi.Router) {
		r.Get("/sources", GetSourcesHandler)
		r.Get("/earthquakes", GetEarthquakesHandler)
		r.Get("/gdelt", GetGdeltEventsHandler)
		
		// Highly optimized flat telemetry streams
		r.Get("/aviation/states", GetAviationStatesHandler)
		r.Get("/environmental/wildfires", GetWildfiresHandler)
		r.Get("/environmental/airquality", GetAirQualityHandler)
		r.Get("/geopolitical/acled", GetAcledEventsHandler)
		
		// New OSINT endpoints
		r.Post("/ingest/bulk", BulkIngestHandler)
		r.Get("/events/correlation", GetEventCorrelationHandler)
		r.Get("/webcams/proxy", WebcamProxyHandler)
		r.Get("/telemetry/live", GetLiveTelemetryHandler)
		r.Get("/transit/congestion", GetCongestionGridHandler)
		
		// Webcam and Recon network layers
		r.Get("/webcams", GetWebcamsHandler)
		r.Get("/recon/trace", GetReconTraceHandler)
		r.Get("/space/satellites", GetSatellitesHandler)
		
		// Historical range search query
		r.Get("/historical", GetHistoricalHandler)
	})

	return r
}

func CorsMiddleware(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Access-Control-Allow-Origin", "*")
		w.Header().Set("Access-Control-Allow-Methods", "GET, POST, OPTIONS, PUT, DELETE")
		w.Header().Set("Access-Control-Allow-Headers", "Content-Type, Authorization")
		
		if r.Method == "OPTIONS" {
			w.WriteHeader(http.StatusOK)
			return
		}
		
		next.ServeHTTP(w, r)
	})
}
