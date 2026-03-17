import axios from "axios";

// Change to your computer's local IP when testing on a physical device
// e.g., "http://192.168.1.100:3001"
const BASE_URL = "http://localhost:3001";

const api = axios.create({ baseURL: BASE_URL, timeout: 10000 });

export const fetchWeather = (lat, lon) =>
  api.get(`/api/weather?lat=${lat}&lon=${lon}`).then((r) => r.data);

export const fetchZone = (lat, lon) =>
  api.get(`/api/zone?lat=${lat}&lon=${lon}`).then((r) => r.data);

export const fetchAllCrops = () =>
  api.get("/api/crops").then((r) => r.data);

export const fetchCropDetails = (cropId, zone) =>
  api.get(`/api/crops/${cropId}?zone=${zone}`).then((r) => r.data);

// Moisture
export const fetchMoistureReadings = () =>
  api.get("/api/moisture").then((r) => r.data);

export const fetchMoistureFields = () =>
  api.get("/api/moisture/fields").then((r) => r.data);

export const fetchFieldMoisture = (fieldName) =>
  api.get(`/api/moisture/field/${encodeURIComponent(fieldName)}`).then((r) => r.data);

export const logMoistureReading = (body) =>
  api.post("/api/moisture", body).then((r) => r.data);

export const deleteMoistureReading = (id) =>
  api.delete(`/api/moisture/${id}`).then((r) => r.data);

// Spraying
export const fetchSprayConfig = () =>
  api.get("/api/spraying/config").then((r) => r.data);

export const saveSprayConfig = (body) =>
  api.post("/api/spraying/config", body).then((r) => r.data);

export const calculateCoverage = (body) =>
  api.post("/api/spraying/calculate", body).then((r) => r.data);

export const fetchSpraySessions = () =>
  api.get("/api/spraying").then((r) => r.data);

export const logSpraySession = (body) =>
  api.post("/api/spraying", body).then((r) => r.data);

export const deleteSpraySession = (id) =>
  api.delete(`/api/spraying/${id}`).then((r) => r.data);

// Fields
export const fetchFields = () =>
  api.get("/api/fields").then((r) => r.data);

export const fetchFieldStats = () =>
  api.get("/api/fields/summary/stats").then((r) => r.data);

export const createField = (body) =>
  api.post("/api/fields", body).then((r) => r.data);

export const updateField = (id, body) =>
  api.patch(`/api/fields/${id}`, body).then((r) => r.data);

export const deleteField = (id) =>
  api.delete(`/api/fields/${id}`).then((r) => r.data);

// Analytics
export const fetchSeasonAnalytics = () =>
  api.get("/api/analytics/season").then((r) => r.data);
