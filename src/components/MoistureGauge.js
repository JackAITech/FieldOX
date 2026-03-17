import React from "react";
import { View, Text, StyleSheet } from "react-native";

const SEGMENTS = [
  { max: 20,  label: "Very Dry",  color: "#D84315" },
  { max: 35,  label: "Dry",       color: "#F57C00" },
  { max: 55,  label: "Adequate",  color: "#388E3C" },
  { max: 70,  label: "Moist",     color: "#1976D2" },
  { max: 85,  label: "Wet",       color: "#0288D1" },
  { max: 100, label: "Saturated", color: "#6A1B9A" },
];

function getSegment(pct) {
  return SEGMENTS.find((s) => pct <= s.max) || SEGMENTS[SEGMENTS.length - 1];
}

export default function MoistureGauge({ value, size = "md" }) {
  const seg = getSegment(value);
  const barWidth = `${value}%`;
  const isLarge = size === "lg";

  return (
    <View style={styles.wrapper}>
      {/* Bar track */}
      <View style={[styles.track, isLarge && styles.trackLg]}>
        {/* Colored fill */}
        <View style={[styles.fill, { width: barWidth, backgroundColor: seg.color }]} />
        {/* Tick marks at zone boundaries */}
        {[20, 35, 55, 70, 85].map((tick) => (
          <View
            key={tick}
            style={[styles.tick, { left: `${tick}%` }]}
          />
        ))}
      </View>

      {/* Labels */}
      <View style={styles.row}>
        <Text style={styles.pctText}>{value}%</Text>
        <View style={[styles.badge, { backgroundColor: seg.color + "22", borderColor: seg.color }]}>
          <Text style={[styles.badgeText, { color: seg.color }]}>{seg.label}</Text>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: { width: "100%" },
  track: {
    height: 14, borderRadius: 7, backgroundColor: "#E0E0E0",
    overflow: "hidden", position: "relative", marginBottom: 8,
  },
  trackLg: { height: 20, borderRadius: 10 },
  fill: { position: "absolute", top: 0, left: 0, bottom: 0, borderRadius: 7 },
  tick: { position: "absolute", top: 0, bottom: 0, width: 2, backgroundColor: "rgba(255,255,255,0.6)" },
  row: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  pctText: { fontSize: 13, fontWeight: "700", color: "#333" },
  badge: {
    paddingHorizontal: 10, paddingVertical: 3, borderRadius: 12, borderWidth: 1.5,
  },
  badgeText: { fontSize: 12, fontWeight: "700" },
});
