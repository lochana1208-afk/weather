# SouthSky Weather

SouthSky is a personal weather dashboard for India. It opens in Bengaluru and covers current weather, heat and humidity, UV and sunlight, air quality, and outdoor activity. Forecasts use Celsius, kilometres per hour, and India Standard Time.

## Deploy with GitHub and Vercel

1. Extract `SouthSky_Weather.zip` and open the extracted folder. Its top level contains `package.json`, `package-lock.json`, `app`, `components`, `lib`, `public`, and `tests`.
2. In your **personal GitHub account**, [create a repository](https://github.com/new). Name it `southsky-weather`. On the empty repository page, click **uploading an existing file**. If the repository already has files, use **Add file → Upload files**.
3. Drag the extracted **files and folders** into GitHub’s upload area. Check that `package.json` appears at the repository root, then commit the files to `main`.
4. In your Vercel dashboard, choose **Add New → Project** and import your GitHub repository. If it does not appear, use the GitHub installation settings to grant Vercel access to that repository.
5. Confirm the **Next.js** framework preset and leave the root directory at the repository root. Select **24.x** or **22.x** if Vercel asks for a Node.js version. Leave the install, build and output settings at their detected defaults. The project uses `next build` with static export. Leave **Environment Variables** empty.
6. Click **Deploy**. Open the resulting HTTPS `vercel.app` address. If you grant location permission, the app uses your approximate coordinates. You can select a city at any time.
7. Future commits to the production branch trigger new production deployments. Other branches or pull requests can receive preview deployments.

### Local development

With Node.js 22 or newer and npm installed:

```sh
npm ci
npm run dev
```

Open [http://localhost:3000](http://localhost:3000). Run `npm run typecheck`, `npm test`, and `npm run build` to verify changes. The last command produces a static site in `out/`. To preview that export locally, run `python -m http.server 8080 --directory out` and open [http://localhost:8080](http://localhost:8080).

### Troubleshooting

| Symptom | What to check |
| --- | --- |
| Vercel cannot find Next.js or package.json | Confirm the files were extracted and uploaded. Set **Root Directory** to the directory containing `package.json`. |
| GitHub repository is missing in Vercel | Check access for the Vercel GitHub app and import from the personal account that owns the repository. |
| Location permission is blocked | Open the HTTPS deployment and check site permissions. Use the city search if you prefer to skip location sharing. |
| One set of readings is missing | Check your connection and use **Retry**. If the provider is rate limiting requests, wait at least a minute. Weather and air quality can recover independently. |
| UV or heat index is blank | A dash marks a missing measurement or a heat index that does not apply at the current temperature and humidity. |

## Data sources and hosting

| Service | Purpose |
| --- | --- |
| [Open-Meteo Weather Forecast](https://open-meteo.com/en/docs) | Modelled weather, apparent temperature, hourly UV and rain, and daily forecasts |
| [Open-Meteo Air Quality](https://open-meteo.com/en/docs/air-quality-api) | CAMS model estimates of US AQI and pollutant concentrations |
| [Open-Meteo Geocoding](https://open-meteo.com/en/docs/geocoding-api) | GeoNames-based city search restricted to India |

Open-Meteo’s [free access](https://open-meteo.com/en/pricing) requires no key and is for non-commercial use. Published free limits are 600 calls per minute, 5,000 per hour, 10,000 per day, and 300,000 per month. Some larger requests may count as more than one API call. The free endpoint has no uptime guarantee. The app credits the sources and links to the [CC BY 4.0 data licence](https://creativecommons.org/licenses/by/4.0/). Vercel’s [Hobby plan](https://vercel.com/docs/plans/hobby) is intended for personal, non-commercial use and subject to usage limits.

The Next.js frontend exports as static files. Browsers call the public Open-Meteo endpoints directly, so there are no app functions, API secrets, database, or background processes. Weather and air requests are cached for ten minutes per browser tab, successful city searches for thirty minutes, and retries after rate-limit responses pause for one minute. The app checks for updated readings every ten minutes while visible. The most recent manually selected city and theme are stored on your device. When you use browser location, coordinates rounded to two decimal places are sent to the providers and kept in memory for the current visit.

## How guidance is calculated

- **Heat index:** The [NWS method](https://www.weather.gov/ctp/heat) uses air temperature and relative humidity for shaded, light-wind conditions. The app runs the Rothfusz regression once the preliminary estimate reaches 80°F, with NWS adjustments for low and high humidity. Categories start at rounded values of 80°F, 90°F, 103°F and 125°F. The result is displayed in Celsius. Apparent temperature is a separate Open-Meteo field. Consult official local forecasts for weather warnings.
- **UV:** The current value is the model estimate for the current IST hour. The app applies [standard UV categories](https://www.epa.gov/sunsafety/uv-index-scale-0) to the rounded value. [Vitamin D production](https://ods.od.nih.gov/factsheets/VitaminD-HealthProfessional/) depends on UVB and other factors. The app provides general education and does not estimate a vitamin D dose or prescribe exposure time.
- **Air quality:** The app uses the [US AQI scale](https://www.airnow.gov/aqi/aqi-basics/) returned by Open-Meteo. Concentrations use µg/m³. CAMS estimates represent a model grid and may differ from nearby monitoring station measurements. India’s national AQI uses a different scale.
- **Outdoor activity:** Thunderstorm conditions, a heat index or apparent temperature of at least 39.5°C, or US AQI above 150 suggest choosing indoor exercise. The app also highlights warmth from 32°C, UV of 3 or above, US AQI above 100, and rain probability of 60% or higher. Missing inputs prevent a favourable all-clear. Suggestions are general planning guidance.
