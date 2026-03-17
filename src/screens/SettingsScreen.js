import React, { useState } from "react";
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Modal, Linking } from "react-native";
import { useSubscription } from "../context/SubscriptionContext";
import { SubscriptionStatusCard } from "./SubscriptionScreen";
import SubscriptionScreen from "./SubscriptionScreen";
import { colors } from "../theme/colors";

export default function SettingsScreen() {
  const { isSubscribed, activePlan, expiresAt, restore, purchasing } = useSubscription();
  const [showPaywall, setShowPaywall] = useState(false);

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Account & Settings</Text>
        <Text style={styles.headerSub}>FieldOX</Text>
      </View>

      <ScrollView style={styles.scroll}>

        {/* ── Subscription Status ─────────────────────────────── */}
        <SectionLabel text="SUBSCRIPTION" />

        {isSubscribed ? (
          <>
            <SubscriptionStatusCard />
            <SettingsRow
              label="Manage Subscription"
              sub="Cancel or change your plan"
              onPress={() => Linking.openURL(
                "https://apps.apple.com/account/subscriptions"  // iOS
                // Android: "https://play.google.com/store/account/subscriptions"
              )}
            />
            <SettingsRow
              label="Restore Purchases"
              sub="Sync your subscription to this device"
              onPress={restore}
              loading={purchasing}
            />
          </>
        ) : (
          <View style={styles.upgradeCard}>
            <View style={styles.upgradeLeft}>
              <Text style={styles.upgradeTitle}>Upgrade to FieldOX</Text>
              <Text style={styles.upgradeDesc}>Unlock all features including compliance records, season analytics, and unlimited fields.</Text>
              <View style={styles.pricingRow}>
                <View style={styles.pricePill}>
                  <Text style={styles.pricePillText}>$1 first month</Text>
                </View>
                <View style={[styles.pricePill, styles.pricePillGold]}>
                  <Text style={styles.pricePillText}>$79/year</Text>
                </View>
              </View>
            </View>
            <TouchableOpacity style={styles.upgradeBtn} onPress={() => setShowPaywall(true)}>
              <Text style={styles.upgradeBtnText}>View Plans</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* ── App Info ─────────────────────────────────────────── */}
        <SectionLabel text="ABOUT" />
        <SettingsRow label="Terms of Service" onPress={() => Linking.openURL("https://yoursite.com/terms")} />
        <SettingsRow label="Privacy Policy" onPress={() => Linking.openURL("https://yoursite.com/privacy")} />
        <SettingsRow label="Contact Support" sub="support@fieldox.com" onPress={() => Linking.openURL("mailto:support@fieldox.com")} />

        <View style={styles.versionRow}>
          <Text style={styles.versionText}>FieldOX · Version 1.0.0</Text>
        </View>

        <View style={{ height: 40 }} />
      </ScrollView>

      <Modal visible={showPaywall} animationType="slide">
        <SubscriptionScreen onDismiss={() => setShowPaywall(false)} />
      </Modal>
    </View>
  );
}

function SectionLabel({ text }) {
  return <Text style={styles.sectionLabel}>{text}</Text>;
}

function SettingsRow({ label, sub, onPress, loading }) {
  return (
    <TouchableOpacity style={styles.row} onPress={onPress} disabled={loading}>
      <View style={styles.rowContent}>
        <Text style={styles.rowLabel}>{label}</Text>
        {sub ? <Text style={styles.rowSub}>{sub}</Text> : null}
      </View>
      <Text style={styles.rowChevron}>{loading ? "..." : "›"}</Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  header: { backgroundColor: colors.headerBg, paddingTop: 60, paddingBottom: 20, paddingHorizontal: 20 },
  headerTitle: { color: "#fff", fontSize: 22, fontWeight: "800" },
  headerSub: { color: colors.headerSub, fontSize: 12, marginTop: 4 },
  scroll: { flex: 1 },
  sectionLabel: {
    fontSize: 10, fontWeight: "800", color: colors.textMuted, letterSpacing: 1.5,
    paddingHorizontal: 20, paddingTop: 24, paddingBottom: 8,
  },
  // Upgrade card
  upgradeCard: {
    marginHorizontal: 16, backgroundColor: colors.headerBg, borderRadius: 14,
    padding: 20, flexDirection: "row", alignItems: "center", gap: 12,
  },
  upgradeLeft: { flex: 1 },
  upgradeTitle: { color: "#fff", fontSize: 16, fontWeight: "800", marginBottom: 6 },
  upgradeDesc: { color: "rgba(255,255,255,0.6)", fontSize: 12, lineHeight: 17, marginBottom: 10 },
  pricingRow: { flexDirection: "row", gap: 8 },
  pricePill: { backgroundColor: "rgba(82,183,136,0.2)", borderRadius: 6, paddingHorizontal: 10, paddingVertical: 4 },
  pricePillGold: { backgroundColor: "rgba(201,168,76,0.2)" },
  pricePillText: { color: "#fff", fontSize: 11, fontWeight: "700" },
  upgradeBtn: { backgroundColor: colors.accent, borderRadius: 10, paddingHorizontal: 16, paddingVertical: 12 },
  upgradeBtnText: { color: "#fff", fontSize: 13, fontWeight: "700" },
  // Settings rows
  row: {
    flexDirection: "row", alignItems: "center", backgroundColor: colors.surface,
    paddingHorizontal: 20, paddingVertical: 16, borderBottomWidth: 1, borderBottomColor: colors.border,
  },
  rowContent: { flex: 1 },
  rowLabel: { fontSize: 15, color: colors.text, fontWeight: "500" },
  rowSub: { fontSize: 12, color: colors.textMuted, marginTop: 2 },
  rowChevron: { fontSize: 18, color: colors.textMuted },
  versionRow: { alignItems: "center", paddingTop: 24 },
  versionText: { fontSize: 12, color: colors.textMuted },
});
