package models

import "time"

type DataSource struct {
	ID                 string     `json:"id"`
	Name               string     `json:"name"`
	Status             string     `json:"status"`
	LastSuccessAt      *time.Time `json:"lastSuccessAt"`
	LastErrorAt        *time.Time `json:"lastErrorAt"`
	LastError          *string    `json:"lastError"`
	ConsecutiveFailures int        `json:"consecutiveFailures"`
	AvgResponseMs      int        `json:"avgResponseMs"`
}

type Earthquake struct {
	ID          string    `json:"id"`
	Magnitude   float64   `json:"magnitude"`
	Place       string    `json:"place"`
	Time        time.Time `json:"time"`
	Coordinates [2]float64 `json:"coordinates"` // [lng, lat]
	Depth       float64   `json:"depth"`
	Severity    string    `json:"severity"`
	Label       string    `json:"label"`
}

type GdeltEvent struct {
	ID             string    `json:"id"`
	Label          string    `json:"label"`
	Actor1         string    `json:"actor1"`
	Actor2         string    `json:"actor2"`
	GoldsteinScale float64   `json:"goldsteinScale"`
	AvgTone        float64   `json:"avgTone"`
	Coordinates    [2]float64 `json:"coordinates"` // [lng, lat]
	SourceURL      string    `json:"sourceUrl"`
	Time           time.Time `json:"time"`
}

type AircraftState struct {
	Icao24        string    `json:"icao24"`
	Callsign      string    `json:"callsign"`
	OriginCountry string    `json:"originCountry"`
	TimePosition  time.Time `json:"timePosition"`
	Coordinates   [2]float64 `json:"coordinates"` // [lng, lat]
	BaroAltitude  float64   `json:"baroAltitude"`
	Velocity      float64   `json:"velocity"`
	TrueTrack     float64   `json:"trueTrack"`
	VerticalRate  float64   `json:"verticalRate"`
	UpdatedAt     time.Time `json:"updatedAt"`
}

type WildfireState struct {
	ID          string    `json:"id"`
	Coordinates [2]float64 `json:"coordinates"` // [lng, lat]
	Brightness  float64   `json:"brightness"`
	Confidence  string    `json:"confidence"`
	Frp         float64   `json:"frp"`
	Satellite   string    `json:"satellite"`
	AcqTime     time.Time `json:"acqTime"`
	UpdatedAt     time.Time `json:"updatedAt"`
}

type AirQuality struct {
	ID          string    `json:"id"`
	Location    string    `json:"location"`
	Parameter   string    `json:"parameter"`
	Value       float64   `json:"value"`
	Unit        string    `json:"unit"`
	Coordinates [2]float64 `json:"coordinates"` // [lng, lat]
	LastUpdated time.Time `json:"lastUpdated"`
}

type AcledEvent struct {
	ID           string    `json:"id"`
	EventDate    time.Time `json:"eventDate"`
	EventType    string    `json:"eventType"`
	SubEventType string    `json:"subEventType"`
	Actor1       string    `json:"actor1"`
	Actor2       string    `json:"actor2"`
	Country      string    `json:"country"`
	Location     string    `json:"location"`
	Coordinates  [2]float64 `json:"coordinates"` // [lng, lat]
	Fatalities   int       `json:"fatalities"`
	Notes        string    `json:"notes"`
	Source       string    `json:"source"`
}

type Webcam struct {
	ID          string     `json:"id"`
	Name        string     `json:"name"`
	Coordinates [2]float64 `json:"coordinates"` // [lng, lat]
	StreamURL   string     `json:"streamUrl"`
	Status      string     `json:"status"`
}

type ReconScan struct {
	ID          string     `json:"id"`
	Target      string     `json:"target"`
	ResolvedIP  string     `json:"resolvedIp"`
	Country     string     `json:"country"`
	Coordinates [2]float64 `json:"coordinates"` // [lng, lat]
	ThreatScore int        `json:"threatScore"`
	OpenPorts   []int      `json:"openPorts"`
	DnsRecords  any        `json:"dnsRecords"`
	ScanDate    time.Time  `json:"scanDate"`
}

type Satellite struct {
	ID          string     `json:"id"`
	Name        string     `json:"name"`
	NoradID     int        `json:"noradId"`
	Type        string     `json:"satelliteType"`
	Coordinates [2]float64 `json:"coordinates"` // [lng, lat]
	AltitudeKM  float64    `json:"altitudeKm"`
	Inclination float64    `json:"inclination"`
	VelocityKMS float64    `json:"velocityKms"`
	TleLine1    string     `json:"tleLine1"`
	TleLine2    string     `json:"tleLine2"`
	UpdatedAt   time.Time  `json:"updatedAt"`
}


