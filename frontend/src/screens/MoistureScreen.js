import React, { useEffect, useState, useCallback } from "react";
import {
  View, Text, StyleSheet, FlatList, TouchableOpacity, Modal,
  TextInput, ScrollView, Alert, ActivityIndicator, RefreshControl,
} from "react-native";
import {
  fetchMoistureReadings, logMoistureReading, deleteMoistureReading,
} from "../services/api";
import MoistureGauge from "../components/MoistureGauge";
import { colors } from "../theme/colors";

const DEPTHS = ["Surface", "6 inches", "12 inches", "18 inches"];

export default function MoistureScreen() {
  const [readings, setReadings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [modalVisible, setModalVisible] = useState(false);
  const [selectedField, setSelectedField] = useState("All Fields");

  // Form state
  const [form, setForm] = useState({
    fieldName: "", moisture: "", depth: "Surface", notes: "",
  });

  const load = useCallback(async (isRefresh = false) => {
    if (!isRefresh) setLoading(true);
    try {
      const data = await fetchMoistureReadings();
      setReadings(data);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => { load(); }, []);

  // Unique field names for filter tabs
  const fields = ["All Fields", ...new Set(readings.map((r) => r.fieldName))];

  const filtered = selectedField === "All Fields"
    ? readings
    : readings.filter((r) => r.fieldName === selectedField);

  // Latest reading per field for summary cards
  const latestByField = {};
  readings.forEach((r) => {
    if (!latestByField[r.fieldName]) latestByField[r.fieldName] = r;
  });

  async function handleSubmit() {
    if (!form.fieldName.trim() || !form.moisture.trim()) {
      Alert.alert("Missing Info", "Please enter a field name and moisture level.");
      return;
    }
    const pct = parseFloat(form.moisture);
    if (isNaN(pct) || pct < 0 || pct > 100) {
      Alert.alert("Invalid Value", "Moisture must be between 0 and 100.");
      return;
    }
    try {
      await logMoistureReading({
        fieldName: form.fieldName.trim(),
        moisture: pct,
        depth: form.depth,
        notes: form.notes.trim(),
      });
      setForm({ fieldName: "", moisture: "", depth: "Surface", notes: "" });
      setModalVisible(false);
      load();
    } catch {
      Alert.alert("Error", "Could not save reading. Is the backend running?");
    }
  }

  async function handleDelete(id) {
    Alert.alert("Delete Reading", "Remove this moisture record?", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Delete", style: "destructive",
        onPress: async () => { await deleteMoistureReading(id); load(); },
      },
    ]);
  }

  if (loading) {
    return <View style={styles.centered}><ActivityIndicator size="large" color={colors.primary} /></View>;
  }

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>💧 Soil Moisture</Text>
        <TouchableOpacity style={styles.addBtn} onPress={() => setModalVisible(true)}>
          <Text style={styles.addBtnText}>+ Log Reading</Text>
        </TouchableOpacity>
      </View>

      {/* Summary cards */}
      {Object.keys(latestByField).length > 0 && (
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.summaryScroll}>
          {Object.values(latestByField).map((r) => (
            <TouchableOpacity
              key={r.fieldName}
              style={[styles.summaryCard, selectedField === r.fieldName && styles.summaryCardActive]}
              onPress={() => setSelectedField(selectedField === r.fieldName ? "All Fields" : r.fieldName)}
            >
              <Text style={styles.summaryField}>{r.fieldName}</Text>
              <Text style={[styles.summaryPct, { color: r.status.color }]}>{r.moisture}%</Text>
              <Text style={[styles.summaryLabel, { color: r.status.color }]}>{r.status.label}</Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      )}

      {/* Field filter tabs */}
      {fields.length > 1 && (
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.filterBar}>
          {fields.map((f) => (
            <TouchableOpacity
              key={f}
              style={[styles.filterChip, selectedField === f && styles.filterChipActive]}
              onPress={() => setSelectedField(f)}
            >
              <Text style={[styles.filterText, selectedField === f && styles.filterTextActive]}>{f}</Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      )}

      {/* Readings list */}
      <FlatList
        data={filtered}
        keyExtractor={(r) => r.id}
        contentContainerStyle={styles.list}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); load(true); }} tintColor={colors.primary} />}
        renderItem={({ item }) => (
          <View style={styles.card}>
            <View style={styles.cardHeader}>
              <View>
                <Text style={styles.cardField}>{item.fieldName}</Text>
                <Text style={styles.cardMeta}>{item.depth} · {formatDate(item.createdAt)}</Text>
              </View>
              <TouchableOpacity onPress={() => handleDelete(item.id)} style={styles.deleteBtn}>
                <Text style={styles.deleteBtnText}>✕</Text>
              </TouchableOpacity>
            </View>
            <MoistureGauge value={item.moisture} />
            <Text style={[styles.actionText, { color: item.status.color }]}>
              ▶ {item.status.action}
            </Text>
            {item.notes ? <Text style={styles.notes}>{item.notes}</Text> : null}
          </View>
        )}
        ListEmptyComponent={
          <View style={styles.empty}>
            <Text style={styles.emptyIcon}>💧</Text>
            <Text style={styles.emptyText}>No readings yet.</Text>
            <Text style={styles.emptySubText}>Tap "+ Log Reading" to add your first soil moisture record.</Text>
          </View>
        }
      />

      {/* Log Reading Modal */}
      <Modal visible={modalVisible} animationType="slide" presentationStyle="pageSheet">
        <View style={styles.modal}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Log Soil Moisture</Text>
            <TouchableOpacity onPress={() => setModalVisible(false)}>
              <Text style={styles.modalClose}>✕</Text>
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.modalBody}>
            <Label text="Field Name" />
            <TextInput
              style={styles.input}
              placeholder="e.g. North Field, Back 40"
              value={form.fieldName}
              onChangeText={(v) => setForm({ ...form, fieldName: v })}
            />

            <Label text="Moisture Level (%)" />
            <TextInput
              style={styles.input}
              placeholder="0 – 100"
              keyboardType="decimal-pad"
              value={form.moisture}
              onChangeText={(v) => setForm({ ...form, moisture: v })}
            />
            {form.moisture !== "" && !isNaN(parseFloat(form.moisture)) && (
              <View style={{ marginBottom: 16 }}>
                <MoistureGauge value={Math.min(100, Math.max(0, parseFloat(form.moisture)))} size="lg" />
              </View>
            )}

            <Label text="Depth" />
            <View style={styles.depthRow}>
              {DEPTHS.map((d) => (
                <TouchableOpacity
                  key={d}
                  style={[styles.depthChip, form.depth === d && styles.depthChipActive]}
                  onPress={() => setForm({ ...form, depth: d })}
                >
                  <Text style={[styles.depthText, form.depth === d && styles.depthTextActive]}>{d}</Text>
                </TouchableOpacity>
              ))}
            </View>

            <Label text="Notes (optional)" />
            <TextInput
              style={[styles.input, styles.textArea]}
              placeholder="Any observations about the field..."
              multiline
              numberOfLines={3}
              value={form.notes}
              onChangeText={(v) => setForm({ ...form, notes: v })}
            />

            <TouchableOpacity style={styles.submitBtn} onPress={handleSubmit}>
              <Text style={styles.submitBtnText}>Save Reading</Text>
            </TouchableOpacity>
          </ScrollView>
        </View>
      </Modal>
    </View>
  );
}

function Label({ text }) {
  return <Text style={styles.label}>{text}</Text>;
}

function formatDate(iso) {
  if (!iso) return "";
  return new Date(iso).toLocaleDateString([], { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" });
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  centered: { flex: 1, justifyContent: "center", alignItems: "center" },
  header: {
    backgroundColor: colors.primaryDark, paddingTop: 60, paddingBottom: 20,
    paddingHorizontal: 20, flexDirection: "row", justifyContent: "space-between", alignItems: "flex-end",
  },
  headerTitle: { color: "#fff", fontSize: 24, fontWeight: "800" },
  addBtn: { backgroundColor: colors.primaryLight, paddingHorizontal: 16, paddingVertical: 8, borderRadius: 20 },
  addBtnText: { color: "#fff", fontWeight: "700", fontSize: 14 },
  summaryScroll: { paddingHorizontal: 12, paddingTop: 14, paddingBottom: 4, flexGrow: 0 },
  summaryCard: {
    backgroundColor: colors.surface, borderRadius: 14, padding: 14, marginRight: 10,
    minWidth: 100, alignItems: "center", borderWidth: 2, borderColor: "transparent",
    shadowColor: "#000", shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.07, shadowRadius: 4, elevation: 2,
  },
  summaryCardActive: { borderColor: colors.primary },
  summaryField: { fontSize: 11, color: colors.textSecondary, fontWeight: "600", textAlign: "center", marginBottom: 4 },
  summaryPct: { fontSize: 22, fontWeight: "800" },
  summaryLabel: { fontSize: 11, fontWeight: "600", marginTop: 2 },
  filterBar: { paddingHorizontal: 12, paddingVertical: 10, flexGrow: 0 },
  filterChip: {
    paddingHorizontal: 14, paddingVertical: 6, borderRadius: 16, marginRight: 8,
    backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border,
  },
  filterChipActive: { backgroundColor: colors.primary, borderColor: colors.primary },
  filterText: { fontSize: 13, color: colors.textSecondary, fontWeight: "600" },
  filterTextActive: { color: "#fff" },
  list: { padding: 16, paddingTop: 8 },
  card: {
    backgroundColor: colors.surface, borderRadius: 16, padding: 16, marginBottom: 12,
    shadowColor: "#000", shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.07, shadowRadius: 6, elevation: 2,
  },
  cardHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 12 },
  cardField: { fontSize: 16, fontWeight: "700", color: colors.text },
  cardMeta: { fontSize: 12, color: colors.textSecondary, marginTop: 2 },
  deleteBtn: { padding: 4 },
  deleteBtnText: { color: colors.textSecondary, fontSize: 16 },
  actionText: { fontSize: 13, fontWeight: "600", marginTop: 8 },
  notes: { fontSize: 13, color: colors.textSecondary, marginTop: 6, fontStyle: "italic" },
  empty: { alignItems: "center", paddingTop: 80 },
  emptyIcon: { fontSize: 48, marginBottom: 12 },
  emptyText: { fontSize: 17, fontWeight: "700", color: colors.text, marginBottom: 6 },
  emptySubText: { fontSize: 14, color: colors.textSecondary, textAlign: "center", paddingHorizontal: 40 },
  // Modal
  modal: { flex: 1, backgroundColor: colors.background },
  modalHeader: {
    flexDirection: "row", justifyContent: "space-between", alignItems: "center",
    padding: 20, paddingTop: 60, backgroundColor: colors.primaryDark,
  },
  modalTitle: { color: "#fff", fontSize: 20, fontWeight: "800" },
  modalClose: { color: "rgba(255,255,255,0.8)", fontSize: 20 },
  modalBody: { padding: 20 },
  label: { fontSize: 13, fontWeight: "700", color: colors.textSecondary, marginBottom: 6, marginTop: 16, letterSpacing: 0.5 },
  input: {
    backgroundColor: colors.surface, borderRadius: 12, borderWidth: 1, borderColor: colors.border,
    paddingHorizontal: 14, paddingVertical: 12, fontSize: 15, color: colors.text,
  },
  textArea: { height: 90, textAlignVertical: "top" },
  depthRow: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  depthChip: {
    paddingHorizontal: 14, paddingVertical: 8, borderRadius: 20, borderWidth: 1, borderColor: colors.border,
    backgroundColor: colors.surface,
  },
  depthChipActive: { backgroundColor: colors.primary, borderColor: colors.primary },
  depthText: { color: colors.textSecondary, fontWeight: "600", fontSize: 13 },
  depthTextActive: { color: "#fff" },
  submitBtn: { backgroundColor: colors.primary, borderRadius: 16, padding: 18, alignItems: "center", marginTop: 24, marginBottom: 40 },
  submitBtnText: { color: "#fff", fontSize: 16, fontWeight: "700" },
});
