import type { WeatherPoint } from '@panopticon/core/types';
export declare function fetchWeather(lat: number, lng: number): Promise<WeatherPoint>;
/**
 * Fetches weather for a list of major global stations to display global weather layers.
 */
export declare function fetchGlobalWeatherGrid(): Promise<WeatherPoint[]>;
//# sourceMappingURL=open-meteo.d.ts.map