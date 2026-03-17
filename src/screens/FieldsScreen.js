import React, { useEffect, useState, useCallback } from "react";
import {
  View, Text, StyleSheet, FlatList, TouchableOpacity, Modal,
  TextInput, ScrollView, Alert, ActivityIndicator, RefreshControl, Switch,
} from "react-native";
import { fetchFields, createField, updateField, deleteField } from "../services/api";
import { colors } from "../theme/colors";

const SOIL_TYPES = ["Clay", "Silt", "Sandy", "Loam", "Sandy Loam", "Clay Loam", "Peat"];
const FIELD_STATUS = ["active", "fallow", "resting", "problem"];

export default function FieldsScreen() {
  const [fields, setFields] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [modalVisible, setModalVisible] = useState(false);
  const [editingField, setEditingField] = useState(null); // null = new, object = edit

  const emptyForm = {
    name: "", acres: "", crop: "", zone: "", soilType: "",
    irrigated: false, owned: true, notes: "", status: "active",
  };
  const [form, setForm] = useState(emptyForm);

  const load = useCallback(async (isRefresh = false) => {
    if (!isRefresh) setLoading(true);
    try {
      setFields(await fetchFields());
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => { load(); }, []);

  const totalAcres = fields.reduce((s, f) => s + (f.acres || 0), 0);
  const activeCount = fields.filter((f) => f.status === "active").length;

  function openNew() {
    setEditingField(null);
    setForm(emptyForm);
    setModalVisible(true);
  }

  function openEdit(field) {
    setEditingField(field);
    setForm({
      name: field.name || "",
      acres: String(field.acres || ""),
      crop: field.crop || "",
      zone: field.zone || "",
      soilType: field.soilType || "",
      irrigated: !!field.irrigated,
      owned: field.owned !== false,
      notes: field.notes || "",
      status: field.status || "active",
    });
    setModalVisible(true);
  }

  async function handleSave() {
    if (!form.name.trim() || !form.acres) {
      Alert.alert("Required", "Field name and acreage are required.");
      return;
    }
    const acres = parseFloat(form.acres);
    if (isNaN(acres) || acres <= 0) {
      Alert.alert("Invalid", "Acreage must be a positive number.");
      return;
    }
    const payload = { ...form, acres };
    try {
      if (editingField) {
        await updateField(editingField.id, payload);
      } else {
        await createField(payload);
      }
      setModalVisible(false);
      load();
    } catch {
      Alert.alert("Error", "Failed to save field.");
    }
  }

  async function handleDelete(id, name) {
    Alert.alert("Remove Field", `Remove "${name}" from your registry?`, [
      { text: "Cancel", style: "cancel" },
      { text: "Remove", style: "destructive", onPress: async () => { await deleteField(id); load(); } },
    ]);
  }

  if (loading) {
    return <View style={styles.centered}><ActivityIndicator size="large" color={colors.primary} /></View>;
  }

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <View>
          <Text style={styles.headerTitle}>Field Registry</Text>
          <Text style={styles.headerSub}>
            {fields.length} field{fields.length !== 1 ? "s" : ""}  ·  {totalAcres.toLocaleString()} total acres  ·  {activeCount} active
          </Text>
        </View>
        <TouchableOpacity style={styles.addBtn} onPress={openNew}>
          <Text style={styles.addBtnText}>+ Add Field</Text>
        </TouchableOpacity>
      </View>

      {/* Summary strip */}
      {fields.length > 0 && (
        <View style={styles.summaryStrip}>
          {["active", "fallow", "resting", "problem"].map((s) => {
            const count = fields.filter((f) => f.status === s).length;
            if (count === 0) return null;
            return (
              <View key={s} style={styles.summaryItem}>
                <View style={[styles.summaryDot, { backgroundColor: statusColor(s) }]} />
                <Text style={styles.summaryText}>{count} {s}</Text>
              </View>
            );
          })}
        </View>
      )}

      <FlatList
        data={fields}
        keyExtractor={(f) => f.id}
        contentContainerStyle={styles.list}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); load(true); }} tintColor={colors.primary} />}
        renderItem={({ item }) => (
          <TouchableOpacity style={styles.fieldCard} onPress={() => openEdit(item)} activeOpacity={0.8}>
            <View style={[styles.statusBar, { backgroundColor: statusColor(item.status) }]} />
            <View style={styles.fieldCardBody}>
              <View style={styles.fieldCardTop}>
                <Text style={styles.fieldName}>{item.name}</Text>
                <Text style={styles.fieldAcres}>{item.acres} ac</Text>
              </View>

              <View style={styles.tagRow}>
                {item.crop ? <Tag text={item.crop} color={colors.primaryLight} /> : null}
                {item.soilType ? <Tag text={item.soilType} color={colors.gold} /> : null}
                {item.irrigated ? <Tag text="Irrigated" color={colors.info} /> : null}
                {!item.owned ? <Tag text="Leased" color={colors.textSecondary} /> : null}
                <Tag text={item.status} color={statusColor(item.status)} />
              </View>

              {item.notes ? <Text style={styles.fieldNotes} numberOfLines={1}>{item.notes}</Text> : null}

              <View style={styles.fieldCardFooter}>
                <Text style={styles.fieldDate}>Added {shortDate(item.createdAt)}</Text>
                <TouchableOpacity onPress={() => handleDelete(item.id, item.name)} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                  <Text style={styles.deleteLink}>Remove</Text>
                </TouchableOpacity>
              </View>
            </View>
          </TouchableOpacity>
        )}
        ListEmptyComponent={
          <View style={styles.empty}>
            <Text style={styles.emptyIcon}>▦</Text>
            <Text style={styles.emptyTitle}>No Fields Registered</Text>
            <Text style={styles.emptyDesc}>Add your fields to track acreage, crops, and activity across your operation.</Text>
            <TouchableOpacity style={styles.emptyBtn} onPress={openNew}>
              <Text style={styles.emptyBtnText}>Add First Field</Text>
            </TouchableOpacity>
          </View>
        }
      />

      {/* ── Add / Edit Modal ────────────────────────────────────── */}
      <Modal visible={modalVisible} animationType="slide" presentationStyle="pageSheet">
        <View style={styles.modal}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>{editingField ? "Edit Field" : "New Field"}</Text>
            <TouchableOpacity onPress={() => setModalVisible(false)}>
              <Text style={styles.modalClose}>✕</Text>
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.modalBody}>
            <FormLabel text="Field Name *" />
            <TextInput style={styles.input} placeholder="e.g. North 80, River Bottom"
              value={form.name} onChangeText={(v) => setForm({ ...form, name: v })} />

            <View style={styles.twoCol}>
              <View style={styles.col}>
                <FormLabel text="Acreage *" />
                <TextInput style={styles.input} placeholder="e.g. 120" keyboardType="decimal-pad"
                  value={form.acres} onChangeText={(v) => setForm({ ...form, acres: v })} />
              </View>
              <View style={styles.col}>
                <FormLabel text="Zone Override" />
                <TextInput style={styles.input} placeholder="e.g. 6  (auto if blank)"
                  keyboardType="number-pad" value={form.zone}
                  onChangeText={(v) => setForm({ ...form, zone: v })} />
              </View>
            </View>

            <FormLabel text="Current Crop / Rotation" />
            <TextInput style={styles.input} placeholder="e.g. Corn, Soybeans, Wheat"
              value={form.crop} onChangeText={(v) => setForm({ ...form, crop: v })} />

            <FormLabel text="Soil Type" />
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.chipScroll}>
              {SOIL_TYPES.map((t) => (
                <TouchableOpacity key={t}
                  style={[styles.chip, form.soilType === t && styles.chipActive]}
                  onPress={() => setForm({ ...form, soilType: form.soilType === t ? "" : t })}>
                  <Text style={[styles.chipText, form.soilType === t && styles.chipTextActive]}>{t}</Text>
                </TouchableOpacity>
              ))}
            </ScrollView>

            <FormLabel text="Status" />
            <View style={styles.statusRow}>
              {FIELD_STATUS.map((s) => (
                <TouchableOpacity key={s}
                  style={[styles.statusChip, form.status === s && { backgroundColor: statusColor(s), borderColor: statusColor(s) }]}
                  onPress={() => setForm({ ...form, status: s })}>
                  <Text style={[styles.statusChipText, form.status === s && { color: "#fff" }]}>{s}</Text>
                </TouchableOpacity>
              ))}
            </View>

            <View style={styles.toggleRow}>
              <View style={styles.toggleItem}>
                <Text style={styles.toggleLabel}>Irrigated</Text>
                <Switch value={form.irrigated} onValueChange={(v) => setForm({ ...form, irrigated: v })}
                  trackColor={{ true: colors.primaryLight }} />
              </View>
              <View style={styles.toggleItem}>
                <Text style={styles.toggleLabel}>Owned (vs. Leased)</Text>
                <Switch value={form.owned} onValueChange={(v) => setForm({ ...form, owned: v })}
                  trackColor={{ true: colors.primaryLight }} />
              </View>
            </View>

            <FormLabel text="Notes / Observations" />
            <TextInput style={[styles.input, styles.textArea]}
              placeholder="Drainage issues, slope, historical yield notes..."
              multiline numberOfLines={3} value={form.notes}
              onChangeText={(v) => setForm({ ...form, notes: v })} />

            <TouchableOpacity style={styles.saveBtn} onPress={handleSave}>
              <Text style={styles.saveBtnText}>{editingField ? "Save Changes" : "Register Field"}</Text>
            </TouchableOpacity>
          </ScrollView>
        </View>
      </Modal>
    </View>
  );
}

function Tag({ text, color }) {
  return (
    <View style={[styles.tag, { borderColor: color }]}>
      <Text style={[styles.tagText, { color }]}>{text}</Text>
    </View>
  );
}

function FormLabel({ text }) {
  return <Text style={styles.formLabel}>{text}</Text>;
}

function statusColor(status) {
  return { active: colors.accent, fallow: colors.gold, resting: colors.textMuted, problem: colors.danger }[status] || colors.textMuted;
}

function shortDate(iso) {
  if (!iso) return "";
  return new Date(iso).toLocaleDateString([], { month: "short", day: "numeric", year: "numeric" });
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  centered: { flex: 1, justifyContent: "center", alignItems: "center" },
  header: {
    backgroundColor: colors.headerBg, paddingTop: 60, paddingBottom: 20,
    paddingHorizontal: 20, flexDirection: "row", justifyContent: "space-between", alignItems: "flex-end",
  },
  headerTitle: { color: "#fff", fontSize: 22, fontWeight: "800" },
  headerSub: { color: colors.headerSub, fontSize: 12, marginTop: 4 },
  addBtn: { backgroundColor: colors.accent, paddingHorizontal: 16, paddingVertical: 8, borderRadius: 8 },
  addBtnText: { color: "#fff", fontWeight: "700", fontSize: 13 },
  summaryStrip: {
    flexDirection: "row", backgroundColor: colors.surface, paddingHorizontal: 20, paddingVertical: 10,
    borderBottomWidth: 1, borderBottomColor: colors.border, gap: 20,
  },
  summaryItem: { flexDirection: "row", alignItems: "center", gap: 6 },
  summaryDot: { width: 8, height: 8, borderRadius: 4 },
  summaryText: { fontSize: 12, color: colors.textSecondary, fontWeight: "600", textTransform: "capitalize" },
  list: { padding: 16 },
  fieldCard: {
    backgroundColor: colors.surface, borderRadius: 12, marginBottom: 10, flexDirection: "row",
    overflow: "hidden", borderWidth: 1, borderColor: colors.border,
    shadowColor: colors.shadow, shadowOffset: { width: 0, height: 2 }, shadowOpacity: 1, shadowRadius: 4, elevation: 2,
  },
  statusBar: { width: 5 },
  fieldCardBody: { flex: 1, padding: 14 },
  fieldCardTop: { flexDirection: "row", justifyContent: "space-between", alignItems: "baseline", marginBottom: 8 },
  fieldName: { fontSize: 16, fontWeight: "800", color: colors.text },
  fieldAcres: { fontSize: 16, fontWeight: "700", color: colors.primary },
  tagRow: { flexDirection: "row", flexWrap: "wrap", gap: 6, marginBottom: 8 },
  tag: { borderWidth: 1, borderRadius: 5, paddingHorizontal: 8, paddingVertical: 3 },
  tagText: { fontSize: 10, fontWeight: "700", textTransform: "capitalize" },
  fieldNotes: { fontSize: 12, color: colors.textMuted, fontStyle: "italic", marginBottom: 8 },
  fieldCardFooter: { flexDirection: "row", justifyContent: "space-between" },
  fieldDate: { fontSize: 11, color: colors.textMuted },
  deleteLink: { fontSize: 11, color: colors.danger, fontWeight: "600" },
  empty: { alignItems: "center", paddingTop: 80, paddingHorizontal: 32 },
  emptyIcon: { fontSize: 40, color: colors.textMuted, marginBottom: 16 },
  emptyTitle: { fontSize: 18, fontWeight: "800", color: colors.text, marginBottom: 8 },
  emptyDesc: { fontSize: 14, color: colors.textSecondary, textAlign: "center", lineHeight: 20, marginBottom: 24 },
  emptyBtn: { backgroundColor: colors.primary, paddingHorizontal: 28, paddingVertical: 12, borderRadius: 8 },
  emptyBtnText: { color: "#fff", fontWeight: "700", fontSize: 14 },
  // Modal
  modal: { flex: 1, backgroundColor: colors.background },
  modalHeader: {
    backgroundColor: colors.headerBg, paddingTop: 60, paddingBottom: 20, paddingHorizontal: 20,
    flexDirection: "row", justifyContent: "space-between", alignItems: "center",
  },
  modalTitle: { color: "#fff", fontSize: 20, fontWeight: "800" },
  modalClose: { color: colors.headerSub, fontSize: 20 },
  modalBody: { padding: 20 },
  formLabel: { fontSize: 11, fontWeight: "700", color: colors.textSecondary, marginBottom: 6, marginTop: 16, letterSpacing: 0.8 },
  input: {
    backgroundColor: colors.surface, borderRadius: 8, borderWidth: 1, borderColor: colors.border,
    paddingHorizontal: 14, paddingVertical: 12, fontSize: 15, color: colors.text,
  },
  textArea: { height: 90, textAlignVertical: "top" },
  twoCol: { flexDirection: "row", gap: 12 },
  col: { flex: 1 },
  chipScroll: { flexGrow: 0, marginBottom: 4 },
  chip: {
    paddingHorizontal: 14, paddingVertical: 7, borderRadius: 6, marginRight: 8, borderWidth: 1,
    borderColor: colors.border, backgroundColor: colors.surface,
  },
  chipActive: { backgroundColor: colors.primary, borderColor: colors.primary },
  chipText: { fontSize: 13, color: colors.textSecondary, fontWeight: "600" },
  chipTextActive: { color: "#fff" },
  statusRow: { flexDirection: "row", gap: 8, flexWrap: "wrap" },
  statusChip: {
    paddingHorizontal: 14, paddingVertical: 8, borderRadius: 6, borderWidth: 1.5,
    borderColor: colors.border, backgroundColor: colors.surface,
  },
  statusChipText: { fontSize: 12, fontWeight: "700", color: colors.textSecondary, textTransform: "capitalize" },
  toggleRow: { marginTop: 20, gap: 16 },
  toggleItem: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  toggleLabel: { fontSize: 15, color: colors.text, fontWeight: "600" },
  saveBtn: { backgroundColor: colors.primary, borderRadius: 10, padding: 16, alignItems: "center", marginTop: 28, marginBottom: 40 },
  saveBtnText: { color: "#fff", fontSize: 15, fontWeight: "700" },
});
