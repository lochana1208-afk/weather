"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import { Activity, ArrowRight, ArrowUpRight, CloudSun, Droplets, Footprints, Moon, RefreshCw, Sun, Sunrise, Sunset, Thermometer, Wind } from "lucide-react";
import { getAir, getWeather } from "../lib/api";
import { airLevel, heatIndex, outdoor, uvLevel } from "../lib/guidance";
import { cities, conditions, display, localDate, localHour, localTime, normalise, type City, type Payload } from "../lib/weather";
import { DailyForecast, HourlyForecast, WeatherIcon } from "./forecasts";
import { LocationPicker } from "./location";

type Snapshot = {
  key: string;
  weather?: Payload;
  air?: Payload;
  weatherError?: string;
  airError?: string;
  readAt?: number;
};
const initialCity = cities[0];
const cityKey = (city: City) => city.latitude + "," + city.longitude;
const clockLabel = (now: number) => new Intl.DateTimeFormat("en-IN", {
  timeZone: "Asia/Kolkata", hour: "numeric", minute: "2-digit",
}).format(now);
const isLimited = (error: unknown) => error instanceof Error && error.message.includes("rate limiting");

function getStoredCity(): City | undefined {
  try {
    const stored = JSON.parse(localStorage.getItem("southsky-city") ?? "null");
    if (stored && typeof stored.name === "string" && stored.name.length && !stored.device &&
      Number.isFinite(stored.latitude) && Math.abs(stored.latitude) <= 90 &&
      Number.isFinite(stored.longitude) && Math.abs(stored.longitude) <= 180 &&
      (stored.state === undefined || typeof stored.state === "string")) return stored as City;
  } catch { /* Local storage is optional. */ }
}

function Metric({ name, children }: { name: string; children: ReactNode }) {
  return <div className="metric"><dt>{name}</dt><dd>{children}</dd></div>;
}

function LevelTag({ level }: { level: { tone: string; label: string } | null }) {
  return level ? <span className={"tag " + level.tone}>{level.label}</span> : null;
}

export default function Dashboard() {
  const [city, setCity] = useState(initialCity);
  const [ready, setReady] = useState(false);
  const [theme, setTheme] = useState<"light" | "dark">("light");
  const [now, setNow] = useState<number>();
  const [refresh, setRefresh] = useState(0);
  const [busy, setBusy] = useState(false);
  const [snapshot, setSnapshot] = useState<Snapshot>();
  const [locating, setLocating] = useState(false);
  const [locationNote, setLocationNote] = useState("");
  const geolocationRequest = useRef(0);

  function locate() {
    const id = ++geolocationRequest.current;
    setLocationNote("");
    if (!navigator.geolocation) {
      setLocationNote("Location access is unavailable. Search for a city.");
      return;
    }
    setLocating(true);
    navigator.geolocation.getCurrentPosition(position => {
      if (geolocationRequest.current !== id) return;
      const latitude = Number(position.coords.latitude.toFixed(2));
      const longitude = Number(position.coords.longitude.toFixed(2));
      const nearby = cities.find(place => Math.hypot(place.latitude - latitude, place.longitude - longitude) < 0.18);
      setLocating(false);
      setCity({ name: nearby ? "Near " + nearby.name : "Current location", state: nearby?.state, latitude, longitude, device: true });
    }, () => {
      if (geolocationRequest.current !== id) return;
      setLocating(false);
      setLocationNote("Couldn’t access your location. Search for a city or keep your current selection.");
    }, { timeout: 9000, maximumAge: 300000 });
  }

  useEffect(() => {
    const saved = getStoredCity();
    if (saved) setCity(saved);
    else locate();
    let savedTheme: string | null = null;
    try { savedTheme = localStorage.getItem("southsky-theme"); } catch { /* Optional preference. */ }
    const selected = savedTheme === "dark" || savedTheme === "light" ? savedTheme :
      (window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light");
    setTheme(selected);
    document.documentElement.dataset.theme = selected;
    setReady(true);
    setNow(Date.now());
    const clock = window.setInterval(() => setNow(Date.now()), 30_000);
    const update = window.setInterval(() => {
      if (document.visibilityState === "visible") setRefresh(value => value + 1);
    }, 600_000);
    return () => {
      geolocationRequest.current++;
      window.clearInterval(clock);
      window.clearInterval(update);
    };
  }, []);

  useEffect(() => {
    if (!ready) return;
    let ignore = false;
    const key = cityKey(city);
    setBusy(true);
    // A successful section can remain visible if a refresh for this same city fails.
    const weather = getWeather(city).then(
      payload => {
        if (!ignore) setSnapshot(old => ({ ...(old?.key === key ? old : { key }), weather: payload, weatherError: undefined, readAt: Date.now() }));
      },
      error => {
        if (!ignore) setSnapshot(old => ({ ...(old?.key === key ? old : { key }), weatherError:
          isLimited(error) ? "Weather requests are rate limited. Try again in a minute." : "Weather is temporarily unavailable. Check your connection and retry." }));
      },
    );
    const air = getAir(city).then(
      payload => {
        if (!ignore) setSnapshot(old => ({ ...(old?.key === key ? old : { key }), air: payload, airError: undefined }));
      },
      error => {
        if (!ignore) setSnapshot(old => ({ ...(old?.key === key ? old : { key }), airError:
          isLimited(error) ? "Air quality requests are rate limited. Try again in a minute." : "Air quality is temporarily unavailable. Check your connection and retry." }));
      },
    );
    void Promise.all([weather, air]).then(() => { if (!ignore) setBusy(false); });
    return () => { ignore = true; };
  }, [city, ready, refresh]);

  function select(place: City) {
    geolocationRequest.current++;
    setLocating(false);
    setLocationNote("");
    try { localStorage.setItem("southsky-city", JSON.stringify(place)); } catch { /* Optional preference. */ }
    setCity(place);
  }

  function toggleTheme() {
    const next = theme === "light" ? "dark" : "light";
    setTheme(next);
    document.documentElement.dataset.theme = next;
    try { localStorage.setItem("southsky-theme", next); } catch { /* Optional preference. */ }
  }

  const data = snapshot?.key === cityKey(city) ? snapshot : undefined;
  const loading = !data || (busy && !data.weather && !data.weatherError);
  const hour = now ? localHour(new Date(now)) : undefined;
  const w = normalise(data?.weather, data?.air, hour);
  const heat = heatIndex(w.temperature, w.humidity);
  const uv = uvLevel(w.uv);
  const air = airLevel(w.aqi);
  const advice = outdoor({ feels: w.feels, heat: heat?.celsius ?? null, uv: w.uv, aqi: w.aqi, rain: w.rain, code: w.code });
  const retry = () => setRefresh(value => value + 1);

  return (
    <div className="shell">
      <header className="topbar">
        <a className="brand" href="./"><span className="brand-mark"><CloudSun size={22} aria-hidden="true" /></span>SouthSky</a>
        <div className="header-actions">
          <LocationPicker city={city} select={select} locate={locate} locating={locating} />
          <button className="icon-button theme-button" type="button" onClick={toggleTheme}
            aria-label={theme === "light" ? "Switch to dark mode" : "Switch to light mode"}
            title={theme === "light" ? "Dark mode" : "Light mode"}>
            {theme === "light" ? <Moon size={19} aria-hidden="true" /> : <Sun size={19} aria-hidden="true" />}
          </button>
        </div>
      </header>
      <main className="content">
        <div className="intro">
          <div>
            {hour && <p className="date-line">{localDate(hour, { weekday: "long", day: "numeric", month: "long" })} · {clockLabel(now!)} IST</p>}
            <h1>{city.name}</h1>
            {city.state && <p className="region">{city.state}, India</p>}
            {locating && <p className="muted" role="status">Finding your location…</p>}
            {locationNote && <p className="muted" role="status">{locationNote}</p>}
          </div>
          <div className="update-line">
            {data?.readAt && <span>Checked {clockLabel(data.readAt)} IST</span>}
            <button type="button" className="icon-button" onClick={retry} disabled={busy} aria-label="Refresh readings" title="Refresh readings">
              <RefreshCw size={16} className={busy ? "spin" : ""} aria-hidden="true" />
            </button>
          </div>
        </div>
        <section className={"hero " + (w.day === 0 ? "night" : "")} aria-labelledby="current">
          <div className="hero-main">
            <div>
              <h2 id="current">Current weather</h2>
              <div className="temperature">{display(w.temperature)}{w.temperature !== null && <span>°C</span>}</div>
              <p className="hero-condition" role="status">{loading ? "Loading weather…" : conditions(w.code)}</p>
              {w.weatherTime && <span className="weather-time">Model time {localTime(w.weatherTime)} IST</span>}
            </div>
            {w.code !== null && <div className="hero-icon"><WeatherIcon code={w.code} day={w.day} size={86} /></div>}
          </div>
          <dl className="hero-details">
            <Metric name="Feels like">{display(w.feels, "°C")}</Metric>
            <Metric name="High / low">{display(w.today?.high ?? null, "°")} / {display(w.today?.low ?? null, "°")}</Metric>
            <Metric name="Humidity">{display(w.humidity, "%")}</Metric>
            <Metric name="Wind">{display(w.wind, " km/h")}</Metric>
            <Metric name="Rain this hour">{display(w.rain, "%")}</Metric>
            <Metric name="Sunrise"><Sunrise size={15} aria-hidden="true" /> {localTime(w.today?.sunrise)}</Metric>
            <Metric name="Sunset"><Sunset size={15} aria-hidden="true" /> {localTime(w.today?.sunset)}</Metric>
          </dl>
        </section>
        {data?.weatherError && <div className="notice" role="alert"><span>{data.weatherError} {data.weather && "Showing earlier weather data."}</span><button onClick={retry} disabled={busy}>Retry</button></div>}

        <div className="environment-grid">
          <section className="panel environmental" aria-labelledby="heat-title">
            <div className="card-heading"><span className="card-icon heat-color"><Thermometer size={20} aria-hidden="true" /></span><h2 id="heat-title">Heat &amp; humidity</h2></div>
            <div className="reading"><strong>{display(heat?.celsius ?? null, "°C", 1)}</strong><LevelTag level={heat?.level ?? null} /></div>
            <p className="muted">Heat index in the shade</p>
            <dl className="card-metrics"><Metric name="Feels like">{display(w.feels, "°C")}</Metric><Metric name="Humidity">{display(w.humidity, "%")}</Metric></dl>
            <p>{heat?.level?.tip ?? (w.temperature === null || w.humidity === null ? "Heat index needs temperature and humidity readings." : "Conditions are below the threshold for the heat-index calculation.")}</p>
            <small className="muted">App guidance based on the NWS heat index. Check official alerts separately.</small>
          </section>
          <section className="panel environmental" aria-labelledby="uv-title">
            <div className="card-heading"><span className="card-icon uv-color"><Sun size={20} aria-hidden="true" /></span><h2 id="uv-title">UV &amp; sunlight</h2></div>
            <div className="reading"><strong>{display(w.uv, "", 1)}</strong><LevelTag level={uv} /></div>
            <p className="muted">UV index this hour</p>
            <dl className="card-metrics"><Metric name="Today’s peak">{display(w.today?.uv ?? null, "", 1)}</Metric></dl>
            <p>{uv?.tip ?? "Current UV reading unavailable."}</p>
            <details>
              <summary>Vitamin D &amp; Sunlight Awareness</summary>
              <p>UVB helps your skin make vitamin D. Skin pigmentation, exposed skin, sunscreen, season and sun angle affect how much your skin produces. The UV index indicates sunburn risk and cannot estimate your vitamin D level or a personal exposure time.</p>
            </details>
          </section>
          <section className="panel environmental" aria-labelledby="air-title">
            <div className="card-heading"><span className="card-icon air-color"><Wind size={20} aria-hidden="true" /></span><h2 id="air-title">Air quality</h2></div>
            <div className="reading"><strong>{display(w.aqi)}</strong><LevelTag level={air} /></div>
            <p className="muted">US AQI · CAMS model estimate</p>
            <dl className="card-metrics pollutants">
              <Metric name="PM2.5">{display(w.pm25, " µg/m³", 1)}</Metric>
              <Metric name="PM10">{display(w.pm10, " µg/m³", 1)}</Metric>
              <Metric name="Ozone">{display(w.ozone, " µg/m³", 1)}</Metric>
              <Metric name="Nitrogen dioxide">{display(w.nitrogen, " µg/m³", 1)}</Metric>
            </dl>
            <p>{air?.tip ?? (busy && !data?.airError ? "Loading air quality…" : "Air quality reading unavailable.")}</p>
            {w.airTime && <small className="muted">Model time {localTime(w.airTime)} IST</small>}
            {data?.airError && <div className="inline-error" role="alert"><p>{data.airError} {data.air && "Showing earlier air quality data."}</p><button onClick={retry} disabled={busy}>Retry</button></div>}
          </section>
        </div>

        <section className="advisor" aria-labelledby="advisor-heading">
          <span className="advisor-icon"><Footprints size={22} aria-hidden="true" /></span>
          <div>
            <h2 id="advisor-heading">Outdoor activity</h2>
            <h3>{advice.title}</h3>
            <ul>{advice.reasons.map(reason => <li key={reason}>{reason}</li>)}</ul>
          </div>
          <Activity size={22} className="advisor-decoration" aria-hidden="true" />
        </section>
        <HourlyForecast hours={w.hourly} />
        <DailyForecast days={w.daily} />
      </main>
      <footer className="footer">
        <span><Droplets size={16} aria-hidden="true" /> SouthSky Weather</span>
        <div>
          <a href="https://open-meteo.com/">Open-Meteo <ArrowUpRight size={12} aria-hidden="true" /></a>
          <a href="https://atmosphere.copernicus.eu/">CAMS <ArrowUpRight size={12} aria-hidden="true" /></a>
          <a href="https://www.geonames.org/">GeoNames <ArrowUpRight size={12} aria-hidden="true" /></a>
          <a href="https://creativecommons.org/licenses/by/4.0/">Data licence <ArrowRight size={12} aria-hidden="true" /></a>
        </div>
      </footer>
    </div>
  );
}
