type Reading = number | null;
type Level = { max: number; label: string; tip: string; tone: string };

const uvLevels: Level[] = [
  { max: 2, label: "Low", tip: "Check UV again if you plan to be out later in the day.", tone: "green" },
  { max: 5, label: "Moderate", tip: "Seek shade around midday and use sun protection outdoors.", tone: "amber" },
  { max: 7, label: "High", tip: "Seek midday shade and use sunscreen, sunglasses and a hat.", tone: "amber" },
  { max: 10, label: "Very high", tip: "Avoid midday sun where possible; use shade and sun protection.", tone: "red" },
  { max: Infinity, label: "Extreme", tip: "Avoid midday sun where possible; cover up and seek shade.", tone: "red" },
];
const airLevels: Level[] = [
  { max: 50, label: "Good", tip: "Air quality poses little or no expected risk for most people.", tone: "green" },
  { max: 100, label: "Moderate", tip: "People unusually sensitive to pollution can take breaks if symptoms occur.", tone: "amber" },
  { max: 150, label: "Unhealthy for sensitive groups", tip: "Sensitive groups should reduce prolonged or heavy outdoor exertion.", tone: "amber" },
  { max: 200, label: "Unhealthy", tip: "Consider shortening outdoor exercise or moving it indoors.", tone: "red" },
  { max: 300, label: "Very unhealthy", tip: "Move strenuous activities indoors.", tone: "red" },
  { max: Infinity, label: "Hazardous", tip: "Avoid outdoor physical activity.", tone: "red" },
];
const heatLevels: Level[] = [
  { max: 79, label: "Below caution", tip: "Check conditions again before heading out later.", tone: "green" },
  { max: 89, label: "Caution", tip: "Carry water and take breaks during prolonged outdoor activity.", tone: "amber" },
  { max: 102, label: "Extreme caution", tip: "Plan outdoor activity for a cooler time and take shade breaks.", tone: "amber" },
  { max: 124, label: "Danger", tip: "Reduce strenuous outdoor activity and take cooling breaks.", tone: "red" },
  { max: Infinity, label: "Extreme danger", tip: "Avoid strenuous outdoor activity and stay somewhere cool.", tone: "red" },
];

function classify(value: Reading, levels: Level[]) {
  if (value === null || !Number.isFinite(value) || value < 0) return null;
  return levels.find(level => Math.round(value) <= level.max) ?? null;
}
export const uvLevel = (value: Reading) => classify(value, uvLevels);
export const airLevel = (value: Reading) => classify(value, airLevels);

// NWS simple estimate followed by the Rothfusz regression when warranted.
// Heat index approximates conditions in the shade with light wind.
export function heatIndex(celsius: Reading, humidity: Reading) {
  if (celsius === null || humidity === null || humidity < 0 || humidity > 100) return null;
  const t = celsius * 9 / 5 + 32;
  const r = humidity;
  const preliminary = (0.5 * (t + 61 + (t - 68) * 1.2 + r * 0.094) + t) / 2;
  if (preliminary < 80) return null;
  let index = -42.379 + 2.04901523 * t + 10.14333127 * r - 0.22475541 * t * r
    - 0.00683783 * t ** 2 - 0.05481717 * r ** 2 + 0.00122874 * t ** 2 * r
    + 0.00085282 * t * r ** 2 - 0.00000199 * t ** 2 * r ** 2;
  if (r < 13 && t >= 80 && t <= 112) index -= (13 - r) / 4 * Math.sqrt((17 - Math.abs(t - 95)) / 17);
  if (r > 85 && t >= 80 && t <= 87) index += (r - 85) / 10 * (87 - t) / 5;
  return { celsius: (index - 32) * 5 / 9, level: classify(index, heatLevels) };
}

type OutdoorInput = { feels: Reading; heat: Reading; uv: Reading; aqi: Reading; rain: Reading; code: Reading };
export function outdoor({ feels, heat, uv, aqi, rain, code }: OutdoorInput) {
  const reasons: string[] = [];
  const apparent = heat === null || feels === null ? heat ?? feels : Math.max(heat, feels);
  const storm = code !== null && [95, 96, 99].includes(code);
  const hot = apparent !== null && apparent >= 39.5;
  const unhealthy = aqi !== null && Math.round(aqi) > 150;
  if (storm) reasons.push("Thunderstorms are forecast.");
  if (hot) reasons.push("The heat index or feels-like temperature is around 40°C or higher.");
  else if (apparent !== null && apparent >= 32) reasons.push("It feels warm. Choose a cooler time and carry water.");
  if (unhealthy) reasons.push("The US AQI is in the unhealthy range or worse.");
  else if (aqi !== null && Math.round(aqi) > 100) reasons.push("Air quality may affect sensitive groups.");
  if (uv !== null && Math.round(uv) >= 3) reasons.push("Use sun protection with the current UV level.");
  if (rain !== null && rain >= 60) reasons.push("Rain is likely this hour.");
  const incomplete = feels === null || uv === null || aqi === null || code === null || rain === null;
  if (incomplete) reasons.push("Some readings are unavailable. Check local conditions before going out.");
  return {
    title: storm || hot || unhealthy ? "Consider indoor exercise" : reasons.length ? "Plan your outdoor time" : "Conditions look suitable for a walk",
    reasons: reasons.length ? reasons : ["The available heat, UV, air quality and rain readings are below the app’s caution thresholds."],
  };
}
