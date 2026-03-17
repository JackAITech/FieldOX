import React, { useEffect, useState, useCallback } from "react";
import {
  View, Text, StyleSheet, ScrollView, ActivityIndicator,
  TouchableOpacity, RefreshControl,
} from "react-native";
import * as Location from "expo-location";
import { fetchWeather, fetchZone, fetchSeasonAnalytics, fetchFields } from "../services/api";
import { colors } from "../theme/colors";

export default function HomeScreen({ navigation }) {
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [weather, setWeather] = useState(null);
  const [zone, setZone] = useState(null);
  const [analytics, setAnalytics] = useState(null);
  const [fields, setFields] = useState([]);
  const [error, setError] = useState(null);

  const load = useCallback(async (isRefresh = false) => {
    if (!isRefresh) setLoading(true);
    setError(null);
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== "granted") {
        setError("Location permission required. Enable it in device settings.");
        return;
      }
      const loc = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
      const { latitude, longitude } = loc.coords;

      const [weatherData, zoneData, analyticsData, fieldsData] = await Promise.all([
        fetchWeather(latitude, longitude),
        fetchZone(latitude, longitude),
        fetchSeasonAnalytics(),
        fetchFields(),
      ]);
      setWeather(weatherData);
      setZone(zoneData);
      setAnalytics(analyticsData);
      setFields(fieldsData);
    } catch (err) {
      setError("Could not load data. Ensure the backend server is running.");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => { load(); }, []);

  if (loading) {
    return (
      <View style={styles.loadingScreen}>
        <View style={styles.logoBlock}>
          <Text style={styles.logoText}>FIELDOX</Text>
          <Text style={styles.logoPro}></Text>
        </View>
        <ActivityIndicator size="large" color={colors.accent} style={{ marginTop: 40 }} />
        <Text style={styles.loadingLabel}>Fetching field conditions...</Text>
      </View>
    );
  }

  if (error) {
    return (
      <View style={styles.errorScreen}>
        <Text style={styles.errorIcon}>⚠</Text>
        <Text style={styles.errorTitle}>Connection Error</Text>
        <Text style={styles.errorMsg}>{error}</Text>
        <TouchableOpacity style={styles.retryBtn} onPress={() => load()}>
          <Text style={styles.retryBtnText}>Retry</Text>
        </TouchableOpacity>
      </View>
    );
  }

  // Moisture alerts from analytics
  const alertCount = analytics?.moistureAlerts || 0;

  return (
    <ScrollView
      style={styles.container}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); load(true); }} tintColor={colors.accent} />
      }
    >
      {/* ── Top Bar ─────────────────────────────────────────────── */}
      <View style={styles.topBar}>
        <View>
          <Text style={styles.brandName}>FIELDOX <Text style={styles.brandPro}></Text></Text>
          <Text style={styles.locationLine}>
            {weather?.location?.city ? `${weather.location.city}, ${weather.location.country}` : "Locating..."}
            {zone ? `  ·  Zone ${zone.zone}` : ""}
          </Text>
        </View>
        <View style={styles.topBarRight}>
          {alertCount > 0 && (
            <View style={styles.alertBadge}>
              <Text style={styles.alertBadgeText}>{alertCount} Alert{alertCount !== 1 ? "s" : ""}</Text>
            </View>
          )}
          <Text style={styles.dateText}>{formatToday()}</Text>
        </View>
      </View>

      {/* ── KPI Row ─────────────────────────────────────────────── */}
      <View style={styles.kpiRow}>
        <KPICard label="Acres Managed" value={analytics?.totalAcresManaged ?? "—"} unit="ac" icon="▦" color={colors.accent} />
        <KPICard label="Active Fields" value={analytics?.totalFields ?? fields.length} unit="" icon="◈" color={colors.gold} />
        <KPICard label="Spray Cost YTD" value={analytics?.totalSprayCost ? `$${analytics.totalSprayCost.toLocaleString()}` : "$0"} unit="" icon="$" color={colors.harvest} />
        <KPICard label="Spray Sessions" value={analytics?.totalSpraySessions ?? "—"} unit="" icon="⌬" color={colors.primaryLight} />
      </View>

      {/* ── Weather Strip ───────────────────────────────────────── */}
      {weather && (
        <View style={styles.weatherStrip}>
          <View style={styles.weatherStripLeft}>
            <Text style={styles.weatherTemp}>{weather.current.temp}°F</Text>
            <Text style={styles.weatherDesc}>{capitalize(weather.current.description)}</Text>
          </View>
          <View style={styles.weatherStripMeta}>
            <MetaPill label="Humidity" value={`${weather.current.humidity}%`} />
            <MetaPill label="Wind" value={`${weather.current.windSpeed} mph`} />
            <MetaPill label="Feels" value={`${weather.current.feelsLike}°F`} />
          </View>
        </View>
      )}

      {/* ── 5-Day Forecast ──────────────────────────────────────── */}
      {weather?.forecast && (
        <View style={styles.section}>
          <SectionHeader title="5-Day Forecast" />
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.forecastScroll}>
            {weather.forecast.map((day) => (
              <View key={day.date} style={styles.forecastCard}>
                <Text style={styles.forecastDay}>{shortDay(day.date)}</Text>
                <Text style={styles.forecastIcon}>{conditionIcon(day.description)}</Text>
                <Text style={styles.forecastHigh}>{day.high}°</Text>
                <Text style={styles.forecastLow}>{day.low}°</Text>
                <Text style={styles.forecastHumid}>{day.humidity}%</Text>
              </View>
            ))}
          </ScrollView>
        </View>
      )}

      {/* ── Zone Info ───────────────────────────────────────────── */}
      {zone && (
        <View style={styles.section}>
          <SectionHeader title="Agricultural Zone" />
          <View style={styles.zoneCard}>
            <View style={styles.zoneLeft}>
              <Text style={styles.zoneNum}>Zone {zone.zone}</Text>
              <Text style={styles.zoneDesc}>{zone.description}</Text>
              {zone.annualMinTempF && (
                <Text style={styles.zoneMeta}>Avg annual min: {zone.annualMinTempF}°F</Text>
              )}
            </View>
            <View style={styles.zoneBadgeBlock}>
              <Text style={styles.zoneBadgeText}>USDA</Text>
              <Text style={styles.zoneBadgeText}>Hardiness</Text>
            </View>
          </View>
        </View>
      )}

      {/* ── Field Summary ───────────────────────────────────────── */}
      {fields.length > 0 && (
        <View style={styles.section}>
          <SectionHeader title="Fields at a Glance" action="Manage" onAction={() => navigation.navigate("Fields")} />
          {fields.slice(0, 4).map((f) => (
            <View key={f.id} style={styles.fieldRow}>
              <View style={styles.fieldRowLeft}>
                <Text style={styles.fieldName}>{f.name}</Text>
                <Text style={styles.fieldMeta}>{f.acres} ac{f.crop ? `  ·  ${f.crop}` : ""}{f.soilType ? `  ·  ${f.soilType}` : ""}</Text>
              </View>
              <StatusDot status={f.status} />
            </View>
          ))}
          {fields.length > 4 && (
            <TouchableOpacity onPress={() => navigation.navigate("Fields")}>
              <Text style={styles.moreLink}>+ {fields.length - 4} more fields</Text>
            </TouchableOpacity>
          )}
        </View>
      )}

      {/* ── Quick Actions ───────────────────────────────────────── */}
      <View style={styles.section}>
        <SectionHeader title="Quick Actions" />
        <View style={styles.actionsGrid}>
          <ActionBtn label="Log Spray" icon="🌿" onPress={() => navigation.navigate("Spraying")} />
          <ActionBtn label="Moisture Check" icon="💧" onPress={() => navigation.navigate("Moisture")} />
          <ActionBtn label="Crop Calendar" icon="📅" onPress={() => navigation.navigate("Calendar")} />
          <ActionBtn label="Field Registry" icon="▦" onPress={() => navigation.navigate("Fields")} />
        </View>
      </View>

      <View style={{ height: 32 }} />
    </ScrollView>
  );
}

// ── Sub-components ─────────────────────────────────────────────────────────

function KPICard({ label, value, unit, icon, color }) {
  return (
    <View style={[styles.kpiCard, { borderTopColor: color }]}>
      <Text style={[styles.kpiIcon, { color }]}>{icon}</Text>
      <Text style={styles.kpiValue}>{value}{unit ? <Text style={styles.kpiUnit}> {unit}</Text> : null}</Text>
      <Text style={styles.kpiLabel}>{label}</Text>
    </View>
  );
}

function MetaPill({ label, value }) {
  return (
    <View style={styles.metaPill}>
      <Text style={styles.metaPillLabel}>{label}</Text>
      <Text style={styles.metaPillValue}>{value}</Text>
    </View>
  );
}

function SectionHeader({ title, action, onAction }) {
  return (
    <View style={styles.sectionHeader}>
      <Text style={styles.sectionTitle}>{title}</Text>
      {action && (
        <TouchableOpacity onPress={onAction}>
          <Text style={styles.sectionAction}>{action} →</Text>
        </TouchableOpacity>
      )}
    </View>
  );
}

function StatusDot({ status }) {
  const map = { active: colors.accent, fallow: colors.gold, problem: colors.danger };
  return <View style={[styles.statusDot, { backgroundColor: map[status] || colors.textMuted }]} />;
}

function ActionBtn({ label, icon, onPress }) {
  return (
    <TouchableOpacity style={styles.actionBtn} onPress={onPress}>
      <Text style={styles.actionIcon}>{icon}</Text>
      <Text style={styles.actionLabel}>{label}</Text>
    </TouchableOpacity>
  );
}

// ── Helpers ────────────────────────────────────────────────────────────────

function formatToday() {
  return new Date().toLocaleDateString([], { weekday: "long", month: "short", day: "numeric" });
}

function capitalize(str) {
  return str ? str.charAt(0).toUpperCase() + str.slice(1) : "";
}

function shortDay(dateStr) {
  return new Date(dateStr + "T12:00:00").toLocaleDateString([], { weekday: "short", month: "numeric", day: "numeric" });
}

function conditionIcon(desc) {
  const map = {
    "clear sky": "☀", "few clouds": "🌤", "scattered clouds": "⛅",
    "broken clouds": "☁", "shower rain": "🌦", "rain": "🌧",
    "thunderstorm": "⛈", "snow": "❄", "mist": "🌫",
  };
  return map[desc] || "🌡";
}

// ── Styles ─────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },

  loadingScreen: { flex: 1, backgroundColor: colors.headerBg, justifyContent: "center", alignItems: "center" },
  logoBlock: { flexDirection: "row", alignItems: "flex-end" },
  logoText: { color: "#fff", fontSize: 34, fontWeight: "900", letterSpacing: 4 },
  logoPro: { color: colors.accent, fontSize: 16, fontWeight: "800", marginLeft: 6, marginBottom: 4, letterSpacing: 2 },
  loadingLabel: { color: colors.headerSub, marginTop: 16, fontSize: 14 },

  errorScreen: { flex: 1, backgroundColor: colors.background, justifyContent: "center", alignItems: "center", padding: 32 },
  errorIcon: { fontSize: 40, color: colors.warning, marginBottom: 12 },
  errorTitle: { fontSize: 20, fontWeight: "800", color: colors.text, marginBottom: 8 },
  errorMsg: { color: colors.textSecondary, textAlign: "center", fontSize: 14, marginBottom: 24 },
  retryBtn: { backgroundColor: colors.primary, paddingHorizontal: 36, paddingVertical: 12, borderRadius: 8 },
  retryBtnText: { color: "#fff", fontWeight: "700", fontSize: 15 },

  // Top bar
  topBar: {
    backgroundColor: colors.headerBg, paddingTop: 60, paddingBottom: 20,
    paddingHorizontal: 20, flexDirection: "row", justifyContent: "space-between", alignItems: "flex-end",
  },
  brandName: { color: "#fff", fontSize: 22, fontWeight: "900", letterSpacing: 3 },
  brandPro: { color: colors.accent, fontSize: 13, fontWeight: "800", letterSpacing: 2 },
  locationLine: { color: colors.headerSub, fontSize: 12, marginTop: 4 },
  topBarRight: { alignItems: "flex-end" },
  alertBadge: { backgroundColor: colors.danger, borderRadius: 6, paddingHorizontal: 10, paddingVertical: 4, marginBottom: 6 },
  alertBadgeText: { color: "#fff", fontSize: 11, fontWeight: "700" },
  dateText: { color: colors.headerSub, fontSize: 12 },

  // KPI Row
  kpiRow: {
    flexDirection: "row", backgroundColor: colors.surface,
    borderBottomWidth: 1, borderBottomColor: colors.border,
  },
  kpiCard: {
    flex: 1, padding: 14, borderTopWidth: 3, alignItems: "center",
    borderRightWidth: 1, borderRightColor: colors.border,
  },
  kpiIcon: { fontSize: 14, fontWeight: "800", marginBottom: 4 },
  kpiValue: { fontSize: 17, fontWeight: "800", color: colors.text },
  kpiUnit: { fontSize: 11, fontWeight: "500", color: colors.textSecondary },
  kpiLabel: { fontSize: 9, color: colors.textMuted, fontWeight: "600", textAlign: "center", marginTop: 2, letterSpacing: 0.5 },

  // Weather
  weatherStrip: {
    backgroundColor: colors.primary, paddingHorizontal: 20, paddingVertical: 16,
    flexDirection: "row", alignItems: "center",
  },
  weatherStripLeft: { marginRight: 20 },
  weatherTemp: { color: "#fff", fontSize: 36, fontWeight: "800" },
  weatherDesc: { color: "rgba(255,255,255,0.7)", fontSize: 12, marginTop: 2 },
  weatherStripMeta: { flexDirection: "row", gap: 8, flexWrap: "wrap", flex: 1 },
  metaPill: { backgroundColor: "rgba(255,255,255,0.12)", borderRadius: 6, paddingHorizontal: 10, paddingVertical: 5 },
  metaPillLabel: { color: "rgba(255,255,255,0.6)", fontSize: 9, fontWeight: "600", letterSpacing: 0.5 },
  metaPillValue: { color: "#fff", fontSize: 13, fontWeight: "700" },

  // Sections
  section: { marginTop: 0, paddingTop: 20, paddingHorizontal: 16 },
  sectionHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 10 },
  sectionTitle: { fontSize: 11, fontWeight: "800", color: colors.textMuted, letterSpacing: 1.5 },
  sectionAction: { fontSize: 12, color: colors.accent, fontWeight: "700" },

  // Forecast
  forecastScroll: { marginHorizontal: -4 },
  forecastCard: {
    backgroundColor: colors.surface, borderRadius: 10, padding: 12, marginHorizontal: 4,
    alignItems: "center", minWidth: 70, borderWidth: 1, borderColor: colors.border,
  },
  forecastDay: { fontSize: 10, color: colors.textMuted, fontWeight: "700", marginBottom: 4 },
  forecastIcon: { fontSize: 20, marginBottom: 4 },
  forecastHigh: { fontSize: 14, fontWeight: "800", color: colors.text },
  forecastLow: { fontSize: 12, color: colors.textSecondary },
  forecastHumid: { fontSize: 10, color: colors.textMuted, marginTop: 2 },

  // Zone
  zoneCard: {
    backgroundColor: colors.surface, borderRadius: 10, padding: 16, borderWidth: 1,
    borderColor: colors.border, flexDirection: "row", alignItems: "center",
  },
  zoneLeft: { flex: 1 },
  zoneNum: { fontSize: 22, fontWeight: "900", color: colors.primary },
  zoneDesc: { fontSize: 13, color: colors.textSecondary, marginTop: 2 },
  zoneMeta: { fontSize: 11, color: colors.textMuted, marginTop: 4 },
  zoneBadgeBlock: {
    backgroundColor: colors.primaryFaint, borderRadius: 8, paddingHorizontal: 12, paddingVertical: 8, alignItems: "center",
  },
  zoneBadgeText: { fontSize: 10, color: colors.primary, fontWeight: "800", letterSpacing: 1 },

  // Fields
  fieldRow: {
    flexDirection: "row", alignItems: "center", backgroundColor: colors.surface,
    borderRadius: 8, paddingHorizontal: 14, paddingVertical: 12, marginBottom: 6,
    borderWidth: 1, borderColor: colors.border,
  },
  fieldRowLeft: { flex: 1 },
  fieldName: { fontSize: 14, fontWeight: "700", color: colors.text },
  fieldMeta: { fontSize: 11, color: colors.textMuted, marginTop: 2 },
  statusDot: { width: 9, height: 9, borderRadius: 5 },
  moreLink: { color: colors.accent, fontSize: 13, fontWeight: "600", textAlign: "center", paddingVertical: 8 },

  // Quick Actions
  actionsGrid: { flexDirection: "row", flexWrap: "wrap", gap: 10 },
  actionBtn: {
    flex: 1, minWidth: "45%", backgroundColor: colors.surface, borderRadius: 10,
    padding: 16, alignItems: "center", borderWidth: 1, borderColor: colors.border,
  },
  actionIcon: { fontSize: 24, marginBottom: 6 },
  actionLabel: { fontSize: 12, fontWeight: "700", color: colors.text },
});
