import React, { useState } from "react";
import { View, Text, StyleSheet, TouchableOpacity, Modal } from "react-native";
import { useSubscription } from "../context/SubscriptionContext";
import SubscriptionScreen from "../screens/SubscriptionScreen";
import { colors } from "../theme/colors";

/**
 * Wrap any screen or feature with <PaywallGate> to restrict it to subscribers.
 *
 * Usage:
 *   <PaywallGate feature="Compliance Records">
 *     <ComplianceContent />
 *   </PaywallGate>
 */
export default function PaywallGate({ children, feature = "this feature" }) {
  const { isSubscribed, loading } = useSubscription();
  const [showPaywall, setShowPaywall] = useState(false);

  if (loading) return null;

  if (isSubscribed) return children;

  return (
    <>
      {/* Locked state */}
      <View style={styles.lockedContainer}>
        <View style={styles.lockCard}>
          <Text style={styles.lockIcon}>🔒</Text>
          <Text style={styles.lockTitle}>Pro Feature</Text>
          <Text style={styles.lockDesc}>
            {feature} is included with FieldOX.
          </Text>
          <View style={styles.pricingHint}>
            <Text style={styles.pricingLine}>
              <Text style={styles.pricingBold}>7-day free trial</Text> — no charge today
            </Text>
            <Text style={styles.pricingLineSub}>then $9.99/mo · or $79/year</Text>
          </View>
          <TouchableOpacity style={styles.unlockBtn} onPress={() => setShowPaywall(true)}>
            <Text style={styles.unlockBtnText}>View Plans</Text>
          </TouchableOpacity>
        </View>
      </View>

      <Modal visible={showPaywall} animationType="slide">
        <SubscriptionScreen onDismiss={() => setShowPaywall(false)} />
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  lockedContainer: { flex: 1, backgroundColor: colors.background, justifyContent: "center", alignItems: "center", padding: 24 },
  lockCard: {
    backgroundColor: colors.surface, borderRadius: 20, padding: 28, alignItems: "center",
    width: "100%", borderWidth: 1, borderColor: colors.border,
    shadowColor: colors.shadow, shadowOffset: { width: 0, height: 4 }, shadowOpacity: 1, shadowRadius: 16, elevation: 6,
  },
  lockIcon: { fontSize: 40, marginBottom: 16 },
  lockTitle: { fontSize: 20, fontWeight: "800", color: colors.text, marginBottom: 8 },
  lockDesc: { fontSize: 14, color: colors.textSecondary, textAlign: "center", lineHeight: 20, marginBottom: 20 },
  pricingHint: {
    backgroundColor: colors.primaryFaint, borderRadius: 10, padding: 14, width: "100%",
    alignItems: "center", marginBottom: 20, borderWidth: 1, borderColor: colors.accentAlt,
  },
  pricingLine: { fontSize: 15, color: colors.text, fontWeight: "600" },
  pricingBold: { color: colors.primary, fontWeight: "900", fontSize: 17 },
  pricingLineSub: { fontSize: 12, color: colors.textSecondary, marginTop: 3 },
  unlockBtn: {
    backgroundColor: colors.primary, borderRadius: 12,
    paddingHorizontal: 36, paddingVertical: 14, width: "100%", alignItems: "center",
  },
  unlockBtnText: { color: "#fff", fontSize: 15, fontWeight: "700" },
});
