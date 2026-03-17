const express = require("express");
const db = require("../store/db");
const router = express.Router();

const STORE = "spraying";
const SPRAYER_STORE = "sprayer_config";

// ── Sprayer coverage formula ─────────────────────────────────────────────────
// Acres/hour = (Speed mph × Boom Width ft) / 8.25
// Speed estimate from HP (if user doesn't supply speed):
//   HP determines realistic field speed; we use a conservative lookup
function estimateSpeed(hp) {
  if (hp < 75)  return 5;
  if (hp < 150) return 7;
  if (hp < 250) return 9;
  if (hp < 400) return 11;
  return 13;
}

function calcCoverage({ hp, boomWidthFt, speedMph, fieldAcres, startTime, endTime }) {
  const speed = speedMph || estimateSpeed(hp);
  const acresPerHour = (speed * boomWidthFt) / 8.25;

  let hoursWorked = null;
  let acresCovered = null;

  if (startTime && endTime) {
    const diffMs = new Date(endTime) - new Date(startTime);
    hoursWorked = parseFloat((diffMs / 3600000).toFixed(2));
    acresCovered = parseFloat((acresPerHour * hoursWorked).toFixed(1));
  } else if (fieldAcres) {
    acresCovered = parseFloat(fieldAcres);
    hoursWorked = parseFloat((fieldAcres / acresPerHour).toFixed(2));
  }

  return {
    acresPerHour: parseFloat(acresPerHour.toFixed(1)),
    estimatedSpeed: speed,
    hoursWorked,
    acresCovered,
  };
}

// ── Sprayer Config ───────────────────────────────────────────────────────────

// GET /api/spraying/config — get saved sprayer setup
router.get("/config", (req, res) => {
  const configs = db.getAll(SPRAYER_STORE);
  res.json(configs[0] || null);
});

// POST /api/spraying/config — save/update sprayer setup
// Body: { name, hp, boomWidthFt, tankGallons, defaultSpeedMph }
router.post("/config", (req, res) => {
  const { name, hp, boomWidthFt, tankGallons, defaultSpeedMph } = req.body;
  if (!hp || !boomWidthFt) {
    return res.status(400).json({ error: "hp and boomWidthFt are required" });
  }

  const existing = db.getAll(SPRAYER_STORE);
  let config;
  if (existing.length > 0) {
    config = db.update(SPRAYER_STORE, existing[0].id, { name, hp, boomWidthFt, tankGallons, defaultSpeedMph });
  } else {
    config = db.insert(SPRAYER_STORE, { name, hp, boomWidthFt, tankGallons, defaultSpeedMph });
  }

  const coverage = calcCoverage({ hp: config.hp, boomWidthFt: config.boomWidthFt, speedMph: config.defaultSpeedMph });
  res.json({ ...config, ...coverage });
});

// ── Coverage Calculator (no save) ────────────────────────────────────────────

// POST /api/spraying/calculate
// Body: { hp, boomWidthFt, speedMph?, fieldAcres? }
router.post("/calculate", (req, res) => {
  const { hp, boomWidthFt, speedMph, fieldAcres } = req.body;
  if (!hp || !boomWidthFt) {
    return res.status(400).json({ error: "hp and boomWidthFt are required" });
  }
  res.json(calcCoverage({ hp, boomWidthFt, speedMph, fieldAcres }));
});

// ── Spray Sessions ───────────────────────────────────────────────────────────

// GET /api/spraying — all sessions
router.get("/", (req, res) => {
  res.json(db.getAll(STORE));
});

// POST /api/spraying — log a spray session
// Body: { fieldName, chemical, epaRegNum, ratePerAcre, unit, costPerAcre,
//         applicatorName, applicatorLicenseNum, phi,
//         hp, boomWidthFt, speedMph, startTime, endTime, fieldAcres,
//         tankFills, tankGallons, windSpeed, windDir, temp, notes }
router.post("/", (req, res) => {
  const {
    fieldName, chemical, epaRegNum = "", ratePerAcre, unit = "oz/ac",
    costPerAcre = null,
    applicatorName = "", applicatorLicenseNum = "", phi = null,
    hp, boomWidthFt, speedMph,
    startTime, endTime, fieldAcres,
    tankFills = 0, tankGallons = 0,
    windSpeed = null, windDir = "", temp = null,
    notes = "",
  } = req.body;

  if (!fieldName || !hp || !boomWidthFt) {
    return res.status(400).json({ error: "fieldName, hp, and boomWidthFt are required" });
  }

  const coverage = calcCoverage({ hp, boomWidthFt, speedMph, fieldAcres, startTime, endTime });

  let totalChemical = null;
  if (ratePerAcre && coverage.acresCovered) {
    totalChemical = parseFloat((ratePerAcre * coverage.acresCovered).toFixed(2));
  }

  // Cost calculation
  const totalCost = costPerAcre && coverage.acresCovered
    ? parseFloat((costPerAcre * coverage.acresCovered).toFixed(2))
    : null;

  const session = db.insert(STORE, {
    fieldName, chemical, epaRegNum, ratePerAcre, unit, costPerAcre, totalCost,
    applicatorName, applicatorLicenseNum, phi,
    hp, boomWidthFt, speedMph: speedMph || coverage.estimatedSpeed,
    startTime, endTime, fieldAcres: coverage.acresCovered,
    tankFills, tankGallons,
    windSpeed, windDir, temp,
    notes,
    ...coverage,
    totalChemical,
    totalChemicalUnit: unit,
  });

  res.status(201).json(session);
});

// DELETE /api/spraying/:id
router.delete("/:id", (req, res) => {
  const ok = db.remove(STORE, req.params.id);
  if (!ok) return res.status(404).json({ error: "Session not found" });
  res.json({ success: true });
});

module.exports = router;
