import React, { createContext, useContext, useEffect, useState } from "react";
import Purchases, { LOG_LEVEL } from "react-native-purchases";
import { Platform } from "react-native";

// ── RevenueCat product identifiers ──────────────────────────────────────────
// These must match exactly what you create in App Store Connect / Google Play Console
export const PRODUCT_IDS = {
  monthly:  Platform.OS === "ios" ? "fieldox_monthly" : "fieldox_monthly:monthly-plan",
  annual:   Platform.OS === "ios" ? "fieldox_annual"  : "fieldox_annual:annual-plan",
};

// Set your RevenueCat API keys here after creating an account at rev.cat
// iOS key from: RevenueCat Dashboard → Project → Apps → Apple
// Android key from: RevenueCat Dashboard → Project → Apps → Google
const RC_API_KEYS = {
  ios:     "appl_YOUR_REVENUECAT_IOS_KEY",
  android: "goog_YOUR_REVENUECAT_ANDROID_KEY",
};

const SubscriptionContext = createContext(null);

export function SubscriptionProvider({ children }) {
  const [isSubscribed, setIsSubscribed]   = useState(false);
  const [isTrialing, setIsTrialing]       = useState(false);
  const [activePlan, setActivePlan]       = useState(null);   // "monthly" | "annual" | null
  const [expiresAt, setExpiresAt]         = useState(null);
  const [offerings, setOfferings]         = useState(null);
  const [loading, setLoading]             = useState(true);
  const [purchasing, setPurchasing]       = useState(false);
  const [error, setError]                 = useState(null);

  // ── Initialize RevenueCat ──────────────────────────────────────────────────
  useEffect(() => {
    async function init() {
      try {
        Purchases.setLogLevel(LOG_LEVEL.ERROR);

        const apiKey = Platform.OS === "ios" ? RC_API_KEYS.ios : RC_API_KEYS.android;
        await Purchases.configure({ apiKey });

        await refreshSubscriptionStatus();
        await loadOfferings();
      } catch (e) {
        console.warn("RevenueCat init error:", e?.message);
        // In development/Expo Go, IAP is unavailable — allow free access for testing
        setIsSubscribed(__DEV__);
      } finally {
        setLoading(false);
      }
    }
    init();
  }, []);

  async function refreshSubscriptionStatus() {
    const info = await Purchases.getCustomerInfo();
    applyCustomerInfo(info);
  }

  function applyCustomerInfo(info) {
    const entitlement = info.entitlements.active["pro_access"];
    if (entitlement) {
      setIsSubscribed(true);
      setIsTrialing(entitlement.periodType === "TRIAL");
      setExpiresAt(entitlement.expirationDate);
      // Determine plan from product identifier
      const pid = entitlement.productIdentifier || "";
      setActivePlan(pid.includes("annual") ? "annual" : "monthly");
    } else {
      setIsSubscribed(false);
      setIsTrialing(false);
      setActivePlan(null);
      setExpiresAt(null);
    }
  }

  async function loadOfferings() {
    try {
      const o = await Purchases.getOfferings();
      setOfferings(o.current);
    } catch (e) {
      console.warn("Failed to load offerings:", e?.message);
    }
  }

  // ── Purchase ───────────────────────────────────────────────────────────────
  async function purchase(packageToBuy) {
    setPurchasing(true);
    setError(null);
    try {
      const { customerInfo } = await Purchases.purchasePackage(packageToBuy);
      applyCustomerInfo(customerInfo);
      return { success: true };
    } catch (e) {
      if (!e.userCancelled) {
        setError(e.message || "Purchase failed. Please try again.");
        return { success: false, error: e.message };
      }
      return { success: false, cancelled: true };
    } finally {
      setPurchasing(false);
    }
  }

  // ── Restore ────────────────────────────────────────────────────────────────
  async function restore() {
    setPurchasing(true);
    setError(null);
    try {
      const info = await Purchases.restorePurchases();
      applyCustomerInfo(info);
      const active = Object.keys(info.entitlements.active).length > 0;
      return { success: active, restored: active };
    } catch (e) {
      setError(e.message || "Restore failed.");
      return { success: false };
    } finally {
      setPurchasing(false);
    }
  }

  return (
    <SubscriptionContext.Provider value={{
      isSubscribed, isTrialing, activePlan, expiresAt,
      offerings, loading, purchasing, error,
      purchase, restore, refreshSubscriptionStatus,
    }}>
      {children}
    </SubscriptionContext.Provider>
  );
}

export function useSubscription() {
  const ctx = useContext(SubscriptionContext);
  if (!ctx) throw new Error("useSubscription must be used inside SubscriptionProvider");
  return ctx;
}
