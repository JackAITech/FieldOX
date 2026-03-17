const express = require("express");
const axios = require("axios");
const { zoneFromMinTemp, stateZones, getMedianZone } = require("../data/zones");
const router = express.Router();

// GET /api/zone?lat=XX&lon=XX
// Determines USDA hardiness zone using historical min temperature from Open-Meteo (free, no key needed)
router.get("/", async (req, res) => {
  const { lat, lon } = req.query;

  if (!lat || !lon) {
    return res.status(400).json({ error: "lat and lon are required" });
  }

  try {
    // Use Open-Meteo (free, no API key) to get historical climate data for zone calculation
    // Get last year's minimum temperature to determine hardiness zone
    const today = new Date();
    const lastYear = today.getFullYear() - 1;
    const startDate = `${lastYear}-01-01`;
    const endDate = `${lastYear}-12-31`;

    const climateRes = await axios.get("https://archive-api.open-meteo.com/v1/archive", {
      params: {
        latitude: lat,
        longitude: lon,
        start_date: startDate,
        end_date: endDate,
        daily: "temperature_2m_min",
        timezone: "auto",
        temperature_unit: "celsius",
      },
    });

    const minTemps = climateRes.data.daily.temperature_2m_min.filter((t) => t !== null);
    const annualMin = Math.min(...minTemps);
    const zone = zoneFromMinTemp(annualMin);

    // Also get reverse geocode for state name (use Open-Meteo timezone info)
    const timezone = climateRes.data.timezone || "";
    const stateName = timezoneToState(timezone);

    res.json({
      zone: zone.toString(),
      annualMinTempC: Math.round(annualMin * 10) / 10,
      annualMinTempF: Math.round((annualMin * 9) / 5 + 32),
      description: zoneDescription(zone),
      state: stateName,
      method: "historical_min_temp",
    });
  } catch (err) {
    // Fallback: try to get state from OpenWeather if configured
    const apiKey = process.env.OPENWEATHER_API_KEY;
    if (apiKey) {
      try {
        const geoRes = await axios.get("https://api.openweathermap.org/geo/1.0/reverse", {
          params: { lat, lon, limit: 1, appid: apiKey },
        });
        const stateCode = geoRes.data[0]?.state || "";
        const zone = getMedianZone(stateZones[stateCode] || "6");
        return res.json({
          zone: zone.toString(),
          state: stateCode,
          description: zoneDescription(zone),
          method: "state_fallback",
        });
      } catch (_) {}
    }

    // Last resort fallback
    res.json({
      zone: "6",
      description: zoneDescription(6),
      method: "default_fallback",
      note: "Could not determine zone automatically — defaulting to Zone 6",
    });
  }
});

function zoneDescription(zone) {
  const descriptions = {
    1: "Extreme cold (below -60°F avg min)",
    2: "Very cold (-50 to -60°F avg min)",
    3: "Cold (-40 to -50°F avg min) — Northern MN, ND",
    4: "Cold (-30 to -40°F avg min) — Upper Midwest, New England",
    5: "Cool (-20 to -30°F avg min) — Midwest, Great Plains",
    6: "Moderate (-10 to -20°F avg min) — Mid-Atlantic, Midwest",
    7: "Mild (0 to -10°F avg min) — Pacific NW, Southeast",
    8: "Warm (10 to 0°F avg min) — Pacific Coast, Deep South",
    9: "Hot (20 to 10°F avg min) — California, Gulf Coast",
    10: "Very hot (30 to 20°F avg min) — South Florida, Hawaii",
    11: "Tropical (above 30°F avg min) — Hawaii, Puerto Rico",
  };
  return descriptions[zone] || "Unknown zone";
}

function timezoneToState(timezone) {
  const map = {
    "America/Chicago": "Illinois",
    "America/New_York": "New York",
    "America/Los_Angeles": "California",
    "America/Denver": "Colorado",
    "America/Phoenix": "Arizona",
    "America/Detroit": "Michigan",
    "America/Indiana/Indianapolis": "Indiana",
    "America/Kentucky/Louisville": "Kentucky",
  };
  return map[timezone] || "";
}

module.exports = router;
