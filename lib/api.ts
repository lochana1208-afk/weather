import type { City, Payload } from "./weather";

const requests = new Map<string, { until: number; promise: Promise<unknown> }>();

async function request<T>(base: string, params: Record<string, string | number>, ttl: number): Promise<T> {
  const url = new URL(base);
  for (const [key, value] of Object.entries(params)) url.searchParams.set(key, String(value));
  const key = url.href;
  const now = Date.now();
  const existing = requests.get(key);
  if (existing && now < existing.until) return existing.promise as Promise<T>;

  if (requests.size >= 75) {
    for (const [address, entry] of requests) {
      if (entry.until <= now || requests.size >= 75) requests.delete(address);
    }
  }

  const promise = Promise.resolve().then(async () => {
    try {
      const response = await fetch(url, { signal: AbortSignal.timeout(10000) });
      if (response.status === 429) throw new Error("The data provider is rate limiting requests. Try again in a minute.");
      if (!response.ok) throw new Error("The data provider is temporarily unavailable.");
      return await response.json() as T;
    } catch (error) {
      const limited = error instanceof Error && error.message.includes("rate limiting");
      if (requests.get(key)?.promise === promise) {
        if (limited) {
          requests.set(key, { until: Date.now() + 60_000, promise });
        } else {
          requests.delete(key);
        }
      }
      throw error;
    }
  });
  requests.set(key, { until: now + ttl, promise });
  return promise;
}

const coords = ({ latitude, longitude }: City) => ({
  latitude,
  longitude,
  timezone: "Asia/Kolkata",
});

export const getWeather = (city: City) => request<Payload>("https://api.open-meteo.com/v1/forecast", {
  ...coords(city),
  forecast_days: 7,
  current: "temperature_2m,relative_humidity_2m,apparent_temperature,is_day,weather_code,wind_speed_10m",
  hourly: "temperature_2m,precipitation_probability,uv_index,weather_code,is_day",
  daily: "weather_code,temperature_2m_max,temperature_2m_min,sunrise,sunset,uv_index_max,precipitation_probability_max",
}, 600_000);

export const getAir = (city: City) => request<Payload>("https://air-quality-api.open-meteo.com/v1/air-quality", {
  ...coords(city),
  forecast_days: 2,
  current: "us_aqi,pm2_5,pm10,ozone,nitrogen_dioxide",
  hourly: "us_aqi",
}, 600_000);

type Place = { name: string; admin1?: string; latitude: number; longitude: number; country_code: string };
export async function searchCities(name: string): Promise<City[]> {
  const data = await request<{ results?: Place[] }>("https://geocoding-api.open-meteo.com/v1/search", {
    name, count: 12, language: "en", countryCode: "IN",
  }, 1_800_000);
  return (data.results ?? []).filter(place => place.country_code === "IN").map(place => ({
    name: place.name, state: place.admin1, latitude: place.latitude, longitude: place.longitude,
  }));
}
