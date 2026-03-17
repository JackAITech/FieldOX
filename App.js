import React, { useState, useEffect } from "react";
import { NavigationContainer } from "@react-navigation/native";
import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import { createStackNavigator } from "@react-navigation/stack";
import { StatusBar } from "expo-status-bar";
import { Text, View, Modal } from "react-native";

import { SubscriptionProvider, useSubscription } from "./src/context/SubscriptionContext";

import HomeScreen from "./src/screens/HomeScreen";
import CropsScreen from "./src/screens/CropsScreen";
import CropDetailScreen from "./src/screens/CropDetailScreen";
import CalendarScreen from "./src/screens/CalendarScreen";
import MoistureScreen from "./src/screens/MoistureScreen";
import SprayingScreen from "./src/screens/SprayingScreen";
import FieldsScreen from "./src/screens/FieldsScreen";
import ReportsScreen from "./src/screens/ReportsScreen";
import SettingsScreen from "./src/screens/SettingsScreen";
import SubscriptionScreen from "./src/screens/SubscriptionScreen";
import { colors } from "./src/theme/colors";

const Tab = createBottomTabNavigator();
const CropsStack = createStackNavigator();

const TAB_CONFIG = {
  Home:     { label: "Dashboard", icon: "⌂" },
  Fields:   { label: "Fields",    icon: "▦" },
  Crops:    { label: "Crops",     icon: "⌾" },
  Moisture: { label: "Moisture",  icon: "◈" },
  Spraying: { label: "Spraying",  icon: "⌬" },
  Reports:  { label: "Reports",   icon: "▤" },
  Settings: { label: "Account",   icon: "◎" },
};

function CropsNavigator({ route }) {
  return (
    <CropsStack.Navigator screenOptions={{ headerShown: false }}>
      <CropsStack.Screen name="CropsList" component={CropsScreen} initialParams={{ zone: route?.params?.zone }} />
      <CropsStack.Screen name="CropDetail" component={CropDetailScreen} />
    </CropsStack.Navigator>
  );
}

// Inner app — has access to SubscriptionContext
function AppNavigator() {
  const { isSubscribed, loading } = useSubscription();
  const [showInitialPaywall, setShowInitialPaywall] = useState(false);

  // Show paywall on first launch if not subscribed (after a short delay so home loads first)
  useEffect(() => {
    if (!loading && !isSubscribed) {
      const timer = setTimeout(() => setShowInitialPaywall(true), 1500);
      return () => clearTimeout(timer);
    }
  }, [loading, isSubscribed]);

  return (
    <>
      <Tab.Navigator
        screenOptions={({ route }) => ({
          headerShown: false,
          tabBarActiveTintColor: colors.accent,
          tabBarInactiveTintColor: colors.textMuted,
          tabBarStyle: {
            backgroundColor: colors.headerBg,
            borderTopColor: "rgba(255,255,255,0.08)",
            paddingBottom: 10,
            paddingTop: 8,
            height: 76,
          },
          tabBarLabel: ({ color }) => (
            <Text style={{ color, fontSize: 9, fontWeight: "700", marginTop: 2, letterSpacing: 0.5 }}>
              {TAB_CONFIG[route.name]?.label ?? route.name}
            </Text>
          ),
          tabBarIcon: ({ color, focused }) => (
            <View style={[
              { width: 32, height: 32, alignItems: "center", justifyContent: "center", borderRadius: 8 },
              focused && { backgroundColor: "rgba(82,183,136,0.15)" },
            ]}>
              <Text style={{ fontSize: 16, color }}>{TAB_CONFIG[route.name]?.icon ?? "•"}</Text>
            </View>
          ),
        })}
      >
        <Tab.Screen name="Home" component={HomeScreen} />
        <Tab.Screen name="Fields" component={FieldsScreen} />
        <Tab.Screen name="Crops" component={CropsNavigator} />
        <Tab.Screen name="Moisture" component={MoistureScreen} />
        <Tab.Screen name="Spraying" component={SprayingScreen} />
        <Tab.Screen name="Reports" component={ReportsScreen} />
        <Tab.Screen name="Settings" component={SettingsScreen} />
      </Tab.Navigator>

      {/* Initial paywall shown on first open for non-subscribers */}
      <Modal visible={showInitialPaywall} animationType="slide">
        <SubscriptionScreen onDismiss={() => setShowInitialPaywall(false)} />
      </Modal>
    </>
  );
}

export default function App() {
  return (
    <SubscriptionProvider>
      <NavigationContainer>
        <StatusBar style="light" />
        <AppNavigator />
      </NavigationContainer>
    </SubscriptionProvider>
  );
}
