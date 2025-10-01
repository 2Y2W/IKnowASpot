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

      console.log("👤 /me response:", data); // log full response
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
    return <ActivityIndicator size="large" color="blue" style={{ flex: 1 }} />;
  }

  if (!user) {
    return <Text style={{ padding: 16 }}>No user loaded</Text>;
  }

  return (
    <View style={{ flex: 1, padding: 16 }}>
      <Text style={{ fontSize: 20, fontWeight: "bold", marginBottom: 12 }}>
        {user.username} ({user.email})
      </Text>

      <FlatList
        data={user.posts}
        keyExtractor={(item) => item.id.toString()}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
        renderItem={({ item }) => {
          console.log("🖼️ Rendering post with URL:", item.s3_url);
          return (
            <Image
              source={{ uri: item.s3_url }}
              style={{
                width: "100%",
                height: 200,
                marginVertical: 8,
                borderRadius: 8,
              }}
              resizeMode="cover"
            />
          );
        }}
      />
    </View>
  );
}
