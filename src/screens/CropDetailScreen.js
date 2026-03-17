import React, { useEffect, useState } from "react";
import {
  View, Text, StyleSheet, ScrollView, ActivityIndicator, TouchableOpacity,
} from "react-native";
import { fetchCropDetails } from "../services/api";
import { colors } from "../theme/colors";

const PHASE_CONFIG = {
  plant_now: { color: colors.plantGreen, bg: "#E8F5E9", label: "Plant Now!", icon: "🌱" },
  before_planting: { color: colors.growingBlue, bg: "#E3F2FD", label: "Before Planting", icon: "📅" },
  growing: { color: colors.growingBlue, bg: "#E3F2FD", label: "Growing", icon: "🌿" },
  harvest_now: { color: colors.harvestAmber, bg: "#FFF3E0", label: "Harvest Now!", icon: "🌾" },
  season_over: { color: colors.textSecondary, bg: colors.background, label: "Season Over", icon: "💤" },
  unknown: { color: colors.textSecondary, bg: colors.background, label: "Unknown", icon: "❓" },
};

export default function CropDetailScreen({ route, navigation }) {
  const { cropId, zone } = route.params;
  const [crop, setCrop] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    fetchCropDetails(cropId, zone)
      .then(setCrop)
      .catch(() => setError("Failed to load crop details."))
      .finally(() => setLoading(false));
  }, [cropId, zone]);

  if (loading) {
    return <View style={styles.centered}><ActivityIndicator size="large" color={colors.primary} /></View>;
  }
  if (error || !crop) {
    return <View style={styles.centered}><Text style={styles.errorText}>{error}</Text></View>;
  }

  const phaseConf = PHASE_CONFIG[crop.status?.phase] || PHASE_CONFIG.unknown;

  return (
    <ScrollView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Text style={styles.backBtnText}>← Back</Text>
        </TouchableOpacity>
        <Text style={styles.cropEmoji}>{crop.emoji}</Text>
        <Text style={styles.cropName}>{crop.name}</Text>
        <Text style={styles.cropCategory}>{crop.category} · Zone {zone}</Text>
      </View>

      {/* Status Banner */}
      <View style={[styles.statusBanner, { backgroundColor: phaseConf.bg }]}>
        <Text style={styles.statusIcon}>{phaseConf.icon}</Text>
        <View style={styles.statusText}>
          <Text style={[styles.statusLabel, { color: phaseConf.color }]}>{phaseConf.label}</Text>
          <Text style={styles.statusMessage}>{crop.status?.message}</Text>
        </View>
      </View>

      {/* Planting Calendar */}
      {crop.schedule && (
        <View style={styles.card}>
          <Text style={styles.cardTitle}>📅 Planting & Harvest Calendar</Text>
          <CalendarRow
            icon="🌱" label="Plant Window"
            value={`${formatDate(crop.schedule.plantStart)} – ${formatDate(crop.schedule.plantEnd)}`}
            highlight={crop.status?.phase === "plant_now"}
            color={colors.plantGreen}
          />
          <CalendarRow
            icon="🌿" label="Growing Period"
            value={`${crop.schedule.daysToMaturity} days to maturity`}
            color={colors.growingBlue}
          />
          <CalendarRow
            icon="🌾" label="Harvest Window"
            value={`${formatDate(crop.schedule.harvestStart)} – ${formatDate(crop.schedule.harvestEnd)}`}
            highlight={crop.status?.phase === "harvest_now"}
            color={colors.harvestAmber}
          />
        </View>
      )}

      {/* Growing Requirements */}
      <View style={styles.card}>
        <Text style={styles.cardTitle}>🌡 Growing Requirements</Text>
        <InfoRow icon="🌡" label="Min Soil Temp" value={`${crop.soilTemp}°F`} />
        <InfoRow icon="☀️" label="Sunlight" value={crop.sunlight} />
        <InfoRow icon="💧" label="Water" value={crop.water} />
        <InfoRow icon="📐" label="Spacing" value={crop.spacing} />
      </View>

      {/* Tips */}
      <View style={[styles.card, styles.tipsCard]}>
        <Text style={styles.cardTitle}>💡 Farmer Tips</Text>
        <Text style={styles.tipsText}>{crop.tips}</Text>
      </View>

      <View style={{ height: 32 }} />
    </ScrollView>
  );
}

function CalendarRow({ icon, label, value, highlight, color }) {
  return (
    <View style={[styles.calRow, highlight && { backgroundColor: color + "18", borderRadius: 10 }]}>
      <Text style={styles.rowIcon}>{icon}</Text>
      <View style={styles.rowContent}>
        <Text style={styles.rowLabel}>{label}</Text>
        <Text style={[styles.rowValue, highlight && { color, fontWeight: "800" }]}>{value}</Text>
      </View>
      {highlight && <Text style={[styles.highlightBadge, { color, borderColor: color }]}>NOW</Text>}
    </View>
  );
}

function InfoRow({ icon, label, value }) {
  return (
    <View style={styles.infoRow}>
      <Text style={styles.rowIcon}>{icon}</Text>
      <View style={styles.rowContent}>
        <Text style={styles.rowLabel}>{label}</Text>
        <Text style={styles.rowValue}>{value}</Text>
      </View>
    </View>
  );
}

function formatDate(mmdd) {
  if (!mmdd) return "";
  const [month, day] = mmdd.split("-");
  const date = new Date(2000, parseInt(month) - 1, parseInt(day));
  return date.toLocaleDateString([], { month: "long", day: "numeric" });
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  centered: { flex: 1, justifyContent: "center", alignItems: "center" },
  errorText: { color: colors.error, fontSize: 15 },
  header: {
    backgroundColor: colors.primaryDark, paddingTop: 60, paddingBottom: 28,
    paddingHorizontal: 20, alignItems: "center",
  },
  backBtn: { alignSelf: "flex-start", marginBottom: 16 },
  backBtnText: { color: "rgba(255,255,255,0.8)", fontSize: 15 },
  cropEmoji: { fontSize: 64, marginBottom: 8 },
  cropName: { color: "#fff", fontSize: 26, fontWeight: "800", textAlign: "center" },
  cropCategory: { color: "rgba(255,255,255,0.7)", fontSize: 14, marginTop: 4 },
  statusBanner: {
    margin: 16, borderRadius: 16, padding: 16, flexDirection: "row", alignItems: "center",
  },
  statusIcon: { fontSize: 36, marginRight: 14 },
  statusText: { flex: 1 },
  statusLabel: { fontSize: 18, fontWeight: "800", marginBottom: 2 },
  statusMessage: { fontSize: 14, color: colors.text },
  card: {
    backgroundColor: colors.surface, margin: 16, marginTop: 0, borderRadius: 16,
    padding: 18, shadowColor: "#000", shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.07, shadowRadius: 6, elevation: 2,
  },
  tipsCard: { backgroundColor: "#FFFDE7" },
  cardTitle: { fontSize: 15, fontWeight: "700", color: colors.text, marginBottom: 14 },
  calRow: { flexDirection: "row", alignItems: "center", paddingVertical: 10, paddingHorizontal: 8, marginBottom: 4 },
  infoRow: { flexDirection: "row", alignItems: "center", paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: colors.border },
  rowIcon: { fontSize: 22, width: 36 },
  rowContent: { flex: 1 },
  rowLabel: { fontSize: 12, color: colors.textSecondary, fontWeight: "600", marginBottom: 2 },
  rowValue: { fontSize: 15, color: colors.text, fontWeight: "500" },
  highlightBadge: {
    fontSize: 11, fontWeight: "800", borderWidth: 1.5, borderRadius: 8,
    paddingHorizontal: 8, paddingVertical: 2,
  },
  tipsText: { fontSize: 15, color: colors.text, lineHeight: 22 },
});
