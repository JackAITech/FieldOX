const express = require("express");
const crops = require("../data/crops.json");
const router = express.Router();

// GET /api/crops — list all crops
router.get("/", (req, res) => {
  const summary = crops.map(({ id, name, emoji, category }) => ({ id, name, emoji, category }));
  res.json(summary);
});

// GET /api/crops/:id?zone=6 — full crop details with zone-specific schedule
router.get("/:id", (req, res) => {
  const crop = crops.find((c) => c.id === req.params.id);
  if (!crop) return res.status(404).json({ error: "Crop not found" });

  const zone = req.query.zone || "6";
  const zoneKey = zone.toString().replace(/[ab]/i, ""); // normalize "6a" -> "6"

  // Try exact zone, then nearest zone
  let schedule = crop.zones[zoneKey];
  if (!schedule) {
    const zoneNum = parseInt(zoneKey);
    const available = Object.keys(crop.zones).map(Number).sort((a, b) => a - b);
    const nearest = available.reduce((prev, curr) =>
      Math.abs(curr - zoneNum) < Math.abs(prev - zoneNum) ? curr : prev
    );
    schedule = crop.zones[nearest.toString()];
  }

  const today = new Date();
  const status = getPlantingStatus(schedule, today);

  res.json({
    ...crop,
    zones: undefined,
    schedule,
    status,
    zone: zoneKey,
  });
});

// Determine current planting/harvest status
function getPlantingStatus(schedule, today) {
  if (!schedule) return { phase: "unknown", message: "No schedule data for this zone" };

  const year = today.getFullYear();
  const toDate = (str) => new Date(`${year}-${str}`);

  const plantStart = toDate(schedule.plantStart);
  const plantEnd = toDate(schedule.plantEnd);
  const harvestStart = toDate(schedule.harvestStart);
  const harvestEnd = toDate(schedule.harvestEnd);

  // Handle winter wheat (harvest year may be same year as plant year + 1)
  const isWinterCrop = harvestStart < plantStart;
  const adjHarvestStart = isWinterCrop ? new Date(`${year + 1}-${schedule.harvestStart}`) : harvestStart;
  const adjHarvestEnd = isWinterCrop ? new Date(`${year + 1}-${schedule.harvestEnd}`) : harvestEnd;

  const daysUntil = (date) => Math.ceil((date - today) / (1000 * 60 * 60 * 24));

  if (today >= plantStart && today <= plantEnd) {
    return {
      phase: "plant_now",
      message: "Plant now! You are in the planting window.",
      daysLeft: daysUntil(plantEnd),
    };
  }
  if (today < plantStart) {
    const days = daysUntil(plantStart);
    return {
      phase: "before_planting",
      message: `Planting season starts in ${days} day${days !== 1 ? "s" : ""}.`,
      daysUntilPlanting: days,
    };
  }
  if (today > plantEnd && today < adjHarvestStart) {
    const days = daysUntil(adjHarvestStart);
    return {
      phase: "growing",
      message: `Crop is growing. Harvest begins in approximately ${days} day${days !== 1 ? "s" : ""}.`,
      daysUntilHarvest: days,
    };
  }
  if (today >= adjHarvestStart && today <= adjHarvestEnd) {
    return {
      phase: "harvest_now",
      message: "Harvest time! Your crop should be ready to harvest.",
      daysLeft: daysUntil(adjHarvestEnd),
    };
  }

  return {
    phase: "season_over",
    message: "Season is over. Prepare for next year.",
  };
}

module.exports = router;
