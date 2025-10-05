import { useEffect, useState, useCallback } from "react";
import {
  View,
  Text,
  Image,
  FlatList,
  ActivityIndicator,
  RefreshControl,
} from "react-native";
import * as SecureStore from "expo-secure-store";
import { API_URL } from "@/lib/api";

export default function ProfileScreen() {
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const PRIMARY = "#2490ef";

  // ✅ Load user data from /me
  const loadUser = useCallback(async () => {
    try {
      const token = await SecureStore.getItemAsync("access_token");
      if (!token) return;

      const res = await fetch(`${API_URL}/me`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (!res.ok) throw new Error(`Failed to load profile: ${res.status}`);
      const data = await res.json();

      console.log("👤 /me response:", data);
      setUser(data);
    } catch (err) {
      console.error("❌ Error fetching /me:", err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  // ✅ Initial load
  useEffect(() => {
    loadUser();
  }, [loadUser]);

  // ✅ Pull-to-refresh handler
  const onRefresh = async () => {
    setRefreshing(true);
    await loadUser();
  };

  if (loading && !user) {
    return (
      <ActivityIndicator size="large" color={PRIMARY} className="flex-1" />
    );
  }

  if (!user) {
    return <Text className="p-4">No user loaded</Text>;
  }

  return (
    <View className="flex-1 p-4 bg-background">
      <Text className="text-xl font-bold mb-3">
        {user.username} ({user.email})
      </Text>

      <FlatList
        data={user.posts}
        keyExtractor={(item) => item.id.toString()}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
        renderItem={({ item }) => {
          // ✅ Provide defaults for old posts
          const title = item.title || "Untitled Spot";
          const description = item.description || "No description provided.";
          const latitude =
            typeof item.latitude === "number"
              ? item.latitude.toFixed(4)
              : "N/A";
          const longitude =
            typeof item.longitude === "number"
              ? item.longitude.toFixed(4)
              : "N/A";

          return (
            <View className="mb-4 rounded-lg bg-card p-2 shadow">
              {/* Title */}
              <Text className="text-lg font-semibold mb-1">{title}</Text>

              {/* Image */}
              <Image
                source={{ uri: item.s3_url }}
                className="w-full h-52 mb-2 rounded-lg"
                resizeMode="cover"
              />

              {/* Description */}
              <Text className="text-sm text-gray-600 mb-1">{description}</Text>

              {/* Location */}
              <Text className="text-xs text-gray-400">
                📍 {latitude}, {longitude}
              </Text>
            </View>
          );
        }}
      />
    </View>
  );
}
