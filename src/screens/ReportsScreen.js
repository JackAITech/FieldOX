import React, { useEffect, useState, useCallback } from "react";
import {
  View, Text, StyleSheet, ScrollView, ActivityIndicator,
  RefreshControl, TouchableOpacity,
} from "react-native";
import { fetchSeasonAnalytics, fetchSpraySessions, fetchMoistureReadings, fetchFields } from "../services/api";
import { colors } from "../theme/colors";

export default function ReportsScreen() {
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [analytics, setAnalytics] = useState(null);
  const [sessions, setSessions] = useState([]);
  const [moisture, setMoisture] = useState([]);
  const [fields, setFields] = useState([]);
  const [activeTab, setActiveTab] = useState("season"); // "season" | "spray" | "compliance"

  const load = useCallback(async (isRefresh = false) => {
    if (!isRefresh) setLoading(true);
    try {
      const [a, s, m, f] = await Promise.all([
        fetchSeasonAnalytics(),
        fetchSpraySessions(),
        fetchMoistureReadings(),
        fetchFields(),
      ]);
      setAnalytics(a);
      setSessions(s);
      setMoisture(m);
      setFields(f);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => { load(); }, []);

  if (loading) {
    return <View style={styles.centered}><ActivityIndicator size="large" color={colors.primary} /></View>;
  }

  // Field activity from analytics
  const fieldActivity = analytics?.fieldActivity || {};
  const fieldActivityList = Object.entries(fieldActivity)
    .map(([name, data]) => ({ name, ...data }))
    .sort((a, b) => b.acres - a.acres);

  // Compliance records — sessions with applicator or EPA info
  const complianceSessions = sessions.filter(
    (s) => s.chemical || s.epaRegNum || s.applicatorName
  );

  // Monthly spray breakdown
  const monthlySpray = {};
  sessions.forEach((s) => {
    const month = new Date(s.createdAt).toLocaleDateString([], { month: "short", year: "2-digit" });
    if (!monthlySpray[month]) monthlySpray[month] = { sessions: 0, acres: 0, cost: 0 };
    monthlySpray[month].sessions += 1;
    monthlySpray[month].acres += s.acresCovered || 0;
    monthlySpray[month].cost += s.totalCost || 0;
  });

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Reports & Analytics</Text>
        <Text style={styles.headerSub}>Current Season</Text>
      </View>

      {/* Tabs */}
      <View style={styles.tabs}>
        {[
          { key: "season", label: "Season Summary" },
          { key: "spray", label: "Spray Activity" },
          { key: "compliance", label: "Compliance Log" },
        ].map((t) => (
          <TouchableOpacity key={t.key} style={[styles.tab, activeTab === t.key && styles.tabActive]}
            onPress={() => setActiveTab(t.key)}>
            <Text style={[styles.tabText, activeTab === t.key && styles.tabTextActive]}>{t.label}</Text>
          </TouchableOpacity>
        ))}
      </View>

      <ScrollView
        style={styles.scroll}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); load(true); }} tintColor={colors.primary} />}
      >

        {/* ── Season Summary ──────────────────────────────────── */}
        {activeTab === "season" && (
          <>
            <SectionLabel text="Operation Overview" />
            <View style={styles.grid2}>
              <StatCard label="Total Acres Managed" value={`${analytics?.totalAcresManaged ?? 0}`} unit="ac" accent={colors.primary} />
              <StatCard label="Registered Fields" value={`${analytics?.totalFields ?? 0}`} unit="fields" accent={colors.primaryLight} />
              <StatCard label="Spray Sessions" value={`${analytics?.totalSpraySessions ?? 0}`} unit="jobs" accent={colors.harvest} />
              <StatCard label="Spray Hours Logged" value={`${analytics?.totalSprayHours ?? 0}`} unit="hr" accent={colors.gold} />
            </View>

            <SectionLabel text="Cost Summary" />
            <View style={styles.costCard}>
              <CostRow label="Total Spray Input Cost" value={fmt$(analytics?.totalSprayCost)} highlight />
              <CostRow label="Total Acres Sprayed" value={`${analytics?.totalSprayAcres ?? 0} ac`} />
              <CostRow label="Avg Cost per Acre"
                value={analytics?.totalSprayAcres > 0
                  ? fmt$(analytics.totalSprayCost / analytics.totalSprayAcres)
                  : "—"} />
            </View>

            <SectionLabel text="Field Activity Ranking" />
            {fieldActivityList.length === 0
              ? <EmptyRow text="No spray activity recorded yet." />
              : fieldActivityList.map((f, i) => (
                <View key={f.name} style={styles.rankRow}>
                  <Text style={styles.rankNum}>{i + 1}</Text>
                  <View style={styles.rankInfo}>
                    <Text style={styles.rankName}>{f.name}</Text>
                    <Text style={styles.rankMeta}>{f.sessions} spray job{f.sessions !== 1 ? "s" : ""}  ·  {Math.round(f.acres)} ac covered</Text>
                  </View>
                  <Text style={styles.rankCost}>{fmt$(f.cost)}</Text>
                </View>
              ))
            }

            <SectionLabel text="Moisture Alerts" />
            {analytics?.moistureAlerts > 0
              ? <View style={styles.alertCard}>
                  <Text style={styles.alertIcon}>⚠</Text>
                  <View>
                    <Text style={styles.alertTitle}>{analytics.moistureAlerts} Field{analytics.moistureAlerts !== 1 ? "s" : ""} Below Threshold</Text>
                    <Text style={styles.alertDesc}>Moisture readings under 30% — consider irrigation review.</Text>
                  </View>
                </View>
              : <View style={styles.okCard}>
                  <Text style={styles.okText}>✓ All moisture readings within acceptable range</Text>
                </View>
            }
          </>
        )}

        {/* ── Spray Activity ──────────────────────────────────── */}
        {activeTab === "spray" && (
          <>
            {Object.keys(monthlySpray).length > 0 && (
              <>
                <SectionLabel text="Monthly Breakdown" />
                <View style={styles.tableCard}>
                  <TableHeader cols={["Month", "Jobs", "Acres", "Cost"]} />
                  {Object.entries(monthlySpray).map(([month, data]) => (
                    <TableRow key={month} cols={[month, data.sessions, Math.round(data.acres), fmt$(data.cost)]} />
                  ))}
                </View>
              </>
            )}

            <SectionLabel text="All Spray Sessions" />
            {sessions.length === 0
              ? <EmptyRow text="No spray sessions logged." />
              : sessions.map((s) => (
                <View key={s.id} style={styles.sessionRow}>
                  <View style={styles.sessionRowLeft}>
                    <Text style={styles.sessionField}>{s.fieldName}</Text>
                    <Text style={styles.sessionMeta}>{shortDate(s.createdAt)}  ·  {s.chemical || "No chemical recorded"}</Text>
                    <Text style={styles.sessionMeta}>{s.acresCovered ?? "—"} ac  ·  {s.acresPerHour} ac/hr  ·  {s.hp} HP  ·  {s.boomWidthFt} ft</Text>
                  </View>
                  <View style={styles.sessionRowRight}>
                    {s.totalCost != null && <Text style={styles.sessionCost}>{fmt$(s.totalCost)}</Text>}
                    {s.hoursWorked != null && <Text style={styles.sessionHours}>{s.hoursWorked} hr</Text>}
                  </View>
                </View>
              ))
            }
          </>
        )}

        {/* ── Compliance Log ───────────────────────────────────── */}
        {activeTab === "compliance" && (
          <>
            <View style={styles.complianceNote}>
              <Text style={styles.complianceNoteText}>
                ⚖ Pesticide application records are required by federal and state law. This log meets EPA record-keeping requirements when applicator and EPA registration number are provided.
              </Text>
            </View>

            <SectionLabel text="Pesticide Application Records" />
            {complianceSessions.length === 0
              ? <EmptyRow text="No compliance records yet. Add EPA reg# and applicator info when logging spray sessions." />
              : complianceSessions.map((s) => (
                <View key={s.id} style={styles.complianceCard}>
                  <View style={styles.complianceHeaderRow}>
                    <Text style={styles.complianceField}>{s.fieldName}</Text>
                    <Text style={styles.complianceDate}>{shortDate(s.createdAt)}</Text>
                  </View>

                  <ComplianceRow label="Product / Chemical" value={s.chemical || "—"} />
                  <ComplianceRow label="EPA Reg. Number" value={s.epaRegNum || "—"} />
                  <ComplianceRow label="Application Rate" value={s.ratePerAcre ? `${s.ratePerAcre} ${s.unit}` : "—"} />
                  <ComplianceRow label="Total Chemical Used" value={s.totalChemical ? `${s.totalChemical} ${s.totalChemicalUnit}` : "—"} />
                  <ComplianceRow label="Acres Treated" value={s.acresCovered ? `${s.acresCovered} ac` : "—"} />
                  <ComplianceRow label="Start Time" value={s.startTime ? new Date(s.startTime).toLocaleString() : "—"} />
                  <ComplianceRow label="End Time" value={s.endTime ? new Date(s.endTime).toLocaleString() : "—"} />
                  <ComplianceRow label="Licensed Applicator" value={s.applicatorName || "—"} />
                  <ComplianceRow label="License Number" value={s.applicatorLicenseNum || "—"} />
                  <ComplianceRow label="PHI (days)" value={s.phi != null ? `${s.phi} days` : "—"} />
                  {(s.windSpeed || s.temp) && (
                    <ComplianceRow label="Conditions" value={[s.windSpeed ? `${s.windSpeed} mph wind` : null, s.windDir, s.temp ? `${s.temp}°F` : null].filter(Boolean).join(", ")} />
                  )}
                  {s.notes ? <ComplianceRow label="Notes" value={s.notes} /> : null}
                </View>
              ))
            }
          </>
        )}

        <View style={{ height: 40 }} />
      </ScrollView>
    </View>
  );
}

// ── Sub-components ──────────────────────────────────────────────────────────

function SectionLabel({ text }) {
  return <Text style={styles.sectionLabel}>{text}</Text>;
}

function StatCard({ label, value, unit, accent }) {
  return (
    <View style={[styles.statCard, { borderTopColor: accent }]}>
      <Text style={[styles.statValue, { color: accent }]}>{value}</Text>
      {unit ? <Text style={styles.statUnit}>{unit}</Text> : null}
      <Text style={styles.statLabel}>{label}</Text>
    </View>
  );
}

function CostRow({ label, value, highlight }) {
  return (
    <View style={styles.costRow}>
      <Text style={styles.costLabel}>{label}</Text>
      <Text style={[styles.costValue, highlight && { color: colors.primary, fontWeight: "800" }]}>{value}</Text>
    </View>
  );
}

function TableHeader({ cols }) {
  return (
    <View style={[styles.tableRow, styles.tableHeaderRow]}>
      {cols.map((c, i) => <Text key={i} style={[styles.tableCell, styles.tableHeaderCell, i > 0 && styles.tableCellRight]}>{c}</Text>)}
    </View>
  );
}

function TableRow({ cols }) {
  return (
    <View style={styles.tableRow}>
      {cols.map((c, i) => <Text key={i} style={[styles.tableCell, i > 0 && styles.tableCellRight]}>{c}</Text>)}
    </View>
  );
}

function ComplianceRow({ label, value }) {
  return (
    <View style={styles.complianceRow}>
      <Text style={styles.complianceLabel}>{label}</Text>
      <Text style={styles.complianceValue}>{value}</Text>
    </View>
  );
}

function EmptyRow({ text }) {
  return (
    <View style={styles.emptyRow}>
      <Text style={styles.emptyRowText}>{text}</Text>
    </View>
  );
}

function fmt$(val) {
  if (val == null || val === 0) return "$0.00";
  return `$${Number(val).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

function shortDate(iso) {
  if (!iso) return "";
  return new Date(iso).toLocaleDateString([], { month: "short", day: "numeric", year: "numeric" });
}

// ── Styles ──────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  centered: { flex: 1, justifyContent: "center", alignItems: "center" },
  header: { backgroundColor: colors.headerBg, paddingTop: 60, paddingBottom: 20, paddingHorizontal: 20 },
  headerTitle: { color: "#fff", fontSize: 22, fontWeight: "800" },
  headerSub: { color: colors.headerSub, fontSize: 12, marginTop: 4 },
  tabs: { flexDirection: "row", backgroundColor: colors.surface, borderBottomWidth: 1, borderBottomColor: colors.border },
  tab: { flex: 1, paddingVertical: 13, alignItems: "center" },
  tabActive: { borderBottomWidth: 3, borderBottomColor: colors.primary },
  tabText: { fontSize: 11, fontWeight: "700", color: colors.textMuted, letterSpacing: 0.3 },
  tabTextActive: { color: colors.primary },
  scroll: { flex: 1 },
  sectionLabel: { fontSize: 10, fontWeight: "800", color: colors.textMuted, letterSpacing: 1.5, paddingHorizontal: 16, paddingTop: 20, paddingBottom: 8 },

  // Stat grid
  grid2: { flexDirection: "row", flexWrap: "wrap", paddingHorizontal: 12 },
  statCard: {
    width: "50%", padding: 16, backgroundColor: colors.surface, borderTopWidth: 3,
    borderRightWidth: 1, borderBottomWidth: 1, borderColor: colors.border,
  },
  statValue: { fontSize: 24, fontWeight: "900" },
  statUnit: { fontSize: 11, color: colors.textMuted, fontWeight: "600", marginTop: 1 },
  statLabel: { fontSize: 11, color: colors.textSecondary, marginTop: 6, fontWeight: "600" },

  // Cost
  costCard: { marginHorizontal: 16, backgroundColor: colors.surface, borderRadius: 10, borderWidth: 1, borderColor: colors.border, overflow: "hidden" },
  costRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", paddingHorizontal: 16, paddingVertical: 13, borderBottomWidth: 1, borderBottomColor: colors.border },
  costLabel: { fontSize: 13, color: colors.textSecondary },
  costValue: { fontSize: 14, fontWeight: "700", color: colors.text },

  // Field rank
  rankRow: { flexDirection: "row", alignItems: "center", paddingHorizontal: 16, paddingVertical: 12, backgroundColor: colors.surface, borderBottomWidth: 1, borderBottomColor: colors.border },
  rankNum: { fontSize: 16, fontWeight: "900", color: colors.textMuted, width: 28 },
  rankInfo: { flex: 1 },
  rankName: { fontSize: 14, fontWeight: "700", color: colors.text },
  rankMeta: { fontSize: 11, color: colors.textMuted, marginTop: 2 },
  rankCost: { fontSize: 14, fontWeight: "700", color: colors.primary },

  // Alerts
  alertCard: {
    flexDirection: "row", alignItems: "center", marginHorizontal: 16, backgroundColor: colors.dangerLight,
    borderRadius: 10, padding: 14, gap: 12, borderWidth: 1, borderColor: colors.danger,
  },
  alertIcon: { fontSize: 22, color: colors.danger },
  alertTitle: { fontSize: 14, fontWeight: "700", color: colors.danger },
  alertDesc: { fontSize: 12, color: colors.danger, marginTop: 2 },
  okCard: { marginHorizontal: 16, backgroundColor: colors.primaryFaint, borderRadius: 10, padding: 14, borderWidth: 1, borderColor: colors.accent },
  okText: { fontSize: 13, color: colors.primary, fontWeight: "600" },

  // Table
  tableCard: { marginHorizontal: 16, backgroundColor: colors.surface, borderRadius: 10, borderWidth: 1, borderColor: colors.border, overflow: "hidden" },
  tableRow: { flexDirection: "row", borderBottomWidth: 1, borderBottomColor: colors.border },
  tableHeaderRow: { backgroundColor: colors.surfaceAlt },
  tableCell: { flex: 1, fontSize: 12, color: colors.text, paddingHorizontal: 12, paddingVertical: 10 },
  tableHeaderCell: { fontSize: 10, fontWeight: "800", color: colors.textMuted, letterSpacing: 0.5 },
  tableCellRight: { textAlign: "right" },

  // Session rows
  sessionRow: {
    flexDirection: "row", backgroundColor: colors.surface, paddingHorizontal: 16, paddingVertical: 12,
    borderBottomWidth: 1, borderBottomColor: colors.border,
  },
  sessionRowLeft: { flex: 1 },
  sessionField: { fontSize: 14, fontWeight: "700", color: colors.text },
  sessionMeta: { fontSize: 11, color: colors.textMuted, marginTop: 2 },
  sessionRowRight: { alignItems: "flex-end", justifyContent: "center" },
  sessionCost: { fontSize: 14, fontWeight: "800", color: colors.primary },
  sessionHours: { fontSize: 11, color: colors.textMuted },

  // Compliance
  complianceNote: { margin: 16, backgroundColor: colors.infoLight, borderRadius: 10, padding: 14, borderWidth: 1, borderColor: colors.info },
  complianceNoteText: { fontSize: 12, color: colors.info, lineHeight: 18 },
  complianceCard: {
    marginHorizontal: 16, marginBottom: 12, backgroundColor: colors.surface,
    borderRadius: 10, borderWidth: 1, borderColor: colors.border, overflow: "hidden",
  },
  complianceHeaderRow: {
    flexDirection: "row", justifyContent: "space-between", backgroundColor: colors.surfaceAlt,
    paddingHorizontal: 14, paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: colors.border,
  },
  complianceField: { fontSize: 14, fontWeight: "800", color: colors.text },
  complianceDate: { fontSize: 12, color: colors.textMuted },
  complianceRow: {
    flexDirection: "row", paddingHorizontal: 14, paddingVertical: 8,
    borderBottomWidth: 1, borderBottomColor: colors.border,
  },
  complianceLabel: { width: 150, fontSize: 11, fontWeight: "700", color: colors.textSecondary },
  complianceValue: { flex: 1, fontSize: 12, color: colors.text },

  emptyRow: { marginHorizontal: 16, padding: 20, backgroundColor: colors.surface, borderRadius: 10, alignItems: "center" },
  emptyRowText: { fontSize: 13, color: colors.textMuted, textAlign: "center" },
});
