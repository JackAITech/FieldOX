// USDA Plant Hardiness Zone lookup by state/region
// Zone is determined by average annual minimum temperature
// For production use, integrate with: https://phzmapi.org/ (free API)
// This provides a fallback lookup by state

const stateZones = {
  // State -> typical zone range (median zone used as default)
  "Alabama": "7-8", "Alaska": "1-7", "Arizona": "5-10", "Arkansas": "6-8",
  "California": "5-11", "Colorado": "3-7", "Connecticut": "6-7", "Delaware": "7",
  "Florida": "8-11", "Georgia": "7-9", "Hawaii": "9-12", "Idaho": "4-7",
  "Illinois": "5-7", "Indiana": "5-6", "Iowa": "4-5", "Kansas": "5-7",
  "Kentucky": "6-7", "Louisiana": "8-9", "Maine": "3-6", "Maryland": "6-7",
  "Massachusetts": "5-7", "Michigan": "4-6", "Minnesota": "3-5", "Mississippi": "7-9",
  "Missouri": "5-7", "Montana": "3-6", "Nebraska": "4-6", "Nevada": "4-10",
  "New Hampshire": "4-6", "New Jersey": "6-7", "New Mexico": "4-9", "New York": "4-7",
  "North Carolina": "6-8", "North Dakota": "3-5", "Ohio": "5-6", "Oklahoma": "6-8",
  "Oregon": "4-9", "Pennsylvania": "5-7", "Rhode Island": "6-7", "South Carolina": "7-9",
  "South Dakota": "3-5", "Tennessee": "6-8", "Texas": "6-10", "Utah": "4-9",
  "Vermont": "3-6", "Virginia": "5-8", "Washington": "4-9", "West Virginia": "5-7",
  "Wisconsin": "3-5", "Wyoming": "3-7"
};

// Get median zone number from a range string like "5-7"
function getMedianZone(rangeStr) {
  if (!rangeStr) return 6;
  const parts = rangeStr.split("-").map(Number);
  if (parts.length === 1) return parts[0];
  return Math.round((parts[0] + parts[1]) / 2);
}

// Determine zone from temperature (Celsius) using USDA hardiness thresholds
function zoneFromMinTemp(minTempC) {
  // USDA zones based on avg annual minimum temp in Fahrenheit
  const minTempF = (minTempC * 9) / 5 + 32;
  if (minTempF < -60) return 1;
  if (minTempF < -50) return 2;
  if (minTempF < -40) return 3;
  if (minTempF < -30) return 4;
  if (minTempF < -20) return 5;
  if (minTempF < -10) return 6;
  if (minTempF < 0) return 7;
  if (minTempF < 10) return 8;
  if (minTempF < 20) return 9;
  if (minTempF < 30) return 10;
  return 11;
}

module.exports = { stateZones, getMedianZone, zoneFromMinTemp };
