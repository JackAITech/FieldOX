import React, { useEffect, useState, useCallback } from "react";
import {
  View, Text, StyleSheet, FlatList, TouchableOpacity, Modal,
  TextInput, ScrollView, Alert, ActivityIndicator, Switch, RefreshControl,
} from "react-native";
import {
  fetchSprayConfig, saveSprayConfig, calculateCoverage,
  fetchSpraySessions, logSpraySession, deleteSpraySession,
} from "../services/api";
import { colors } from "../theme/colors";

const UNITS = ["oz/ac", "fl oz/ac", "pt/ac", "qt/ac", "gal/ac", "lb/ac"];

export default function SprayingScreen() {
  const [sessions, setSessions] = useState([]);
  const [config, setConfig] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // Tab: "sessions" | "config" | "calculator"
  const [activeTab, setActiveTab] = useState("sessions");

  // Log session modal
  const [logModal, setLogModal] = useState(false);
  const [logForm, setLogForm] = useState({
    fieldName: "", chemical: "", epaRegNum: "", ratePerAcre: "", unit: "oz/ac",
    costPerAcre: "",
    applicatorName: "", applicatorLicenseNum: "", phi: "",
    windSpeed: "", windDir: "", temp: "",
    useTimer: false, startTime: null, endTime: null,
    fieldAcres: "", tankFills: "", tankGallons: "", notes: "",
    timerRunning: false,
  });
  const [timerInterval, setTimerInterval] = useState(null);
  const [elapsed, setElapsed] = useState(0);

  // Sprayer config form
  const [configForm, setConfigForm] = useState({
    name: "", hp: "", boomWidthFt: "", tankGallons: "", defaultSpeedMph: "",
  });
  const [configPreview, setConfigPreview] = useState(null);

  // Calculator (standalone)
  const [calcForm, setCalcForm] = useState({ hp: "", boomWidthFt: "", speedMph: "", fieldAcres: "" });
  const [calcResult, setCalcResult] = useState(null);

  const load = useCallback(async (isRefresh = false) => {
    if (!isRefresh) setLoading(true);
    try {
      const [cfg, sess] = await Promise.all([fetchSprayConfig(), fetchSpraySessions()]);
      setConfig(cfg);
      setSessions(sess);
      if (cfg) {
        setConfigForm({
          name: cfg.name || "",
          hp: String(cfg.hp || ""),
          boomWidthFt: String(cfg.boomWidthFt || ""),
          tankGallons: String(cfg.tankGallons || ""),
          defaultSpeedMph: String(cfg.defaultSpeedMph || ""),
        });
        // Pre-fill log form with config values
        setLogForm((prev) => ({
          ...prev,
          tankGallons: String(cfg.tankGallons || ""),
        }));
      }
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => { load(); }, []);

  // ── Timer ──────────────────────────────────────────────────────────────────
  function startTimer() {
    const start = new Date().toISOString();
    setLogForm((f) => ({ ...f, startTime: start, timerRunning: true }));
    setElapsed(0);
    const iv = setInterval(() => setElapsed((e) => e + 1), 1000);
    setTimerInterval(iv);
  }

  function stopTimer() {
    clearInterval(timerInterval);
    setTimerInterval(null);
    const end = new Date().toISOString();
    setLogForm((f) => ({ ...f, endTime: end, timerRunning: false }));
  }

  function formatElapsed(secs) {
    const h = Math.floor(secs / 3600);
    const m = Math.floor((secs % 3600) / 60);
    const s = secs % 60;
    return `${pad(h)}:${pad(m)}:${pad(s)}`;
  }
  const pad = (n) => String(n).padStart(2, "0");

  // ── Config save ────────────────────────────────────────────────────────────
  async function handleSaveConfig() {
    const { hp, boomWidthFt } = configForm;
    if (!hp || !boomWidthFt) {
      Alert.alert("Required", "HP and boom width are required.");
      return;
    }
    try {
      const saved = await saveSprayConfig({
        name: configForm.name,
        hp: parseFloat(hp),
        boomWidthFt: parseFloat(boomWidthFt),
        tankGallons: configForm.tankGallons ? parseFloat(configForm.tankGallons) : null,
        defaultSpeedMph: configForm.defaultSpeedMph ? parseFloat(configForm.defaultSpeedMph) : null,
      });
      setConfig(saved);
      setConfigPreview(saved);
      Alert.alert("Saved", "Sprayer configuration updated.");
    } catch {
      Alert.alert("Error", "Failed to save config.");
    }
  }

  // ── Calculator ─────────────────────────────────────────────────────────────
  async function handleCalculate() {
    const { hp, boomWidthFt } = calcForm;
    if (!hp || !boomWidthFt) {
      Alert.alert("Required", "HP and boom width are required.");
      return;
    }
    try {
      const result = await calculateCoverage({
        hp: parseFloat(hp),
        boomWidthFt: parseFloat(boomWidthFt),
        speedMph: calcForm.speedMph ? parseFloat(calcForm.speedMph) : undefined,
        fieldAcres: calcForm.fieldAcres ? parseFloat(calcForm.fieldAcres) : undefined,
      });
      setCalcResult(result);
    } catch {
      Alert.alert("Error", "Calculation failed.");
    }
  }

  // ── Log session ────────────────────────────────────────────────────────────
  async function handleLogSession() {
    const hp = config?.hp || parseFloat(logForm.hp);
    const boomWidthFt = config?.boomWidthFt || parseFloat(logForm.boomWidthFt);

    if (!logForm.fieldName.trim() || !hp || !boomWidthFt) {
      Alert.alert("Missing Info", "Field name, HP, and boom width are required. Set up your sprayer in the Config tab.");
      return;
    }
    if (logForm.useTimer && !logForm.startTime) {
      Alert.alert("Timer", "Start the timer when you begin spraying.");
      return;
    }
    if (logForm.useTimer && logForm.timerRunning) {
      stopTimer();
    }

    try {
      await logSpraySession({
        fieldName: logForm.fieldName.trim(),
        chemical: logForm.chemical.trim(),
        epaRegNum: logForm.epaRegNum.trim(),
        ratePerAcre: logForm.ratePerAcre ? parseFloat(logForm.ratePerAcre) : null,
        unit: logForm.unit,
        costPerAcre: logForm.costPerAcre ? parseFloat(logForm.costPerAcre) : null,
        applicatorName: logForm.applicatorName.trim(),
        applicatorLicenseNum: logForm.applicatorLicenseNum.trim(),
        phi: logForm.phi ? parseFloat(logForm.phi) : null,
        windSpeed: logForm.windSpeed ? parseFloat(logForm.windSpeed) : null,
        windDir: logForm.windDir.trim(),
        temp: logForm.temp ? parseFloat(logForm.temp) : null,
        hp,
        boomWidthFt,
        speedMph: config?.defaultSpeedMph || null,
        startTime: logForm.startTime,
        endTime: logForm.endTime,
        fieldAcres: !logForm.useTimer && logForm.fieldAcres ? parseFloat(logForm.fieldAcres) : null,
        tankFills: logForm.tankFills ? parseInt(logForm.tankFills) : 0,
        tankGallons: logForm.tankGallons ? parseFloat(logForm.tankGallons) : 0,
        notes: logForm.notes.trim(),
      });
      setLogModal(false);
      resetLogForm();
      load();
    } catch {
      Alert.alert("Error", "Failed to log session.");
    }
  }

  function resetLogForm() {
    clearInterval(timerInterval);
    setTimerInterval(null);
    setElapsed(0);
    setLogForm({
      fieldName: "", chemical: "", epaRegNum: "", ratePerAcre: "", unit: "oz/ac",
      costPerAcre: "", applicatorName: "", applicatorLicenseNum: "", phi: "",
      windSpeed: "", windDir: "", temp: "",
      useTimer: false, startTime: null, endTime: null,
      fieldAcres: "", tankFills: "", tankGallons: String(config?.tankGallons || ""),
      notes: "", timerRunning: false,
    });
  }

  async function handleDeleteSession(id) {
    Alert.alert("Delete Session", "Remove this spray record?", [
      { text: "Cancel", style: "cancel" },
      { text: "Delete", style: "destructive", onPress: async () => { await deleteSpraySession(id); load(); } },
    ]);
  }

  if (loading) {
    return <View style={styles.centered}><ActivityIndicator size="large" color={colors.primary} /></View>;
  }

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>🌿 Spraying Tracker</Text>
        {activeTab === "sessions" && (
          <TouchableOpacity style={styles.addBtn} onPress={() => setLogModal(true)}>
            <Text style={styles.addBtnText}>+ Log Session</Text>
          </TouchableOpacity>
        )}
      </View>

      {/* Tabs */}
      <View style={styles.tabs}>
        {["sessions", "calculator", "config"].map((tab) => (
          <TouchableOpacity
            key={tab}
            style={[styles.tab, activeTab === tab && styles.tabActive]}
            onPress={() => setActiveTab(tab)}
          >
            <Text style={[styles.tabText, activeTab === tab && styles.tabTextActive]}>
              {tab === "sessions" ? "📋 History" : tab === "calculator" ? "🧮 Calculator" : "⚙️ Sprayer"}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* ── Sessions Tab ───────────────────────────────────────────── */}
      {activeTab === "sessions" && (
        <FlatList
          data={sessions}
          keyExtractor={(s) => s.id}
          contentContainerStyle={styles.list}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); load(true); }} tintColor={colors.primary} />}
          renderItem={({ item }) => (
            <View style={styles.sessionCard}>
              <View style={styles.sessionHeader}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.sessionField}>{item.fieldName}</Text>
                  <Text style={styles.sessionDate}>{formatDate(item.createdAt)}</Text>
                </View>
                <TouchableOpacity onPress={() => handleDeleteSession(item.id)}>
                  <Text style={styles.deleteBtnText}>✕</Text>
                </TouchableOpacity>
              </View>

              {item.chemical ? (
                <View style={styles.chemRow}>
                  <Text style={styles.chemLabel}>Chemical</Text>
                  <Text style={styles.chemValue}>{item.chemical}{item.ratePerAcre ? ` @ ${item.ratePerAcre} ${item.unit}` : ""}</Text>
                </View>
              ) : null}

              <View style={styles.statsGrid}>
                <StatBox icon="🌾" label="Acres Covered" value={item.acresCovered ? `${item.acresCovered} ac` : "—"} />
                <StatBox icon="⏱" label="Hours" value={item.hoursWorked ? `${item.hoursWorked} hr` : "—"} />
                <StatBox icon="📐" label="Acres/hr" value={item.acresPerHour ? `${item.acresPerHour}` : "—"} />
                <StatBox icon="💧" label="Chemical Used" value={item.totalChemical ? `${item.totalChemical} ${item.totalChemicalUnit}` : "—"} />
              </View>

              <View style={styles.specRow}>
                <Text style={styles.specText}>🚜 {item.hp} HP · 📏 {item.boomWidthFt} ft boom · 💨 {item.speedMph} mph</Text>
              </View>

              {item.tankFills > 0 && (
                <Text style={styles.tankText}>Tank fills: {item.tankFills} × {item.tankGallons} gal = {item.tankFills * item.tankGallons} gal total</Text>
              )}
              {item.notes ? <Text style={styles.notes}>{item.notes}</Text> : null}
            </View>
          )}
          ListEmptyComponent={
            <View style={styles.empty}>
              <Text style={styles.emptyIcon}>🌿</Text>
              <Text style={styles.emptyText}>No spray sessions logged yet.</Text>
              <Text style={styles.emptySubText}>Tap "+ Log Session" to record a field spraying.</Text>
            </View>
          }
        />
      )}

      {/* ── Calculator Tab ─────────────────────────────────────────── */}
      {activeTab === "calculator" && (
        <ScrollView style={styles.calcContainer}>
          <Text style={styles.sectionTitle}>Coverage Calculator</Text>
          <Text style={styles.sectionSubtitle}>Estimate acres per hour and time to cover a field</Text>

          <Row label="Tractor HP">
            <TextInput style={styles.input} placeholder="e.g. 180" keyboardType="decimal-pad"
              value={calcForm.hp} onChangeText={(v) => setCalcForm({ ...calcForm, hp: v })} />
          </Row>
          <Row label="Boom Width (ft)">
            <TextInput style={styles.input} placeholder="e.g. 60" keyboardType="decimal-pad"
              value={calcForm.boomWidthFt} onChangeText={(v) => setCalcForm({ ...calcForm, boomWidthFt: v })} />
          </Row>
          <Row label="Ground Speed (mph) — optional">
            <TextInput style={styles.input} placeholder="Leave blank to estimate from HP"
              keyboardType="decimal-pad" value={calcForm.speedMph}
              onChangeText={(v) => setCalcForm({ ...calcForm, speedMph: v })} />
          </Row>
          <Row label="Field Size (acres) — optional">
            <TextInput style={styles.input} placeholder="e.g. 120"
              keyboardType="decimal-pad" value={calcForm.fieldAcres}
              onChangeText={(v) => setCalcForm({ ...calcForm, fieldAcres: v })} />
          </Row>

          <TouchableOpacity style={styles.calcBtn} onPress={handleCalculate}>
            <Text style={styles.calcBtnText}>Calculate Coverage</Text>
          </TouchableOpacity>

          {calcResult && (
            <View style={styles.resultCard}>
              <Text style={styles.resultTitle}>Results</Text>
              <ResultRow icon="📐" label="Acres per Hour" value={`${calcResult.acresPerHour} ac/hr`} highlight />
              <ResultRow icon="💨" label="Ground Speed Used" value={`${calcResult.estimatedSpeed} mph${calcForm.speedMph ? "" : " (estimated)"}`} />
              {calcResult.fieldAcres && <ResultRow icon="🌾" label="Field Size" value={`${calcResult.fieldAcres} acres`} />}
              {calcResult.hoursWorked && <ResultRow icon="⏱" label="Time to Complete" value={`${calcResult.hoursWorked} hours`} highlight />}
              <View style={styles.formulaBox}>
                <Text style={styles.formulaTitle}>Formula Used</Text>
                <Text style={styles.formulaText}>
                  Acres/hr = (Speed × Boom Width) ÷ 8.25{"\n"}
                  = ({calcResult.estimatedSpeed} × {calcForm.boomWidthFt}) ÷ 8.25{"\n"}
                  = {calcResult.acresPerHour} ac/hr
                </Text>
              </View>
            </View>
          )}

          <View style={{ height: 40 }} />
        </ScrollView>
      )}

      {/* ── Config Tab ─────────────────────────────────────────────── */}
      {activeTab === "config" && (
        <ScrollView style={styles.calcContainer}>
          <Text style={styles.sectionTitle}>Sprayer Setup</Text>
          <Text style={styles.sectionSubtitle}>Save your sprayer specs — used automatically when logging sessions</Text>

          <Row label="Sprayer / Equipment Name">
            <TextInput style={styles.input} placeholder="e.g. John Deere R4045"
              value={configForm.name} onChangeText={(v) => setConfigForm({ ...configForm, name: v })} />
          </Row>
          <Row label="Tractor HP *">
            <TextInput style={styles.input} placeholder="e.g. 250" keyboardType="decimal-pad"
              value={configForm.hp} onChangeText={(v) => setConfigForm({ ...configForm, hp: v })} />
          </Row>
          <Row label="Boom Width (ft) *">
            <TextInput style={styles.input} placeholder="e.g. 90" keyboardType="decimal-pad"
              value={configForm.boomWidthFt} onChangeText={(v) => setConfigForm({ ...configForm, boomWidthFt: v })} />
          </Row>
          <Row label="Tank Capacity (gallons)">
            <TextInput style={styles.input} placeholder="e.g. 1000" keyboardType="decimal-pad"
              value={configForm.tankGallons} onChangeText={(v) => setConfigForm({ ...configForm, tankGallons: v })} />
          </Row>
          <Row label="Default Ground Speed (mph)">
            <TextInput style={styles.input} placeholder="Leave blank to auto-estimate from HP"
              keyboardType="decimal-pad" value={configForm.defaultSpeedMph}
              onChangeText={(v) => setConfigForm({ ...configForm, defaultSpeedMph: v })} />
          </Row>

          {/* Preview */}
          {configForm.hp && configForm.boomWidthFt && (
            <View style={styles.previewBox}>
              <Text style={styles.previewTitle}>Preview</Text>
              {(() => {
                const hp = parseFloat(configForm.hp);
                const bw = parseFloat(configForm.boomWidthFt);
                const spd = configForm.defaultSpeedMph ? parseFloat(configForm.defaultSpeedMph) : estimateSpeed(hp);
                const aph = ((spd * bw) / 8.25).toFixed(1);
                return (
                  <>
                    <Text style={styles.previewStat}>Speed: {spd} mph{!configForm.defaultSpeedMph ? " (estimated)" : ""}</Text>
                    <Text style={styles.previewHighlight}>{aph} acres/hour coverage</Text>
                  </>
                );
              })()}
            </View>
          )}

          <TouchableOpacity style={styles.calcBtn} onPress={handleSaveConfig}>
            <Text style={styles.calcBtnText}>Save Sprayer Config</Text>
          </TouchableOpacity>

          <View style={{ height: 40 }} />
        </ScrollView>
      )}

      {/* ── Log Session Modal ──────────────────────────────────────── */}
      <Modal visible={logModal} animationType="slide" presentationStyle="pageSheet">
        <View style={styles.modal}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Log Spray Session</Text>
            <TouchableOpacity onPress={() => { setLogModal(false); resetLogForm(); }}>
              <Text style={styles.modalClose}>✕</Text>
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.modalBody}>
            {config && (
              <View style={styles.configSummary}>
                <Text style={styles.configSummaryText}>
                  Using: {config.name || "Saved Sprayer"} · {config.hp} HP · {config.boomWidthFt} ft boom
                </Text>
              </View>
            )}

            {!config && (
              <View style={styles.warnBox}>
                <Text style={styles.warnText}>⚠️ No sprayer configured. Set up your sprayer in the Config tab for accurate calculations.</Text>
              </View>
            )}

            <Label text="Field Name *" />
            <TextInput style={styles.input} placeholder="e.g. North Field"
              value={logForm.fieldName} onChangeText={(v) => setLogForm({ ...logForm, fieldName: v })} />

            <Label text="Chemical / Product" />
            <TextInput style={styles.input} placeholder="e.g. Roundup, 2-4D"
              value={logForm.chemical} onChangeText={(v) => setLogForm({ ...logForm, chemical: v })} />

            <View style={styles.rateRow}>
              <View style={{ flex: 1, marginRight: 8 }}>
                <Label text="Application Rate" />
                <TextInput style={styles.input} placeholder="Rate" keyboardType="decimal-pad"
                  value={logForm.ratePerAcre} onChangeText={(v) => setLogForm({ ...logForm, ratePerAcre: v })} />
              </View>
              <View style={{ flex: 1 }}>
                <Label text="Unit" />
                <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                  {UNITS.map((u) => (
                    <TouchableOpacity key={u}
                      style={[styles.unitChip, logForm.unit === u && styles.unitChipActive]}
                      onPress={() => setLogForm({ ...logForm, unit: u })}>
                      <Text style={[styles.unitText, logForm.unit === u && styles.unitTextActive]}>{u}</Text>
                    </TouchableOpacity>
                  ))}
                </ScrollView>
              </View>
            </View>

            {/* Timer vs manual acres */}
            <View style={styles.switchRow}>
              <Text style={styles.switchLabel}>Use live timer to track time</Text>
              <Switch
                value={logForm.useTimer}
                onValueChange={(v) => setLogForm({ ...logForm, useTimer: v })}
                trackColor={{ true: colors.primary }}
              />
            </View>

            {logForm.useTimer ? (
              <View style={styles.timerBox}>
                <Text style={styles.timerDisplay}>{formatElapsed(elapsed)}</Text>
                {!logForm.timerRunning ? (
                  <TouchableOpacity style={[styles.timerBtn, { backgroundColor: colors.plantGreen }]} onPress={startTimer}>
                    <Text style={styles.timerBtnText}>▶ Start Timer</Text>
                  </TouchableOpacity>
                ) : (
                  <TouchableOpacity style={[styles.timerBtn, { backgroundColor: colors.harvestAmber }]} onPress={stopTimer}>
                    <Text style={styles.timerBtnText}>⏹ Stop Timer</Text>
                  </TouchableOpacity>
                )}
                {logForm.startTime && !logForm.timerRunning && (
                  <Text style={styles.timerDone}>Recorded: {(elapsed / 3600).toFixed(2)} hours</Text>
                )}
              </View>
            ) : (
              <>
                <Label text="Field Size (acres)" />
                <TextInput style={styles.input} placeholder="e.g. 80" keyboardType="decimal-pad"
                  value={logForm.fieldAcres} onChangeText={(v) => setLogForm({ ...logForm, fieldAcres: v })} />
              </>
            )}

            <Label text="Tank Fills" />
            <View style={styles.tankRow}>
              <View style={{ flex: 1, marginRight: 8 }}>
                <TextInput style={styles.input} placeholder="# of fills" keyboardType="number-pad"
                  value={logForm.tankFills} onChangeText={(v) => setLogForm({ ...logForm, tankFills: v })} />
              </View>
              <View style={{ flex: 1 }}>
                <TextInput style={styles.input} placeholder="Gallons/fill"
                  keyboardType="decimal-pad" value={logForm.tankGallons}
                  onChangeText={(v) => setLogForm({ ...logForm, tankGallons: v })} />
              </View>
            </View>
            {logForm.tankFills && logForm.tankGallons ? (
              <Text style={styles.tankCalc}>
                Total sprayed: {parseFloat(logForm.tankFills) * parseFloat(logForm.tankGallons)} gallons
              </Text>
            ) : null}

            {/* ── Compliance Section ── */}
            <View style={styles.complianceDivider}>
              <Text style={styles.complianceDividerText}>COMPLIANCE / REGULATORY</Text>
            </View>

            <Label text="EPA Registration Number" />
            <TextInput style={styles.input} placeholder="e.g. 100-1234"
              value={logForm.epaRegNum} onChangeText={(v) => setLogForm({ ...logForm, epaRegNum: v })} />

            <View style={styles.twoColRow}>
              <View style={{ flex: 1, marginRight: 8 }}>
                <Label text="Cost per Acre ($)" />
                <TextInput style={styles.input} placeholder="e.g. 12.50" keyboardType="decimal-pad"
                  value={logForm.costPerAcre} onChangeText={(v) => setLogForm({ ...logForm, costPerAcre: v })} />
              </View>
              <View style={{ flex: 1 }}>
                <Label text="PHI (days before harvest)" />
                <TextInput style={styles.input} placeholder="e.g. 14" keyboardType="number-pad"
                  value={logForm.phi} onChangeText={(v) => setLogForm({ ...logForm, phi: v })} />
              </View>
            </View>

            <Label text="Licensed Applicator Name" />
            <TextInput style={styles.input} placeholder="Full name"
              value={logForm.applicatorName} onChangeText={(v) => setLogForm({ ...logForm, applicatorName: v })} />

            <Label text="Applicator License Number" />
            <TextInput style={styles.input} placeholder="State license #"
              value={logForm.applicatorLicenseNum} onChangeText={(v) => setLogForm({ ...logForm, applicatorLicenseNum: v })} />

            <View style={styles.twoColRow}>
              <View style={{ flex: 1, marginRight: 8 }}>
                <Label text="Wind Speed (mph)" />
                <TextInput style={styles.input} placeholder="e.g. 8" keyboardType="decimal-pad"
                  value={logForm.windSpeed} onChangeText={(v) => setLogForm({ ...logForm, windSpeed: v })} />
              </View>
              <View style={{ flex: 1 }}>
                <Label text="Wind Direction" />
                <TextInput style={styles.input} placeholder="e.g. NW"
                  value={logForm.windDir} onChangeText={(v) => setLogForm({ ...logForm, windDir: v })} />
              </View>
            </View>

            <Label text="Air Temp (°F)" />
            <TextInput style={styles.input} placeholder="e.g. 72" keyboardType="decimal-pad"
              value={logForm.temp} onChangeText={(v) => setLogForm({ ...logForm, temp: v })} />

            <Label text="Notes" />
            <TextInput style={[styles.input, styles.textArea]} placeholder="Conditions, observations..."
              multiline numberOfLines={3} value={logForm.notes}
              onChangeText={(v) => setLogForm({ ...logForm, notes: v })} />

            <TouchableOpacity style={styles.submitBtn} onPress={handleLogSession}>
              <Text style={styles.submitBtnText}>Save Spray Session</Text>
            </TouchableOpacity>
          </ScrollView>
        </View>
      </Modal>
    </View>
  );
}

// Small helpers
function estimateSpeed(hp) {
  if (hp < 75) return 5;
  if (hp < 150) return 7;
  if (hp < 250) return 9;
  if (hp < 400) return 11;
  return 13;
}

function formatDate(iso) {
  if (!iso) return "";
  return new Date(iso).toLocaleDateString([], { month: "short", day: "numeric", year: "numeric", hour: "2-digit", minute: "2-digit" });
}

function StatBox({ icon, label, value }) {
  return (
    <View style={styles.statBox}>
      <Text style={styles.statIcon}>{icon}</Text>
      <Text style={styles.statValue}>{value}</Text>
      <Text style={styles.statLabel}>{label}</Text>
    </View>
  );
}

function Row({ label, children }) {
  return (
    <View style={{ marginBottom: 14 }}>
      <Text style={styles.label}>{label}</Text>
      {children}
    </View>
  );
}

function Label({ text }) {
  return <Text style={styles.label}>{text}</Text>;
}

function ResultRow({ icon, label, value, highlight }) {
  return (
    <View style={[styles.resultRow, highlight && styles.resultRowHighlight]}>
      <Text style={styles.resultIcon}>{icon}</Text>
      <Text style={styles.resultLabel}>{label}</Text>
      <Text style={[styles.resultValue, highlight && { color: colors.primary }]}>{value}</Text>
    </View>
  );
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
  tabs: { flexDirection: "row", backgroundColor: colors.surface, borderBottomWidth: 1, borderBottomColor: colors.border },
  tab: { flex: 1, paddingVertical: 13, alignItems: "center" },
  tabActive: { borderBottomWidth: 3, borderBottomColor: colors.primary },
  tabText: { fontSize: 13, color: colors.textSecondary, fontWeight: "600" },
  tabTextActive: { color: colors.primary },
  list: { padding: 16 },
  sessionCard: {
    backgroundColor: colors.surface, borderRadius: 16, padding: 16, marginBottom: 12,
    shadowColor: "#000", shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.07, shadowRadius: 6, elevation: 2,
  },
  sessionHeader: { flexDirection: "row", justifyContent: "space-between", marginBottom: 10 },
  sessionField: { fontSize: 16, fontWeight: "700", color: colors.text },
  sessionDate: { fontSize: 12, color: colors.textSecondary, marginTop: 2 },
  deleteBtnText: { color: colors.textSecondary, fontSize: 16, padding: 4 },
  chemRow: { flexDirection: "row", marginBottom: 10, gap: 8 },
  chemLabel: { fontSize: 12, color: colors.textSecondary, fontWeight: "600" },
  chemValue: { fontSize: 13, color: colors.text, fontWeight: "500", flex: 1 },
  statsGrid: { flexDirection: "row", flexWrap: "wrap", gap: 8, marginBottom: 10 },
  statBox: {
    backgroundColor: colors.background, borderRadius: 10, padding: 10,
    alignItems: "center", flex: 1, minWidth: "40%",
  },
  statIcon: { fontSize: 18, marginBottom: 3 },
  statValue: { fontSize: 15, fontWeight: "700", color: colors.text },
  statLabel: { fontSize: 10, color: colors.textSecondary, textAlign: "center" },
  specRow: { borderTopWidth: 1, borderTopColor: colors.border, paddingTop: 8, marginTop: 4 },
  specText: { fontSize: 12, color: colors.textSecondary },
  tankText: { fontSize: 12, color: colors.textSecondary, marginTop: 4 },
  notes: { fontSize: 13, color: colors.textSecondary, marginTop: 6, fontStyle: "italic" },
  empty: { alignItems: "center", paddingTop: 80 },
  emptyIcon: { fontSize: 48, marginBottom: 12 },
  emptyText: { fontSize: 17, fontWeight: "700", color: colors.text, marginBottom: 6 },
  emptySubText: { fontSize: 14, color: colors.textSecondary, textAlign: "center", paddingHorizontal: 40 },
  // Calculator
  calcContainer: { flex: 1, padding: 20 },
  sectionTitle: { fontSize: 20, fontWeight: "800", color: colors.text, marginBottom: 4 },
  sectionSubtitle: { fontSize: 13, color: colors.textSecondary, marginBottom: 20 },
  label: { fontSize: 13, fontWeight: "700", color: colors.textSecondary, marginBottom: 6, marginTop: 4, letterSpacing: 0.3 },
  input: {
    backgroundColor: colors.surface, borderRadius: 12, borderWidth: 1, borderColor: colors.border,
    paddingHorizontal: 14, paddingVertical: 12, fontSize: 15, color: colors.text,
  },
  calcBtn: { backgroundColor: colors.primary, borderRadius: 14, padding: 16, alignItems: "center", marginTop: 20 },
  calcBtnText: { color: "#fff", fontSize: 15, fontWeight: "700" },
  resultCard: {
    backgroundColor: colors.surface, borderRadius: 16, padding: 18, marginTop: 20,
    shadowColor: "#000", shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.08, shadowRadius: 8, elevation: 3,
  },
  resultTitle: { fontSize: 16, fontWeight: "800", color: colors.text, marginBottom: 12 },
  resultRow: { flexDirection: "row", alignItems: "center", paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: colors.border },
  resultRowHighlight: { backgroundColor: "#E8F5E9", borderRadius: 8, paddingHorizontal: 8, marginHorizontal: -8, borderBottomWidth: 0, marginBottom: 2 },
  resultIcon: { fontSize: 18, width: 30 },
  resultLabel: { flex: 1, fontSize: 14, color: colors.text },
  resultValue: { fontSize: 15, fontWeight: "700", color: colors.text },
  formulaBox: { backgroundColor: "#F5F5F5", borderRadius: 10, padding: 14, marginTop: 14 },
  formulaTitle: { fontSize: 12, fontWeight: "700", color: colors.textSecondary, marginBottom: 6 },
  formulaText: { fontSize: 13, color: colors.text, fontFamily: "monospace", lineHeight: 20 },
  previewBox: { backgroundColor: "#E8F5E9", borderRadius: 12, padding: 14, marginTop: 8, marginBottom: 8 },
  previewTitle: { fontSize: 12, fontWeight: "700", color: colors.primary, marginBottom: 4 },
  previewStat: { fontSize: 13, color: colors.text },
  previewHighlight: { fontSize: 20, fontWeight: "800", color: colors.primary, marginTop: 4 },
  // Modal
  modal: { flex: 1, backgroundColor: colors.background },
  modalHeader: {
    flexDirection: "row", justifyContent: "space-between", alignItems: "center",
    padding: 20, paddingTop: 60, backgroundColor: colors.primaryDark,
  },
  modalTitle: { color: "#fff", fontSize: 20, fontWeight: "800" },
  modalClose: { color: "rgba(255,255,255,0.8)", fontSize: 20 },
  modalBody: { padding: 20 },
  configSummary: { backgroundColor: "#E8F5E9", borderRadius: 10, padding: 12, marginBottom: 16 },
  configSummaryText: { fontSize: 13, color: colors.primary, fontWeight: "600" },
  warnBox: { backgroundColor: "#FFF3E0", borderRadius: 10, padding: 12, marginBottom: 16 },
  warnText: { fontSize: 13, color: colors.warning },
  rateRow: { flexDirection: "row" },
  unitChip: {
    paddingHorizontal: 10, paddingVertical: 6, borderRadius: 14, marginRight: 6,
    backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border,
  },
  unitChipActive: { backgroundColor: colors.primary, borderColor: colors.primary },
  unitText: { fontSize: 12, color: colors.textSecondary, fontWeight: "600" },
  unitTextActive: { color: "#fff" },
  switchRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginVertical: 14 },
  switchLabel: { fontSize: 15, color: colors.text, fontWeight: "600" },
  timerBox: { alignItems: "center", padding: 20, backgroundColor: "#F5F5F5", borderRadius: 14, marginBottom: 14 },
  timerDisplay: { fontSize: 42, fontWeight: "800", color: colors.text, fontVariant: ["tabular-nums"], marginBottom: 16 },
  timerBtn: { paddingHorizontal: 32, paddingVertical: 14, borderRadius: 30 },
  timerBtnText: { color: "#fff", fontSize: 16, fontWeight: "700" },
  timerDone: { marginTop: 10, color: colors.primary, fontWeight: "600", fontSize: 14 },
  tankRow: { flexDirection: "row", marginBottom: 4 },
  tankCalc: { fontSize: 12, color: colors.textSecondary, marginBottom: 8 },
  textArea: { height: 80, textAlignVertical: "top" },
  submitBtn: { backgroundColor: colors.primary, borderRadius: 14, padding: 16, alignItems: "center", marginTop: 20, marginBottom: 40 },
  submitBtnText: { color: "#fff", fontSize: 15, fontWeight: "700" },
  complianceDivider: {
    marginTop: 24, marginBottom: 8, paddingTop: 16,
    borderTopWidth: 1, borderTopColor: colors.border,
  },
  complianceDividerText: {
    fontSize: 10, fontWeight: "800", color: colors.textMuted, letterSpacing: 1.5,
  },
  twoColRow: { flexDirection: "row" },
});
