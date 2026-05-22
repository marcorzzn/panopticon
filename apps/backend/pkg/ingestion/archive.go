package ingestion

import (
	"compress/gzip"
	"encoding/csv"
	"fmt"
	"io"
	"log"
	"os"
	"path/filepath"
	"strings"
	"sync"
	"time"

	"backend/pkg/models"
)

var (
	FlightArchiveChan = make(chan *models.AircraftState, 10000)
	FireArchiveChan   = make(chan *models.WildfireState, 5000)
	archiveWg         sync.WaitGroup
	stopChan          = make(chan struct{})
	archiveDir        = ""
)

// Initialize the directory path
func InitArchiveDir() {
	// Try standard locations
	paths := []string{
		"./data/archive",
		"../data/archive",
		"./apps/backend/data/archive",
	}

	for _, p := range paths {
		err := os.MkdirAll(p, 0755)
		if err == nil {
			archiveDir = p
			log.Printf("Cold Storage Telemetry Archiver: using active directory '%s'", archiveDir)
			return
		}
	}

	// Fallback to local execution directory
	archiveDir = "./data/archive"
	_ = os.MkdirAll(archiveDir, 0755)
	log.Printf("Cold Storage Telemetry Archiver: initialized fallback directory '%s'", archiveDir)
}

// Start the asynchronous archiving pipelines
func StartArchiver() {
	InitArchiveDir()
	archiveWg.Add(2)

	// Launch parallel file-append workers
	go runAircraftArchiveWorker()
	go runWildfireArchiveWorker()

	// Sweep older logs and compress them
	go SweepAndCompressArchives()
}

// Gracefully drain and stop archiver workers
func StopArchiver() {
	close(stopChan)
	archiveWg.Wait()
	log.Println("Cold Storage Telemetry Archiver successfully stopped.")
}

func runAircraftArchiveWorker() {
	defer archiveWg.Done()
	log.Println("Aviation Cold Storage Archiver thread initialized.")

	ticker := time.NewTicker(5 * time.Second)
	defer ticker.Stop()

	var batch []*models.AircraftState

	for {
		select {
		case <-stopChan:
			// Drain remaining queue
			for {
				select {
				case state := <-FlightArchiveChan:
					batch = append(batch, state)
				default:
					if len(batch) > 0 {
						flushAircraftBatch(batch)
					}
					return
				}
			}

		case state := <-FlightArchiveChan:
			batch = append(batch, state)
			if len(batch) >= 500 {
				flushAircraftBatch(batch)
				batch = nil
			}

		case <-ticker.C:
			if len(batch) > 0 {
				flushAircraftBatch(batch)
				batch = nil
			}
		}
	}
}

func runWildfireArchiveWorker() {
	defer archiveWg.Done()
	log.Println("Wildfire Cold Storage Archiver thread initialized.")

	ticker := time.NewTicker(5 * time.Second)
	defer ticker.Stop()

	var batch []*models.WildfireState

	for {
		select {
		case <-stopChan:
			// Drain remaining queue
			for {
				select {
				case state := <-FireArchiveChan:
					batch = append(batch, state)
				default:
					if len(batch) > 0 {
						flushWildfireBatch(batch)
					}
					return
				}
			}

		case state := <-FireArchiveChan:
			batch = append(batch, state)
			if len(batch) >= 200 {
				flushWildfireBatch(batch)
				batch = nil
			}

		case <-ticker.C:
			if len(batch) > 0 {
				flushWildfireBatch(batch)
				batch = nil
			}
		}
	}
}

func flushAircraftBatch(batch []*models.AircraftState) {
	// Group records by GMT date string to handle boundary crossings cleanly
	groups := make(map[string][]*models.AircraftState)
	for _, state := range batch {
		dateStr := state.UpdatedAt.UTC().Format("2006-01-02")
		groups[dateStr] = append(groups[dateStr], state)
	}

	for dateStr, records := range groups {
		filename := filepath.Join(archiveDir, fmt.Sprintf("aircraft_%s.csv", dateStr))
		
		// Check if file exists to write header
		fileExists := false
		if _, err := os.Stat(filename); err == nil {
			fileExists = true
		}

		file, err := os.OpenFile(filename, os.O_CREATE|os.O_WRONLY|os.O_APPEND, 0644)
		if err != nil {
			log.Printf("Archive aircraft error (failed to open %s): %v", filename, err)
			continue
		}

		writer := csv.NewWriter(file)
		if !fileExists {
			// Write header row
			_ = writer.Write([]string{"icao24", "callsign", "origin_country", "lat", "lon", "baro_altitude", "velocity", "true_track", "vertical_rate", "timestamp"})
		}

		for _, state := range records {
			_ = writer.Write([]string{
				state.Icao24,
				state.Callsign,
				state.OriginCountry,
				fmt.Sprintf("%.6f", state.Coordinates[1]), // Lat
				fmt.Sprintf("%.6f", state.Coordinates[0]), // Lon
				fmt.Sprintf("%.2f", state.BaroAltitude),
				fmt.Sprintf("%.2f", state.Velocity),
				fmt.Sprintf("%.2f", state.TrueTrack),
				fmt.Sprintf("%.2f", state.VerticalRate),
				fmt.Sprintf("%d", state.UpdatedAt.Unix()),
			})
		}

		writer.Flush()
		_ = file.Close()
	}
}

func flushWildfireBatch(batch []*models.WildfireState) {
	groups := make(map[string][]*models.WildfireState)
	for _, state := range batch {
		dateStr := state.UpdatedAt.UTC().Format("2006-01-02")
		groups[dateStr] = append(groups[dateStr], state)
	}

	for dateStr, records := range groups {
		filename := filepath.Join(archiveDir, fmt.Sprintf("wildfires_%s.csv", dateStr))
		
		fileExists := false
		if _, err := os.Stat(filename); err == nil {
			fileExists = true
		}

		file, err := os.OpenFile(filename, os.O_CREATE|os.O_WRONLY|os.O_APPEND, 0644)
		if err != nil {
			log.Printf("Archive wildfires error (failed to open %s): %v", filename, err)
			continue
		}

		writer := csv.NewWriter(file)
		if !fileExists {
			_ = writer.Write([]string{"id", "lat", "lon", "brightness", "confidence", "frp", "satellite", "timestamp"})
		}

		for _, state := range records {
			_ = writer.Write([]string{
				state.ID,
				fmt.Sprintf("%.6f", state.Coordinates[1]), // Lat
				fmt.Sprintf("%.6f", state.Coordinates[0]), // Lon
				fmt.Sprintf("%.2f", state.Brightness),
				state.Confidence,
				fmt.Sprintf("%.2f", state.Frp),
				state.Satellite,
				fmt.Sprintf("%d", state.UpdatedAt.Unix()),
			})
		}

		writer.Flush()
		_ = file.Close()
	}
}

// Daily cleanup sweeper compressing old logs to .csv.gz
func SweepAndCompressArchives() {
	if archiveDir == "" {
		return
	}
	
	log.Println("Cold Storage Sweep: Searching for uncompressed telemetry logs...")
	files, err := os.ReadDir(archiveDir)
	if err != nil {
		log.Printf("Cold Storage Sweep error (read directory failed): %v", err)
		return
	}

	todayStr := time.Now().UTC().Format("2006-01-02")
	compressedCount := 0

	for _, f := range files {
		if f.IsDir() {
			continue
		}

		name := f.Name()
		if !strings.HasSuffix(name, ".csv") {
			continue
		}

		// Prevent compressing today's active logging file
		if strings.Contains(name, todayStr) {
			continue
		}

		// Proceed to compress older log
		fullPath := filepath.Join(archiveDir, name)
		if err := compressFile(fullPath); err != nil {
			log.Printf("Failed to compress historical log '%s': %v", name, err)
		} else {
			// Successfully compressed, delete original raw CSV
			_ = os.Remove(fullPath)
			compressedCount++
		}
	}

	if compressedCount > 0 {
		log.Printf("Cold Storage Sweep complete: packaged %d historical telemetry archives to GZIP format", compressedCount)
	}
}

func compressFile(srcPath string) error {
	srcFile, err := os.Open(srcPath)
	if err != nil {
		return err
	}
	defer srcFile.Close()

	destPath := srcPath + ".gz"
	destFile, err := os.Create(destPath)
	if err != nil {
		return err
	}
	defer destFile.Close()

	gzipWriter := gzip.NewWriter(destFile)
	defer gzipWriter.Close()

	_, err = io.Copy(gzipWriter, srcFile)
	return err
}
