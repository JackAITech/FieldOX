const express = require("express");
const db = require("../store/db");
const router = express.Router();

const STORE = "moisture";

// Moisture level thresholds (%)
function classifyMoisture(pct) {
  if (pct <= 20) return { label: "Very Dry", color: "#D84315", action: "Irrigate immediately" };
  if (pct <= 35) return { label: "Dry", color: "#F57C00", action: "Consider irrigation soon" };
  if (pct <= 55) return { label: "Adequate", color: "#388E3C", action: "Good for most crops" };
  if (pct <= 70) return { label: "Moist", color: "#1976D2", action: "Ideal for planting" };
  if (pct <= 85) return { label: "Wet", color: "#0288D1", action: "Hold off on irrigation" };
  return { label: "Saturated", color: "#6A1B9A", action: "Risk of root rot — improve drainage" };
}

// GET /api/moisture — all readings
router.get("/", (req, res) => {
  const records = db.getAll(STORE);
  res.json(records.map((r) => ({ ...r, status: classifyMoisture(r.moisture) })));
});

// GET /api/moisture/fields — unique field names
router.get("/fields", (req, res) => {
  const records = db.getAll(STORE);
  const fields = [...new Set(records.map((r) => r.fieldName))].filter(Boolean);
  res.json(fields);
});

// GET /api/moisture/field/:name — readings for one field
router.get("/field/:name", (req, res) => {
  const records = db.getAll(STORE).filter(
    (r) => r.fieldName.toLowerCase() === req.params.name.toLowerCase()
  );
  res.json(records.map((r) => ({ ...r, status: classifyMoisture(r.moisture) })));
});

// POST /api/moisture — log a new reading
// Body: { fieldName, moisture (0-100%), depth ("surface"|"6in"|"12in"), notes }
router.post("/", (req, res) => {
  const { fieldName, moisture, depth = "surface", notes = "" } = req.body;

  if (!fieldName || moisture === undefined) {
    return res.status(400).json({ error: "fieldName and moisture are required" });
  }
  const pct = parseFloat(moisture);
  if (isNaN(pct) || pct < 0 || pct > 100) {
    return res.status(400).json({ error: "moisture must be 0–100" });
  }

  const record = db.insert(STORE, { fieldName, moisture: pct, depth, notes });
  res.status(201).json({ ...record, status: classifyMoisture(pct) });
});

// DELETE /api/moisture/:id
router.delete("/:id", (req, res) => {
  const ok = db.remove(STORE, req.params.id);
  if (!ok) return res.status(404).json({ error: "Record not found" });
  res.json({ success: true });
});

module.exports = router;
