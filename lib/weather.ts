export type City = { name: string; state?: string; latitude: number; longitude: number; device?: boolean };
export const cities: City[] = [
  { name: "Bengaluru", state: "Karnataka", latitude: 12.9716, longitude: 77.5946 },
  { name: "Chennai", state: "Tamil Nadu", latitude: 13.0827, longitude: 80.2707 },
  { name: "Hyderabad", state: "Telangana", latitude: 17.3850, longitude: 78.4867 },
  { name: "Kochi", state: "Kerala", latitude: 9.9312, longitude: 76.2673 },
  { name: "Coimbatore", state: "Tamil Nadu", latitude: 11.0168, longitude: 76.9558 },
];
type Numeric = number | null;
type Point = { time?: string } & Record<string, string | number | null | undefined>;
type Series = { time?: string[] } & Record<string, Array<string | number | null> | undefined>;
export type Payload = { current?: Point; hourly?: Series; daily?: Series };
export const n = (value: unknown): Numeric => typeof value === "number" && Number.isFinite(value) ? value : null;
export const display = (value: Numeric, suffix = "", digits = 0) =>
  value === null ? "—" : new Intl.NumberFormat("en-IN", { maximumFractionDigits: digits }).format(value) + suffix;

const timezone = "Asia/Kolkata";
export function localTime(time?: string) {
  if (!time) return "—";
  const date = new Date(time + "+05:30");
  return Number.isNaN(date.getTime()) ? "—" :
    new Intl.DateTimeFormat("en-IN", { timeZone: timezone, hour: "numeric", minute: "2-digit" }).format(date);
}
export function localDate(time: string, format: Intl.DateTimeFormatOptions) {
  return new Intl.DateTimeFormat("en-IN", { ...format, timeZone: timezone }).format(new Date(time.slice(0, 10) + "T12:00:00+05:30"));
}
export function localHour(date = new Date()) {
  return new Date(date.getTime() + 330 * 60000).toISOString().slice(0, 13) + ":00";
}

export function normalise(weather?: Payload, air?: Payload, hour = localHour()) {
  const today = hour.slice(0, 10);
  const airHours = new Map(air?.hourly?.time?.map((time, index) => [time, n(air.hourly?.us_aqi?.[index])]));
  const weatherHours = weather?.hourly;
  const hourly = (weatherHours?.time ?? []).flatMap((time, index) => time < hour ? [] : [{
    time,
    temperature: n(weatherHours?.temperature_2m?.[index]),
    rain: n(weatherHours?.precipitation_probability?.[index]),
    uv: n(weatherHours?.uv_index?.[index]),
    code: n(weatherHours?.weather_code?.[index]),
    day: n(weatherHours?.is_day?.[index]),
    aqi: airHours.get(time) ?? null,
  }]).slice(0, 24);
  const daily = (weather?.daily?.time ?? []).flatMap((time, index) => time < today ? [] : [{
    time,
    high: n(weather?.daily?.temperature_2m_max?.[index]),
    low: n(weather?.daily?.temperature_2m_min?.[index]),
    rain: n(weather?.daily?.precipitation_probability_max?.[index]),
    code: n(weather?.daily?.weather_code?.[index]),
    uv: n(weather?.daily?.uv_index_max?.[index]),
    sunrise: weather?.daily?.sunrise?.[index]?.toString(),
    sunset: weather?.daily?.sunset?.[index]?.toString(),
  }]).slice(0, 7);
  const now = weather?.current;
  const currentAir = air?.current;
  const sameHour = hourly.find(item => item.time === hour);
  return {
    hourly, daily,
    today: daily.find(item => item.time === today),
    temperature: n(now?.temperature_2m),
    feels: n(now?.apparent_temperature),
    humidity: n(now?.relative_humidity_2m),
    wind: n(now?.wind_speed_10m),
    code: n(now?.weather_code),
    day: n(now?.is_day),
    weatherTime: now?.time,
    rain: sameHour?.rain ?? null,
    uv: sameHour?.uv ?? null,
    aqi: n(currentAir?.us_aqi) ?? airHours.get(hour) ?? null,
    pm25: n(currentAir?.pm2_5),
    pm10: n(currentAir?.pm10),
    ozone: n(currentAir?.ozone),
    nitrogen: n(currentAir?.nitrogen_dioxide),
    airTime: currentAir?.time ?? (airHours.has(hour) ? hour : undefined),
  };
}

export const conditions = (code: Numeric): string => {
  if (code === 0) return "Clear skies";
  if (code === 1) return "Mostly clear";
  if (code === 2) return "Partly cloudy";
  if (code === 3) return "Overcast";
  if (code === 45 || code === 48) return "Fog";
  if (code !== null && [51, 53, 55, 56, 57].includes(code)) return "Drizzle";
  if (code !== null && [61, 63, 65, 66, 67].includes(code)) return "Rain";
  if (code !== null && [71, 73, 75, 77, 85, 86].includes(code)) return "Snow";
  if (code !== null && [80, 81, 82].includes(code)) return "Rain showers";
  if (code !== null && [95, 96, 99].includes(code)) return "Thunderstorms";
  return "Conditions unavailable";
};
