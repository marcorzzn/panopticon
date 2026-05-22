package ingestion

import (
	"context"
	"crypto/md5"
	"encoding/binary"
	"fmt"
	"math/rand"
	"net"
	"time"

	"backend/pkg/db"
	"backend/pkg/models"
)

// London Command Center HQ Coordinates
const (
	LondonLat = 51.5074
	LondonLon = -0.1278
)

// Generate consistent pseudo-random numbers based on target string
func seedFromString(s string) int64 {
	h := md5.Sum([]byte(s))
	return int64(binary.BigEndian.Uint64(h[0:8]))
}

// Generate a random IP address
func generateRandomIP(rng *rand.Rand) string {
	return fmt.Sprintf("%d.%d.%d.%d", 100+rng.Intn(120), rng.Intn(256), rng.Intn(256), rng.Intn(256))
}

// RunReconScan performs the OSINT/RECON traceroute, computing trigonometric intermediate
// hops with vector noise offsets from London HQ to the target.
func RunReconScan(target string, destLat, destLon float64) (*models.ReconScan, [][]interface{}, error) {
	// Seed generator using target to get stable results for the same target
	seed := seedFromString(target + fmt.Sprintf("%.4f,%.4f", destLat, destLon))
	rng := rand.New(rand.NewSource(seed))

	// Resolve a simulated IP
	resolvedIP := generateRandomIP(rng)

	// Number of hops
	numHops := 8 + rng.Intn(6) // 8 to 13 hops
	if numHops < 5 {
		numHops = 5
	}

	hops := make([][]interface{}, 0, numHops)
	
	// Determine country
	country := "Unknown"
	countries := []string{"United States", "Japan", "Germany", "United Kingdom", "Singapore", "Brazil", "South Africa", "France", "Venezuela", "Ukraine"}
	if destLat != 0 && destLon != 0 {
		country = countries[rng.Intn(len(countries))]
	}

	// Threat score (Gold-scale threat speedometer)
	threatScore := 10 + rng.Intn(81) // 10 to 90

	// Open ports
	allPorts := []int{21, 22, 23, 25, 53, 80, 110, 143, 443, 445, 993, 995, 3306, 3389, 5432, 8080, 8443}
	openPorts := []int{}
	numPorts := rng.Intn(5) // 0 to 4 open ports
	portIndices := rng.Perm(len(allPorts))
	for i := 0; i < numPorts; i++ {
		openPorts = append(openPorts, allPorts[portIndices[i]])
	}

	// DNS Records
	dnsRecords := map[string]interface{}{
		"a":     []string{resolvedIP},
		"mx":    []string{fmt.Sprintf("mail.%s. 10", target)},
		"txt":   []string{"v=spf1 include:_spf.google.com ~all"},
		"ns":    []string{"ns1.dnsdomain.com", "ns2.dnsdomain.com"},
		"cname": []string{fmt.Sprintf("web.%s", target)},
	}

	// Calculate hop coordinates with trigonometric noise offsets
	accumulatedPing := 1.2
	
	transitISPs := []string{
		"London LINX Core",
		"BT Telecom Backbone",
		"Level 3 Communications",
		"GTT Communications Backbone",
		"CenturyLink Transit",
		"Telia Carrier Edge",
		"Tata Communications Core",
		"Hurricane Electric Transit",
		"NTT Communications Edge",
	}

	for i := 1; i <= numHops; i++ {
		fraction := float64(i) / float64(numHops)
		
		var hopLat, hopLon float64
		var hopIP string
		var hopISP string

		if i == 1 {
			// First hop: local network
			hopLat = LondonLat
			hopLon = LondonLon
			hopIP = "192.168.1.1"
			hopISP = "Internal LAN Gateway"
			accumulatedPing = 0.5 + rng.Float64()*0.8
		} else if i == 2 {
			// Second hop: Local ISP gateway
			offsetScale := 0.02
			hopLat = LondonLat + (rng.Float64()-0.5)*offsetScale
			hopLon = LondonLon + (rng.Float64()-0.5)*offsetScale
			hopIP = fmt.Sprintf("10.%d.%d.1", 10+rng.Intn(40), rng.Intn(256))
			hopISP = "London Metropolitan Area Net"
			accumulatedPing += 1.5 + rng.Float64()*2.0
		} else if i == numHops {
			// Final hop: destination target
			hopLat = destLat
			hopLon = destLon
			hopIP = resolvedIP
			hopISP = fmt.Sprintf("%s Hosting Provider", country)
			
			// Distance based ping estimation
			distScale := 50.0 // base
			if destLat != 0 && destLon != 0 {
				// Rough distance proxy
				dLat := destLat - LondonLat
				dLon := destLon - LondonLon
				distProxy := dLat*dLat + dLon*dLon
				distScale = 10.0 + distProxy*1.5
			}
			accumulatedPing += distScale + rng.Float64()*10.0
		} else {
			// Intermediate hops with vector noise offsets
			hopLat = LondonLat + fraction*(destLat-LondonLat)
			hopLon = LondonLon + fraction*(destLon-LondonLon)
			
			// Noise peaks in the middle and decreases at endpoints
			offsetScale := 0.25 * (1.0 - fraction) * fraction
			// Convert to degrees (1 degree ~ 111km)
			hopLat += (rng.Float64() - 0.5) * offsetScale * 15.0
			hopLon += (rng.Float64() - 0.5) * offsetScale * 15.0
			
			hopIP = fmt.Sprintf("%d.%d.%d.%d", 80+rng.Intn(110), 10+rng.Intn(200), rng.Intn(256), rng.Intn(256))
			hopISP = transitISPs[rng.Intn(len(transitISPs))]
			
			accumulatedPing += 5.0 + rng.Float64()*15.0
		}

		// Row fields: ["hop_number", "ip", "lat", "lon", "ping_ms", "isp"]
		hops = append(hops, []interface{}{
			i,
			hopIP,
			hopLat,
			hopLon,
			float64(int(accumulatedPing*10)) / 10.0, // round to 1 decimal place
			hopISP,
		})
	}

	// Save scan metadata in DB for recon audit and visualization
	scanID := fmt.Sprintf("scan-%s", target)
	ctx := context.Background()

	_, err := db.Pool.Exec(ctx, `
		INSERT INTO recon_scans (id, target, resolved_ip, country, coordinates, threat_score, open_ports, dns_records, scan_date)
		VALUES ($1, $2, $3, $4, ST_SetSRID(ST_MakePoint($5, $6), 4326), $7, $8, $9, NOW())
		ON CONFLICT (id) DO UPDATE SET
			resolved_ip = EXCLUDED.resolved_ip,
			country = EXCLUDED.country,
			coordinates = EXCLUDED.coordinates,
			threat_score = EXCLUDED.threat_score,
			open_ports = EXCLUDED.open_ports,
			dns_records = EXCLUDED.dns_records,
			scan_date = NOW();
	`, scanID, target, resolvedIP, country, destLon, destLat, threatScore, openPorts, dnsRecords)
	if err != nil {
		return nil, nil, err
	}

	scan := &models.ReconScan{
		ID:          scanID,
		Target:      target,
		ResolvedIP:  resolvedIP,
		Country:     country,
		Coordinates: [2]float64{destLon, destLat},
		ThreatScore: threatScore,
		OpenPorts:   openPorts,
		DnsRecords:  dnsRecords,
		ScanDate:    time.Now(),
	}

	return scan, hops, nil
}
