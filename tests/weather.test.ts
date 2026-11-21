import assert from "node:assert/strict";
import { test } from "node:test";
import { airLevel, heatIndex, outdoor, uvLevel } from "../lib/guidance";
import { localHour, normalise, type Payload } from "../lib/weather";

test("IST hour crosses the local date boundary independently of browser timezone", () => {
  assert.equal(localHour(new Date("2026-11-21T19:02:00Z")), "2026-11-22T00:00");
});

test("normalisation joins model timestamps, preserves zeros and keeps missing values null", () => {
  const hour = "2026-11-22T00:00";
  const weather: Payload = {
    current: { temperature_2m: 23, relative_humidity_2m: 62, weather_code: 0 },
    hourly: {
      time: ["2026-11-21T23:00", hour, "2026-11-22T01:00"],
      uv_index: [0, 0, null],
      precipitation_probability: [0, 2, 5],
      temperature_2m: [25, 23, 22],
    },
    daily: { time: ["2026-11-21", "2026-11-22"], temperature_2m_max: [28, 27] },
  };
  const air: Payload = {
    hourly: { time: [hour, "2026-11-22T01:00"], us_aqi: [42, 51] },
    current: { pm2_5: 0 },
  };
  const result = normalise(weather, air, hour);
  assert.equal(result.code, 0);
  assert.equal(result.uv, 0);
  assert.equal(result.rain, 2);
  assert.equal(result.today?.high, 27);
  assert.equal(result.aqi, 42);
  assert.equal(result.pm25, 0);
  assert.equal(result.pm10, null);
  assert.equal(result.hourly[1].aqi, 51);
  assert.equal(result.hourly[1].uv, null);
});

test("empty and partial data remain usable", () => {
  const api = normalise(undefined, { current: { us_aqi: 89 } }, "2026-11-22T00:00");
  assert.deepEqual(api.daily, []);
  assert.equal(api.temperature, null);
  assert.equal(api.aqi, 89);
});

test("heat index follows NWS reference case and skips cool or invalid readings", () => {
  const heat = heatIndex((90 - 32) * 5 / 9, 70);
  assert.ok(heat);
  assert.ok(Math.abs(heat.celsius - 41) < .5);
  assert.equal(heat.level?.label, "Danger");
  assert.equal(heatIndex(21, 60), null);
  assert.equal(heatIndex(40, 101), null);
});

test("UV and US AQI classifications use rounded readings at category boundaries", () => {
  assert.equal(uvLevel(2.4)?.label, "Low");
  assert.equal(uvLevel(2.5)?.label, "Moderate");
  assert.equal(uvLevel(11)?.label, "Extreme");
  assert.equal(airLevel(50)?.label, "Good");
  assert.equal(airLevel(51)?.label, "Moderate");
  assert.equal(airLevel(101)?.label, "Unhealthy for sensitive groups");
  assert.equal(airLevel(151)?.label, "Unhealthy");
  assert.equal(airLevel(301)?.label, "Hazardous");
  assert.equal(airLevel(null), null);
});

test("activity advice escalates for storms, heat and poor air and handles gaps", () => {
  const calm = { feels: 24, heat: null, uv: 1, aqi: 40, rain: 0, code: 0 };
  assert.equal(outdoor(calm).title, "Conditions look suitable for a walk");
  assert.equal(outdoor({ ...calm, aqi: null }).title, "Plan your outdoor time");
  assert.equal(outdoor({ ...calm, aqi: 170 }).title, "Consider indoor exercise");
  assert.equal(outdoor({ ...calm, heat: 40 }).title, "Consider indoor exercise");
  assert.equal(outdoor({ ...calm, code: 95 }).title, "Consider indoor exercise");
});
