const express = require("express");
const db = require("../store/db");
const router = express.Router();

const STORE = "fields";

// GET /api/fields
router.get("/", (req, res) => {
  res.json(db.getAll(STORE));
});

// GET /api/fields/:id
router.get("/:id", (req, res) => {
  const fields = db.getAll(STORE);
  const field = fields.find((f) => f.id === req.params.id);
  if (!field) return res.status(404).json({ error: "Field not found" });
  res.json(field);
});

// POST /api/fields
// Body: { name, acres, crop, zone, soilType, notes, irrigated, owned }
router.post("/", (req, res) => {
  const { name, acres, crop = "", zone = "", soilType = "", notes = "", irrigated = false, owned = true } = req.body;
  if (!name || !acres) return res.status(400).json({ error: "name and acres are required" });

  const record = db.insert(STORE, {
    name, acres: parseFloat(acres), crop, zone, soilType, notes, irrigated, owned,
    status: "active",
  });
  res.status(201).json(record);
});

// PATCH /api/fields/:id
router.patch("/:id", (req, res) => {
  const updated = db.update(STORE, req.params.id, req.body);
  if (!updated) return res.status(404).json({ error: "Field not found" });
  res.json(updated);
});

// DELETE /api/fields/:id
router.delete("/:id", (req, res) => {
  const ok = db.remove(STORE, req.params.id);
  if (!ok) return res.status(404).json({ error: "Field not found" });
  res.json({ success: true });
});

// GET /api/fields/summary/stats
router.get("/summary/stats", (req, res) => {
  const fields = db.getAll(STORE);
  const totalAcres = fields.reduce((sum, f) => sum + (f.acres || 0), 0);
  const activeFields = fields.filter((f) => f.status === "active").length;
  const cropBreakdown = {};
  fields.forEach((f) => {
    if (f.crop) cropBreakdown[f.crop] = (cropBreakdown[f.crop] || 0) + (f.acres || 0);
  });
  res.json({ totalFields: fields.length, activeFields, totalAcres, cropBreakdown });
});

module.exports = router;
