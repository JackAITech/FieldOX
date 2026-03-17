require("dotenv").config();
const express = require("express");
const cors = require("cors");

const weatherRouter = require("./routes/weather");
const zoneRouter = require("./routes/zone");
const cropsRouter = require("./routes/crops");
const moistureRouter = require("./routes/moisture");
const sprayingRouter = require("./routes/spraying");
const fieldsRouter = require("./routes/fields");
const subscriptionRouter = require("./routes/subscription");

const app = express();
const PORT = process.env.PORT || 3001;

app.use(cors());
app.use(express.json());

// Routes
app.use("/api/weather", weatherRouter);
app.use("/api/zone", zoneRouter);
app.use("/api/crops", cropsRouter);
app.use("/api/moisture", moistureRouter);
app.use("/api/spraying", sprayingRouter);
app.use("/api/fields", fieldsRouter);
app.use("/api/subscription", subscriptionRouter);

// Aggregated season analytics
app.get("/api/analytics/season", (req, res) => {
  const db = require("./store/db");
  const sessions = db.getAll("spraying");
  const moisture = db.getAll("moisture");
  const fields = db.getAll("fields");

  const totalAcresManaged = fields.reduce((s, f) => s + (f.acres || 0), 0);
  const totalSprayAcres = sessions.reduce((s, r) => s + (r.acresCovered || 0), 0);
  const totalSprayCost = sessions.reduce((s, r) => s + (r.totalCost || 0), 0);
  const totalSprayHours = sessions.reduce((s, r) => s + (r.hoursWorked || 0), 0);

  const fieldActivity = {};
  sessions.forEach((s) => {
    if (!fieldActivity[s.fieldName]) fieldActivity[s.fieldName] = { sessions: 0, acres: 0, cost: 0 };
    fieldActivity[s.fieldName].sessions += 1;
    fieldActivity[s.fieldName].acres += s.acresCovered || 0;
    fieldActivity[s.fieldName].cost += s.totalCost || 0;
  });

  // Moisture alerts: any reading under 30% is flagged
  const moistureAlerts = moisture
    .filter((r) => r.moisture <= 30)
    .reduce((acc, r) => {
      if (!acc.find((a) => a.fieldName === r.fieldName)) acc.push(r);
      return acc;
    }, []);

  res.json({
    totalFields: fields.length,
    totalAcresManaged: Math.round(totalAcresManaged * 10) / 10,
    totalSprayAcres: Math.round(totalSprayAcres * 10) / 10,
    totalSprayCost: Math.round(totalSprayCost * 100) / 100,
    totalSprayHours: Math.round(totalSprayHours * 10) / 10,
    totalSpraySessions: sessions.length,
    moistureReadings: moisture.length,
    moistureAlerts: moistureAlerts.length,
    fieldActivity,
  });
});

// Health check
app.get("/api/health", (req, res) => {
  res.json({ status: "ok", timestamp: new Date().toISOString() });
});

app.listen(PORT, () => {
  console.log(`Farmer App API running on http://localhost:${PORT}`);
});
