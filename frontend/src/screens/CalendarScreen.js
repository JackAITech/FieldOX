import React, { useEffect, useState } from "react";
import {
  View, Text, StyleSheet, SectionList, ActivityIndicator,
  TouchableOpacity,
} from "react-native";
import { fetchAllCrops, fetchCropDetails } from "../services/api";
import { colors } from "../theme/colors";

const MONTHS = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];

export default function CalendarScreen({ route, navigation }) {
  const zone = route.params?.zone || "6";
  const [sections, setSections] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeView, setActiveView] = useState("plant"); // "plant" | "harvest"

  useEffect(() => {
    buildCalendar();
  }, [zone, activeView]);

  async function buildCalendar() {
    setLoading(true);
    try {
      const allCrops = await fetchAllCrops();
      const details = await Promise.all(allCrops.map((c) => fetchCropDetails(c.id, zone)));

      // Group crops by month based on activeView
      const byMonth = {};
      MONTHS.forEach((m, i) => { byMonth[i + 1] = []; });

      details.forEach((crop) => {
        if (!crop.schedule) return;
        const dateKey = activeView === "plant" ? crop.schedule.plantStart : crop.schedule.harvestStart;
        const month = parseInt(dateKey.split("-")[0]);
        byMonth[month].push(crop);
      });

      const built = Object.entries(byMonth)
        .filter(([, crops]) => crops.length > 0)
        .map(([month, cropsInMonth]) => ({
          title: MONTHS[parseInt(month) - 1],
          data: cropsInMonth,
        }));

      setSections(built);
    } finally {
      setLoading(false);
    }
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Farming Calendar</Text>
        <Text style={styles.headerSub}>Zone {zone}</Text>

        {/* Toggle */}
        <View style={styles.toggle}>
          <TouchableOpacity
            style={[styles.toggleBtn, activeView === "plant" && styles.toggleBtnActive]}
            onPress={() => setActiveView("plant")}
          >
            <Text style={[styles.toggleText, activeView === "plant" && styles.toggleTextActive]}>
              🌱 Planting
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.toggleBtn, activeView === "harvest" && styles.toggleBtnActive]}
            onPress={() => setActiveView("harvest")}
          >
            <Text style={[styles.toggleText, activeView === "harvest" && styles.toggleTextActive]}>
              🌾 Harvest
            </Text>
          </TouchableOpacity>
        </View>
      </View>

      {loading ? (
        <View style={styles.centered}><ActivityIndicator size="large" color={colors.primary} /></View>
      ) : (
        <SectionList
          sections={sections}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.list}
          renderSectionHeader={({ section: { title } }) => (
            <View style={styles.monthHeader}>
              <Text style={styles.monthText}>{title}</Text>
            </View>
          )}
          renderItem={({ item }) => {
            const dateRange = activeView === "plant"
              ? `${fmtDate(item.schedule.plantStart)} – ${fmtDate(item.schedule.plantEnd)}`
              : `${fmtDate(item.schedule.harvestStart)} – ${fmtDate(item.schedule.harvestEnd)}`;

            const isActive = activeView === "plant"
              ? item.status?.phase === "plant_now"
              : item.status?.phase === "harvest_now";

            return (
              <TouchableOpacity
                style={[styles.cropRow, isActive && styles.cropRowActive]}
                onPress={() => navigation.navigate("Crops", { screen: "CropDetail", params: { cropId: item.id, zone } })}
              >
                <Text style={styles.cropEmoji}>{item.emoji}</Text>
                <View style={styles.cropInfo}>
                  <Text style={styles.cropName}>{item.name}</Text>
                  <Text style={styles.cropDate}>{dateRange}</Text>
                </View>
                {isActive && (
                  <View style={[styles.activeBadge, { backgroundColor: activeView === "plant" ? colors.plantGreen : colors.harvestAmber }]}>
                    <Text style={styles.activeBadgeText}>NOW</Text>
                  </View>
                )}
              </TouchableOpacity>
            );
          }}
          ListEmptyComponent={
            <View style={styles.centered}>
              <Text style={styles.emptyText}>No crops scheduled</Text>
            </View>
          }
        />
      )}
    </View>
  );
}

function fmtDate(mmdd) {
  if (!mmdd) return "";
  const [m, d] = mmdd.split("-");
  return `${MONTHS[parseInt(m) - 1]} ${parseInt(d)}`;
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  centered: { flex: 1, justifyContent: "center", alignItems: "center", paddingTop: 60 },
  header: { backgroundColor: colors.primaryDark, paddingTop: 60, paddingBottom: 20, paddingHorizontal: 20 },
  headerTitle: { color: "#fff", fontSize: 24, fontWeight: "800" },
  headerSub: { color: "rgba(255,255,255,0.7)", fontSize: 13, marginTop: 2, marginBottom: 14 },
  toggle: {
    flexDirection: "row", backgroundColor: "rgba(255,255,255,0.15)",
    borderRadius: 12, padding: 4,
  },
  toggleBtn: { flex: 1, paddingVertical: 8, alignItems: "center", borderRadius: 10 },
  toggleBtnActive: { backgroundColor: "#fff" },
  toggleText: { color: "rgba(255,255,255,0.7)", fontWeight: "600", fontSize: 14 },
  toggleTextActive: { color: colors.primary },
  list: { paddingBottom: 30 },
  monthHeader: {
    backgroundColor: colors.background, paddingHorizontal: 16, paddingVertical: 10,
    borderBottomWidth: 1, borderBottomColor: colors.border,
  },
  monthText: { fontSize: 16, fontWeight: "800", color: colors.primary },
  cropRow: {
    flexDirection: "row", alignItems: "center", backgroundColor: colors.surface,
    marginHorizontal: 16, marginTop: 8, borderRadius: 14, padding: 14,
    shadowColor: "#000", shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06, shadowRadius: 4, elevation: 1,
  },
  cropRowActive: { borderLeftWidth: 4, borderLeftColor: colors.primary },
  cropEmoji: { fontSize: 32, marginRight: 14 },
  cropInfo: { flex: 1 },
  cropName: { fontSize: 15, fontWeight: "700", color: colors.text },
  cropDate: { fontSize: 13, color: colors.textSecondary, marginTop: 2 },
  activeBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 10 },
  activeBadgeText: { color: "#fff", fontSize: 11, fontWeight: "800" },
  emptyText: { color: colors.textSecondary, fontSize: 15 },
});
