import React, { useEffect, useState } from "react";
import {
  View, Text, StyleSheet, FlatList, TouchableOpacity,
  ActivityIndicator, TextInput,
} from "react-native";
import { fetchAllCrops } from "../services/api";
import { colors } from "../theme/colors";

const CATEGORIES = ["All", "Grain", "Vegetable", "Legume", "Root Vegetable", "Leafy Green", "Gourd", "Specialty"];

export default function CropsScreen({ navigation, route }) {
  const zone = route.params?.zone || "6";
  const [crops, setCrops] = useState([]);
  const [filtered, setFiltered] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [activeCategory, setActiveCategory] = useState("All");

  useEffect(() => {
    fetchAllCrops()
      .then((data) => { setCrops(data); setFiltered(data); })
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    let list = crops;
    if (activeCategory !== "All") list = list.filter((c) => c.category === activeCategory);
    if (search.trim()) list = list.filter((c) => c.name.toLowerCase().includes(search.toLowerCase()));
    setFiltered(list);
  }, [search, activeCategory, crops]);

  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Select Your Crops</Text>
        <Text style={styles.headerSub}>Zone {zone} — Tap a crop for planting details</Text>
      </View>

      {/* Search */}
      <View style={styles.searchRow}>
        <TextInput
          style={styles.searchInput}
          placeholder="Search crops..."
          placeholderTextColor={colors.textSecondary}
          value={search}
          onChangeText={setSearch}
        />
      </View>

      {/* Category Filter */}
      <FlatList
        horizontal
        data={CATEGORIES}
        keyExtractor={(c) => c}
        showsHorizontalScrollIndicator={false}
        style={styles.categoryBar}
        renderItem={({ item }) => (
          <TouchableOpacity
            style={[styles.categoryChip, activeCategory === item && styles.categoryChipActive]}
            onPress={() => setActiveCategory(item)}
          >
            <Text style={[styles.categoryText, activeCategory === item && styles.categoryTextActive]}>
              {item}
            </Text>
          </TouchableOpacity>
        )}
      />

      {/* Crop Grid */}
      <FlatList
        data={filtered}
        keyExtractor={(c) => c.id}
        numColumns={2}
        contentContainerStyle={styles.grid}
        renderItem={({ item }) => (
          <TouchableOpacity
            style={styles.cropCard}
            onPress={() => navigation.navigate("CropDetail", { cropId: item.id, zone })}
          >
            <Text style={styles.cropEmoji}>{item.emoji}</Text>
            <Text style={styles.cropName}>{item.name}</Text>
            <View style={styles.cropCategoryBadge}>
              <Text style={styles.cropCategoryText}>{item.category}</Text>
            </View>
          </TouchableOpacity>
        )}
        ListEmptyComponent={
          <View style={styles.centered}>
            <Text style={styles.emptyText}>No crops found</Text>
          </View>
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  centered: { flex: 1, justifyContent: "center", alignItems: "center", paddingTop: 60 },
  header: { backgroundColor: colors.primaryDark, paddingTop: 60, paddingBottom: 20, paddingHorizontal: 20 },
  headerTitle: { color: "#fff", fontSize: 24, fontWeight: "800" },
  headerSub: { color: "rgba(255,255,255,0.75)", fontSize: 13, marginTop: 4 },
  searchRow: { paddingHorizontal: 16, paddingTop: 14, paddingBottom: 4 },
  searchInput: {
    backgroundColor: colors.surface, borderRadius: 12, paddingHorizontal: 16,
    paddingVertical: 10, fontSize: 15, color: colors.text,
    borderWidth: 1, borderColor: colors.border,
  },
  categoryBar: { paddingHorizontal: 12, paddingVertical: 10, flexGrow: 0 },
  categoryChip: {
    paddingHorizontal: 14, paddingVertical: 7, borderRadius: 20, marginHorizontal: 4,
    backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border,
  },
  categoryChipActive: { backgroundColor: colors.primary, borderColor: colors.primary },
  categoryText: { fontSize: 13, color: colors.textSecondary, fontWeight: "600" },
  categoryTextActive: { color: "#fff" },
  grid: { paddingHorizontal: 12, paddingBottom: 20 },
  cropCard: {
    flex: 1, margin: 6, backgroundColor: colors.surface, borderRadius: 16,
    padding: 18, alignItems: "center",
    shadowColor: "#000", shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.07,
    shadowRadius: 6, elevation: 2,
  },
  cropEmoji: { fontSize: 44, marginBottom: 10 },
  cropName: { fontSize: 15, fontWeight: "700", color: colors.text, textAlign: "center", marginBottom: 8 },
  cropCategoryBadge: {
    backgroundColor: colors.background, paddingHorizontal: 10, paddingVertical: 4,
    borderRadius: 10, borderWidth: 1, borderColor: colors.border,
  },
  cropCategoryText: { fontSize: 11, color: colors.textSecondary, fontWeight: "600" },
  emptyText: { color: colors.textSecondary, fontSize: 15 },
});
