package main

import (
	"context"
	"errors"
	"log"
	"net/http"
	"os"
	"os/signal"
	"syscall"
	"time"

	"backend/pkg/api"
	"backend/pkg/config"
	"backend/pkg/db"
	"backend/pkg/ingestion"
)

func main() {
	log.Println("Initializing PANOPTICON Global Situational Awareness Backend (v1.0)...")

	// 1. Load Configurations
	cfg, err := config.LoadConfig()
	if err != nil {
		log.Fatalf("Critical configuration load error: %v", err)
	}

	// 2. Initialize PostgreSQL/PostGIS connection pool
	pool, err := db.Connect(cfg.DatabaseURL)
	if err != nil {
		log.Fatalf("Critical database connection error: %v", err)
	}
	defer db.Close()

	// 3. Auto Run Migrations (bootstrap tables & indexes)
	if err := db.RunMigrations(pool); err != nil {
		log.Fatalf("Database migrations failed: %v", err)
	}

	// 4. Initialize and start C2 Ingestion manager threads
	manager := ingestion.NewManager(cfg)
	manager.Start()
	defer manager.Stop()

	// 5. Setup Chi API Router and Server
	router := api.SetupRouter()
	server := &http.Server{
		Addr:         ":" + cfg.Port,
		Handler:      router,
		ReadTimeout:  15 * time.Second,
		WriteTimeout: 15 * time.Second,
		IdleTimeout:  60 * time.Second,
	}

	// 6. Graceful Shutdown orchestration
	shutdownError := make(chan error)
	go func() {
		quit := make(chan os.Signal, 1)
		signal.Notify(quit, syscall.SIGINT, syscall.SIGTERM)
		s := <-quit
		log.Printf("C2 Shutdown signal detected: %s. Engaging graceful release...", s.String())

		// Allow 10 seconds for active connections to drain
		ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
		defer cancel()

		shutdownError <- server.Shutdown(ctx)
	}()

	log.Printf("Situation Room API server fully listening on port %s", cfg.Port)
	if err := server.ListenAndServe(); err != nil && !errors.Is(err, http.ErrServerClosed) {
		log.Fatalf("API Server crash: %v", err)
	}

	// Wait for shutdown signal sequence to complete
	if err := <-shutdownError; err != nil {
		log.Printf("Server shutdown encountered an error: %v", err)
	}

	log.Println("Panopticon Backend successfully shut down.")
}
