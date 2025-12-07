import { useEffect, useState, useCallback } from "react";
import {
  View,
  Text,
  Image,
  FlatList,
  ActivityIndicator,
  RefreshControl,
  TouchableOpacity,
} from "react-native";
import * as SecureStore from "expo-secure-store";
import { API_URL } from "@/lib/api";
import { useRouter, useFocusEffect } from "expo-router";
import "../../global.css";

export default function ProfileScreen() {
  const router = useRouter();

  const [user, setUser] = useState<any>(null);
  const [savedPosts, setSavedPosts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [activeTab, setActiveTab] = useState<"posts" | "saved">("posts");

  const PRIMARY = "#2490ef";

  // ✅ Load user data from /me
  const loadUser = useCallback(async () => {
    try {
      const token = await SecureStore.getItemAsync("access_token");
      if (!token) return;

      const res = await fetch(`${API_URL}/me`, {
        headers: { Authorization: `Bearer ${token}` },
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

  // ✅ Load saved posts from /me/saved
  const loadSaved = useCallback(async () => {
    try {
      const token = await SecureStore.getItemAsync("access_token");
      if (!token) return;

      const res = await fetch(`${API_URL}/me/saved`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (!res.ok) {
        console.error("❌ Failed to load saved posts:", res.status);
        return;
      }

      const data = await res.json();
      console.log("💾 Saved posts response:", data);

      // ✅ Access correct array
      setSavedPosts(Array.isArray(data.saved_posts) ? data.saved_posts : []);
    } catch (err) {
      console.error("❌ Error fetching saved posts:", err);
    }
  }, []);

  // ✅ Initial load
  useEffect(() => {
    const init = async () => {
      await Promise.all([loadUser(), loadSaved()]);
    };
    init();
  }, [loadUser, loadSaved]);

  // ✅ Re-fetch saved posts whenever returning to this screen
  useFocusEffect(
    useCallback(() => {
      loadSaved();
    }, [loadSaved]),
  );

  // ✅ Pull-to-refresh
  const onRefresh = async () => {
    setRefreshing(true);
    if (activeTab === "posts") {
      await loadUser();
    } else {
      await loadSaved();
    }
  };

  // ✅ Render Loading
  if (loading && !user) {
    return (
      <View className="flex-1 justify-center items-center bg-background">
        <ActivityIndicator size="large" color={PRIMARY} />
      </View>
    );
  }

  if (!user) {
    return (
      <View className="flex-1 justify-center items-center bg-background">
        <Text className="text-black">No user loaded</Text>
      </View>
    );
  }

  const currentData = activeTab === "posts" ? (user.posts ?? []) : savedPosts;

  return (
    <View className="flex-1 bg-background">
      {/* Header */}
      <View className="p-4 border-b border-card">
        <Text className="text-xl font-bold mb-1 text-black">
          {user.username} ({user.email})
        </Text>

        {/* Tab Switcher */}
        <View className="flex-row mt-3 bg-card rounded-lg overflow-hidden">
          <TouchableOpacity
            className={`flex-1 py-2 ${
              activeTab === "posts" ? "bg-primary" : "bg-card"
            }`}
            onPress={() => setActiveTab("posts")}
          >
            <Text
              className={`text-center font-semibold ${
                activeTab === "posts" ? "text-white" : "text-black"
              }`}
            >
              Your Posts
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            className={`flex-1 py-2 ${
              activeTab === "saved" ? "bg-primary" : "bg-card"
            }`}
            onPress={() => setActiveTab("saved")}
          >
            <Text
              className={`text-center font-semibold ${
                activeTab === "saved" ? "text-white" : "text-black"
              }`}
            >
              Saved Posts
            </Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* List */}
      {loading ? (
        <ActivityIndicator size="large" color={PRIMARY} className="mt-10" />
      ) : currentData.length === 0 ? (
        <Text className="text-center mt-10 text-gray-400">
          No {activeTab === "posts" ? "posts" : "saved posts"} yet.
        </Text>
      ) : (
        <FlatList
          data={currentData}
          keyExtractor={(item) =>
            item.id?.toString() ?? Math.random().toString()
          }
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
          }
          renderItem={({ item }) => {
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
              <TouchableOpacity
                onPress={() =>
                  router.push({
                    pathname: `/spot/${item.id}`,
                    params: {
                      id: item.id,
                      title: item.title,
                      description: item.description,
                      image: item.s3_url,
                      latitude: item.latitude,
                      longitude: item.longitude,
                      user_id: String(item.user_id),
                      username: String(item.username),
                    },
                  })
                }
                activeOpacity={0.85}
              >
                <View className="m-4 mb-2 rounded-lg bg-card p-2 shadow">
                  <Text className="text-lg font-semibold mb-1 text-black">
                    {title}
                  </Text>

                  <Image
                    source={{ uri: item.s3_url }}
                    className="w-full h-52 mb-2 rounded-lg"
                    resizeMode="cover"
                  />

                  <Text className="text-sm text-gray-600 mb-1">
                    {description}
                  </Text>
                  <Text className="text-xs text-gray-400">
                    📍 {latitude}, {longitude}
                  </Text>
                </View>
              </TouchableOpacity>
            );
          }}
        />
      )}
    </View>
  );
}
