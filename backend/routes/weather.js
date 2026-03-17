const express = require("express");
const axios = require("axios");
const router = express.Router();

const OWM_BASE = "https://api.openweathermap.org/data/2.5";

// GET /api/weather?lat=XX&lon=XX
router.get("/", async (req, res) => {
  const { lat, lon } = req.query;
  const apiKey = process.env.OPENWEATHER_API_KEY;

  if (!lat || !lon) {
    return res.status(400).json({ error: "lat and lon are required" });
  }
  if (!apiKey) {
    return res.status(500).json({ error: "Weather API key not configured" });
  }

  try {
    const [current, forecast] = await Promise.all([
      axios.get(`${OWM_BASE}/weather`, {
        params: { lat, lon, appid: apiKey, units: "imperial" },
      }),
      axios.get(`${OWM_BASE}/forecast`, {
        params: { lat, lon, appid: apiKey, units: "imperial", cnt: 40 },
      }),
    ]);

    const w = current.data;
    const dailyForecast = buildDailyForecast(forecast.data.list);

    res.json({
      location: {
        city: w.name,
        country: w.sys.country,
        lat: w.coord.lat,
        lon: w.coord.lon,
      },
      current: {
        temp: Math.round(w.main.temp),
        feelsLike: Math.round(w.main.feels_like),
        humidity: w.main.humidity,
        description: w.weather[0].description,
        icon: w.weather[0].icon,
        windSpeed: Math.round(w.wind.speed),
        visibility: w.visibility,
        sunrise: w.sys.sunrise,
        sunset: w.sys.sunset,
      },
      forecast: dailyForecast,
    });
  } catch (err) {
    const status = err.response?.status || 500;
    const message = err.response?.data?.message || "Failed to fetch weather";
    res.status(status).json({ error: message });
  }
});

// Condense 3-hour forecast blocks into daily summaries
function buildDailyForecast(list) {
  const days = {};
  list.forEach((item) => {
    const date = item.dt_txt.split(" ")[0];
    if (!days[date]) {
      days[date] = { temps: [], humidity: [], description: item.weather[0].description, icon: item.weather[0].icon };
    }
    days[date].temps.push(item.main.temp);
    days[date].humidity.push(item.main.humidity);
  });

  return Object.entries(days).slice(0, 5).map(([date, data]) => ({
    date,
    high: Math.round(Math.max(...data.temps)),
    low: Math.round(Math.min(...data.temps)),
    humidity: Math.round(data.humidity.reduce((a, b) => a + b, 0) / data.humidity.length),
    description: data.description,
    icon: data.icon,
  }));
}

module.exports = router;
