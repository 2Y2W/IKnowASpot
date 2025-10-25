import * as SecureStore from "expo-secure-store";
import { API_URL } from "@/lib/api";
import { useEffect, useState, useCallback } from "react";
import {
  View,
  Text,
  Image,
  FlatList,
  ActivityIndicator,
  RefreshControl,
} from "react-native";

export default function ExplorePosts() {
  const [posts, setPosts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const PRIMARY = "#2490ef";

  const loadPosts = useCallback(async () => {
    try {
      const token = await SecureStore.getItemAsync("access_token");
      if (!token) {
        console.warn("No access token found");
        return;
      }

      const res = await fetch(`${API_URL}/posts`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (!res.ok) {
        throw new Error(`Failed to load posts: ${res.status}`);
      }

      const data = await res.json();
      console.log("/posts response:", data);
      setPosts(data);
    } catch (err) {
      console.error("Error fetching /posts:", err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    loadPosts();
  }, [loadPosts]);

  const onRefresh = async () => {
    setRefreshing(true);
    await loadPosts();
  };

  if (loading) {
    return <ActivityIndicator size="large" color={PRIMARY} className="flex-1" />;
  }

  return (
    <View className="flex-1 p-4 bg-background">
      <FlatList
        data={posts}
        keyExtractor={(item) => item.id.toString()}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
        renderItem={({ item }) => (
          <View className="mb-4 rounded-lg bg-card p-2 shadow">
            <Text className="text-lg font-semibold mb-1">{item.title}</Text>
            <Image
              source={{ uri: item.s3_url }}
              className="w-full h-52 mb-2 rounded-lg"
              resizeMode="cover"
            />
            <Text className="text-sm text-gray-600 mb-1">
              {item.description || "No description provided."}
            </Text>
            <Text className="text-xs text-gray-400">
              📍 {item.latitude?.toFixed(4)}, {item.longitude?.toFixed(4)}
            </Text>
          </View>
        )}
      />
    </View>
  );
}
