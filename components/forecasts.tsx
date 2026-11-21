import {
  Cloud, CloudDrizzle, CloudFog, CloudLightning, CloudMoon, CloudRain, CloudSnow, CloudSun, Droplets, Moon, Sun,
} from "lucide-react";
import { conditions, display, localDate, localTime, type normalise } from "../lib/weather";

export function WeatherIcon({ code, day, size = 23 }: { code: number | null; day?: number | null; size?: number }) {
  const label = conditions(code);
  const Icon = code === 0 ? (day === 0 ? Moon : Sun) :
    code === 1 || code === 2 ? (day === 0 ? CloudMoon : CloudSun) :
    label === "Fog" ? CloudFog : label === "Drizzle" ? CloudDrizzle :
    label === "Thunderstorms" ? CloudLightning : label === "Snow" ? CloudSnow :
    label.startsWith("Rain") ? CloudRain : Cloud;
  return <Icon size={size} aria-hidden="true" strokeWidth={1.55} />;
}

type Data = ReturnType<typeof normalise>;
export function HourlyForecast({ hours }: { hours: Data["hourly"] }) {
  const values = hours.map(hour => hour.temperature).filter(value => value !== null);
  const low = values.length ? Math.min(...values) : 0;
  const range = values.length ? Math.max(3, Math.max(...values) - low) : 3;
  return (
    <section className="panel forecast" aria-labelledby="hourly-title">
      <div className="section-heading"><h2 id="hourly-title">Hourly forecast</h2><span>Next 24 hours · IST</span></div>
      {hours.length ? <div className="hour-scroll" tabIndex={0} aria-label="Scrollable hourly forecast">
        <table className="hour-table">
          <thead><tr><th scope="col">Time</th>{hours.map(hour => <th key={hour.time} scope="col">{localTime(hour.time)}</th>)}</tr></thead>
          <tbody>
            <tr><th scope="row">Temp</th>{hours.map(hour => <td className="hour-temp" key={hour.time}>
              {display(hour.temperature, "°")}
              <span className="bar-slot" aria-hidden="true">
                {hour.temperature !== null && <span style={{ height: 16 + 36 * (hour.temperature - low) / range }} />}
              </span>
              <span className="hour-icon" title={conditions(hour.code)} role="img" aria-label={conditions(hour.code)}><WeatherIcon code={hour.code} day={hour.day} size={18} /></span>
            </td>)}</tr>
            <tr><th scope="row">Rain</th>{hours.map(hour => <td key={hour.time}>{display(hour.rain, "%")}</td>)}</tr>
            <tr><th scope="row">UV</th>{hours.map(hour => <td key={hour.time}>{display(hour.uv, "", 1)}</td>)}</tr>
            <tr><th scope="row">US AQI</th>{hours.map(hour => <td key={hour.time}>{display(hour.aqi)}</td>)}</tr>
          </tbody>
        </table>
      </div> : <p className="muted">Hourly forecast unavailable.</p>}
    </section>
  );
}

export function DailyForecast({ days }: { days: Data["daily"] }) {
  return (
    <section className="panel forecast" aria-labelledby="daily-title">
      <div className="section-heading"><h2 id="daily-title">Seven-day forecast</h2><span>Daily highs and lows · °C</span></div>
      {days.length ? <ul className="daily-grid">{days.map((day, index) => (
        <li key={day.time}>
          <strong>{index === 0 ? "Today" : localDate(day.time, { weekday: "short" })}</strong>
          <small>{localDate(day.time, { day: "numeric", month: "short" })}</small>
          <span className="daily-icon" title={conditions(day.code)} role="img" aria-label={conditions(day.code)}><WeatherIcon code={day.code} /></span>
          <span className="daily-range"><b aria-label={display(day.high, " degrees high")}>{display(day.high, "°")}</b> <span aria-label={display(day.low, " degrees low")}>{display(day.low, "°")}</span></span>
          <span className="rain"><Droplets size={13} aria-hidden="true" /><span aria-label={display(day.rain, " percent chance of rain")}>{display(day.rain, "%")}</span></span>
        </li>
      ))}</ul> : <p className="muted">Seven-day forecast unavailable.</p>}
    </section>
  );
}
