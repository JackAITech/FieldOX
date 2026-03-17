import React, { useState } from "react";
import {
  View, Text, StyleSheet, TouchableOpacity, ScrollView,
  ActivityIndicator, Alert, Linking,
} from "react-native";
import { useSubscription } from "../context/SubscriptionContext";
import { colors } from "../theme/colors";

// Hard-coded pricing shown in UI — must match App Store / Play Store configuration
const PLANS = [
  {
    key: "monthly",
    label: "Monthly",
    badge: null,
    price: "$9.99",
    period: "/ month",
    intro: "$1.00 first month",
    introSub: "then $9.99/mo",
    perMonth: "$9.99",
    highlight: false,
    rcIdentifier: "monthly",   // matches Offering package identifier in RevenueCat
  },
  {
    key: "annual",
    label: "Annual",
    badge: "BEST VALUE",
    price: "$79",
    period: "/ year",
    intro: null,
    introSub: "Billed once per year",
    perMonth: "$6.58/mo",
    highlight: true,
    rcIdentifier: "annual",
  },
];

export default function SubscriptionScreen({ onDismiss }) {
  const { offerings, purchase, restore, purchasing, error, isTrialing, activePlan, expiresAt } = useSubscription();
  const [selectedPlan, setSelectedPlan] = useState("annual");

  // Find RevenueCat package objects from current offering
  function rcPackage(planKey) {
    if (!offerings?.availablePackages) return null;
    return offerings.availablePackages.find((p) =>
      p.identifier.toLowerCase().includes(planKey)
    ) || null;
  }

  async function handleSubscribe() {
    const plan = PLANS.find((p) => p.key === selectedPlan);
    const pkg = rcPackage(selectedPlan);

    if (!pkg) {
      // In dev/Expo Go — purchases not available, show info
      Alert.alert(
        "Purchases Unavailable",
        "In-app purchases require a physical device with a custom Expo build (EAS Build). " +
        "See SETUP.md for instructions.",
        [{ text: "OK" }]
      );
      return;
    }

    const result = await purchase(pkg);
    if (result.success) {
      Alert.alert(
        "Welcome to FieldOX!",
        plan.key === "monthly"
          ? "Your first month is just $1.00. Enjoy full access to all features."
          : "You're subscribed for the full year. Enjoy FieldOX!",
        [{ text: "Let's go", onPress: onDismiss }]
      );
    } else if (!result.cancelled) {
      Alert.alert("Purchase Failed", result.error || "Please try again.");
    }
  }

  async function handleRestore() {
    const result = await restore();
    if (result.restored) {
      Alert.alert("Restored", "Your subscription has been restored.", [{ text: "Continue", onPress: onDismiss }]);
    } else {
      Alert.alert("Nothing to Restore", "No active subscription found for this Apple ID / Google account.");
    }
  }

  return (
    <View style={styles.container}>
      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>

        {/* ── Logo / Hero ────────────────────────────────────────── */}
        <View style={styles.hero}>
          <Text style={styles.heroLogo}>FIELDOX</Text>
          <Text style={styles.heroTitle}>Professional Farm Management</Text>
          <Text style={styles.heroSub}>
            Full access to field registry, compliance records, spray tracking, season analytics, and more.
          </Text>
        </View>

        {/* ── Feature List ───────────────────────────────────────── */}
        <View style={styles.featureList}>
          {[
            { icon: "▦", text: "Unlimited field registry with acreage & crop tracking" },
            { icon: "🌿", text: "Spray session logging with EPA compliance records" },
            { icon: "📊", text: "Season analytics — cost per acre, field activity reports" },
            { icon: "💧", text: "Soil moisture tracking with irrigation alerts" },
            { icon: "🌽", text: "Zone-specific crop planting & harvest calendars" },
            { icon: "🌦", text: "Live weather + USDA hardiness zone detection" },
            { icon: "⚖",  text: "Pesticide application records meeting federal law" },
          ].map((f, i) => (
            <View key={i} style={styles.featureRow}>
              <Text style={styles.featureIcon}>{f.icon}</Text>
              <Text style={styles.featureText}>{f.text}</Text>
              <Text style={styles.checkmark}>✓</Text>
            </View>
          ))}
        </View>

        {/* ── Plan Selector ──────────────────────────────────────── */}
        <Text style={styles.plansLabel}>CHOOSE YOUR PLAN</Text>

        {PLANS.map((plan) => (
          <TouchableOpacity
            key={plan.key}
            style={[styles.planCard, selectedPlan === plan.key && styles.planCardSelected, plan.highlight && styles.planCardHighlight]}
            onPress={() => setSelectedPlan(plan.key)}
            activeOpacity={0.85}
          >
            {/* Best value badge */}
            {plan.badge && (
              <View style={styles.planBadge}>
                <Text style={styles.planBadgeText}>{plan.badge}</Text>
              </View>
            )}

            <View style={styles.planRow}>
              {/* Radio */}
              <View style={[styles.radio, selectedPlan === plan.key && styles.radioSelected]}>
                {selectedPlan === plan.key && <View style={styles.radioDot} />}
              </View>

              {/* Label + intro */}
              <View style={styles.planInfo}>
                <Text style={[styles.planLabel, selectedPlan === plan.key && styles.planLabelSelected]}>
                  {plan.label}
                </Text>
                {plan.intro ? (
                  <Text style={styles.planIntro}>{plan.intro}</Text>
                ) : null}
                <Text style={styles.planIntroSub}>{plan.introSub}</Text>
              </View>

              {/* Price */}
              <View style={styles.planPriceBlock}>
                <Text style={[styles.planPrice, selectedPlan === plan.key && styles.planPriceSelected]}>
                  {plan.price}
                </Text>
                <Text style={styles.planPeriod}>{plan.period}</Text>
                <Text style={styles.planPerMonth}>{plan.perMonth}</Text>
              </View>
            </View>
          </TouchableOpacity>
        ))}

        {/* Monthly intro callout */}
        {selectedPlan === "monthly" && (
          <View style={styles.introCallout}>
            <Text style={styles.introCalloutIcon}>🎉</Text>
            <Text style={styles.introCalloutText}>
              First month is only <Text style={styles.introCalloutBold}>$1.00</Text> — cancel anytime before renewal.
            </Text>
          </View>
        )}

        {/* Annual savings callout */}
        {selectedPlan === "annual" && (
          <View style={[styles.introCallout, { backgroundColor: colors.primaryFaint, borderColor: colors.accent }]}>
            <Text style={styles.introCalloutIcon}>💰</Text>
            <Text style={styles.introCalloutText}>
              Save <Text style={styles.introCalloutBold}>$40.88/year</Text> vs monthly — that's 34% off.
            </Text>
          </View>
        )}

        {/* Error */}
        {error ? <Text style={styles.errorText}>{error}</Text> : null}

        {/* CTA Button */}
        <TouchableOpacity
          style={[styles.ctaBtn, purchasing && styles.ctaBtnDisabled]}
          onPress={handleSubscribe}
          disabled={purchasing}
        >
          {purchasing ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <>
              <Text style={styles.ctaBtnText}>
                {selectedPlan === "monthly" ? "Start for $1.00" : "Subscribe for $79/year"}
              </Text>
              <Text style={styles.ctaBtnSub}>
                {selectedPlan === "monthly" ? "then $9.99/month" : "Less than $6.58/month"}
              </Text>
            </>
          )}
        </TouchableOpacity>

        {/* Restore */}
        <TouchableOpacity style={styles.restoreBtn} onPress={handleRestore} disabled={purchasing}>
          <Text style={styles.restoreBtnText}>Restore Previous Purchase</Text>
        </TouchableOpacity>

        {/* Legal */}
        <Text style={styles.legalText}>
          Subscriptions automatically renew unless cancelled at least 24 hours before the end of the current period. Manage or cancel in your device's subscription settings.{" "}
          <Text style={styles.legalLink} onPress={() => Linking.openURL("https://yoursite.com/terms")}>
            Terms of Service
          </Text>
          {" · "}
          <Text style={styles.legalLink} onPress={() => Linking.openURL("https://yoursite.com/privacy")}>
            Privacy Policy
          </Text>
        </Text>

        <View style={{ height: 32 }} />
      </ScrollView>

      {/* Dismiss (for users who want to explore first) */}
      {onDismiss && (
        <TouchableOpacity style={styles.dismissBtn} onPress={onDismiss}>
          <Text style={styles.dismissBtnText}>Maybe later</Text>
        </TouchableOpacity>
      )}
    </View>
  );
}

// ── Active subscription status card (used in Settings/Profile) ──────────────
export function SubscriptionStatusCard() {
  const { isSubscribed, isTrialing, activePlan, expiresAt } = useSubscription();

  if (!isSubscribed) return null;

  return (
    <View style={statusStyles.card}>
      <View style={statusStyles.left}>
        <Text style={statusStyles.label}>FIELDOX</Text>
        <Text style={statusStyles.plan}>
          {activePlan === "annual" ? "Annual Plan" : "Monthly Plan"}
          {isTrialing ? "  ·  Trial" : ""}
        </Text>
        {expiresAt && (
          <Text style={statusStyles.expires}>
            Renews {new Date(expiresAt).toLocaleDateString([], { month: "long", day: "numeric", year: "numeric" })}
          </Text>
        )}
      </View>
      <View style={statusStyles.badge}>
        <Text style={statusStyles.badgeText}>ACTIVE</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.headerBg },
  scroll: { paddingBottom: 16 },

  // Hero
  hero: { alignItems: "center", paddingTop: 70, paddingBottom: 28, paddingHorizontal: 24 },
  heroLogo: { color: "#fff", fontSize: 26, fontWeight: "900", letterSpacing: 4, marginBottom: 14 },
  heroPro: { color: colors.accent },
  heroTitle: { color: "#fff", fontSize: 22, fontWeight: "800", textAlign: "center", marginBottom: 10 },
  heroSub: { color: colors.headerSub, fontSize: 14, textAlign: "center", lineHeight: 21 },

  // Features
  featureList: {
    backgroundColor: "rgba(255,255,255,0.05)", marginHorizontal: 16, borderRadius: 14,
    paddingVertical: 6, marginBottom: 28,
  },
  featureRow: { flexDirection: "row", alignItems: "center", paddingHorizontal: 18, paddingVertical: 11 },
  featureIcon: { fontSize: 17, width: 30, color: colors.accent },
  featureText: { flex: 1, color: "rgba(255,255,255,0.85)", fontSize: 13, lineHeight: 18 },
  checkmark: { color: colors.accent, fontSize: 14, fontWeight: "800", marginLeft: 8 },

  // Plan cards
  plansLabel: {
    fontSize: 10, fontWeight: "800", color: "rgba(255,255,255,0.4)",
    letterSpacing: 2, paddingHorizontal: 20, marginBottom: 12,
  },
  planCard: {
    marginHorizontal: 16, marginBottom: 10, borderRadius: 14, padding: 18,
    backgroundColor: "rgba(255,255,255,0.07)", borderWidth: 1.5,
    borderColor: "rgba(255,255,255,0.12)", position: "relative",
  },
  planCardSelected: {
    backgroundColor: "rgba(82,183,136,0.12)", borderColor: colors.accent,
  },
  planCardHighlight: {
    borderColor: colors.gold,
  },
  planBadge: {
    position: "absolute", top: -11, right: 18,
    backgroundColor: colors.gold, borderRadius: 5,
    paddingHorizontal: 10, paddingVertical: 3,
  },
  planBadgeText: { color: "#fff", fontSize: 10, fontWeight: "800", letterSpacing: 0.8 },
  planRow: { flexDirection: "row", alignItems: "center" },
  radio: {
    width: 22, height: 22, borderRadius: 11, borderWidth: 2,
    borderColor: "rgba(255,255,255,0.3)", alignItems: "center", justifyContent: "center", marginRight: 14,
  },
  radioSelected: { borderColor: colors.accent },
  radioDot: { width: 10, height: 10, borderRadius: 5, backgroundColor: colors.accent },
  planInfo: { flex: 1 },
  planLabel: { color: "rgba(255,255,255,0.7)", fontSize: 16, fontWeight: "700" },
  planLabelSelected: { color: "#fff" },
  planIntro: { color: colors.accent, fontSize: 13, fontWeight: "700", marginTop: 3 },
  planIntroSub: { color: "rgba(255,255,255,0.45)", fontSize: 11, marginTop: 2 },
  planPriceBlock: { alignItems: "flex-end" },
  planPrice: { color: "rgba(255,255,255,0.7)", fontSize: 22, fontWeight: "900" },
  planPriceSelected: { color: "#fff" },
  planPeriod: { color: "rgba(255,255,255,0.4)", fontSize: 11 },
  planPerMonth: { color: colors.accent, fontSize: 11, fontWeight: "600", marginTop: 2 },

  // Callout
  introCallout: {
    flexDirection: "row", alignItems: "center", marginHorizontal: 16, marginBottom: 16,
    backgroundColor: "rgba(201,168,76,0.12)", borderRadius: 10, padding: 14,
    borderWidth: 1, borderColor: colors.gold,
  },
  introCalloutIcon: { fontSize: 20, marginRight: 10 },
  introCalloutText: { flex: 1, color: "rgba(255,255,255,0.8)", fontSize: 13, lineHeight: 18 },
  introCalloutBold: { color: "#fff", fontWeight: "800" },

  errorText: { color: colors.danger, textAlign: "center", marginHorizontal: 20, marginBottom: 12, fontSize: 13 },

  // CTA
  ctaBtn: {
    marginHorizontal: 16, backgroundColor: colors.accent, borderRadius: 14,
    paddingVertical: 18, alignItems: "center", marginBottom: 14,
    shadowColor: colors.accent, shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.4, shadowRadius: 12,
  },
  ctaBtnDisabled: { opacity: 0.6 },
  ctaBtnText: { color: "#fff", fontSize: 17, fontWeight: "800" },
  ctaBtnSub: { color: "rgba(255,255,255,0.75)", fontSize: 12, marginTop: 3 },

  // Restore
  restoreBtn: { alignItems: "center", paddingVertical: 12 },
  restoreBtnText: { color: "rgba(255,255,255,0.45)", fontSize: 13, textDecorationLine: "underline" },

  // Legal
  legalText: { color: "rgba(255,255,255,0.3)", fontSize: 11, textAlign: "center", paddingHorizontal: 24, lineHeight: 17, marginTop: 8 },
  legalLink: { color: "rgba(255,255,255,0.5)", textDecorationLine: "underline" },

  // Dismiss
  dismissBtn: { alignItems: "center", paddingVertical: 14, borderTopWidth: 1, borderTopColor: "rgba(255,255,255,0.08)" },
  dismissBtnText: { color: "rgba(255,255,255,0.35)", fontSize: 13 },
});

const statusStyles = StyleSheet.create({
  card: {
    flexDirection: "row", alignItems: "center", backgroundColor: colors.primaryFaint,
    borderRadius: 12, padding: 16, margin: 16, borderWidth: 1, borderColor: colors.accent,
  },
  left: { flex: 1 },
  label: { fontSize: 10, fontWeight: "800", color: colors.primary, letterSpacing: 1.5 },
  plan: { fontSize: 15, fontWeight: "700", color: colors.text, marginTop: 2 },
  expires: { fontSize: 11, color: colors.textSecondary, marginTop: 4 },
  badge: { backgroundColor: colors.accent, borderRadius: 6, paddingHorizontal: 10, paddingVertical: 4 },
  badgeText: { color: "#fff", fontSize: 11, fontWeight: "800" },
});
