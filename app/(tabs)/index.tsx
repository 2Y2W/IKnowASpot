import React, { useEffect, useState, useCallback } from "react";
import { View, ActivityIndicator, Text } from "react-native";
import * as Location from "expo-location";
import { SafeAreaView } from "react-native-safe-area-context";
import { StatusBar } from "expo-status-bar";
import * as SecureStore from "expo-secure-store";
import MapView from "../../components/maps/MapView";
import { API_URL } from "@/lib/api";
import "../../global.css";

type MapPost = {
  id: number | string;
  latitude: number;
  longitude: number;
  title: string | null;
  description: string | null;
  s3_url: string | null;
  user_id?: number | string;
  username?: string | null;

  created_at?: string | null; // ✅ NEW

  score: number;
  user_vote: -1 | 0 | 1;
};

export default function MapScreen() {
  const [coords, setCoords] = useState<{
    latitude: number;
    longitude: number;
  } | null>(null);
  const [posts, setPosts] = useState<MapPost[]>([]);
  const [loading, setLoading] = useState(true);

  const loadPosts = useCallback(async () => {
    try {
      const token = await SecureStore.getItemAsync("access_token");
      if (!token) {
        console.warn("No access token found for /posts");
        setPosts([]);
        return;
      }

      const res = await fetch(`${API_URL}/posts`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (!res.ok) {
        const text = await res.text();
        console.error("Error fetching posts:", res.status, text);
        setPosts([]);
        return;
      }

      const data = await res.json();
      const raw = Array.isArray(data.posts) ? data.posts : [];

      const mapped: MapPost[] = raw
        .filter((p: any) => p && typeof p === "object")
        .map((p: any) => {
          const rawUserVote = typeof p.user_vote === "number" ? p.user_vote : 0;
          const normalizedUserVote: -1 | 0 | 1 =
            rawUserVote > 0 ? 1 : rawUserVote < 0 ? -1 : 0;

          return {
            id: p.id?.toString?.() ?? String(p.id),
            latitude: Number(p.latitude),
            longitude: Number(p.longitude),
            title: typeof p.title === "string" ? p.title : null,
            description:
              typeof p.description === "string" ? p.description : null,
            s3_url: typeof p.s3_url === "string" ? p.s3_url : null,
            user_id: p.user_id,
            username: p.username,

            created_at: typeof p.created_at === "string" ? p.created_at : null, // ✅ NEW

            score: typeof p.score === "number" ? p.score : 0,
            user_vote: normalizedUserVote,
          };
        })
        .filter(
          (p) =>
            Number.isFinite(p.latitude) &&
            Number.isFinite(p.longitude) &&
            p.id != null
        );

      setPosts(mapped);
    } catch (err) {
      console.error("Error loading posts for map:", err);
      setPosts([]);
    }
  }, []);

  useEffect(() => {
    (async () => {
      try {
        const { status } = await Location.requestForegroundPermissionsAsync();
        if (status === "granted") {
          const loc = await Location.getCurrentPositionAsync({});
          setCoords({
            latitude: loc.coords.latitude,
            longitude: loc.coords.longitude,
          });
        } else {
          console.warn("Location permission not granted");
        }

        await loadPosts();
      } finally {
        setLoading(false);
      }
    })();
  }, [loadPosts]);

  // 🔼🔽 upvote/downvote from the map
  const toggleVote = useCallback(
    async (postId: number | string, nextVote: -1 | 0 | 1) => {
      const numericId =
        typeof postId === "string" ? Number(postId) : (postId as number);
      if (!Number.isFinite(numericId)) return;

      const token = await SecureStore.getItemAsync("access_token");
      if (!token) return;

      // optimistic update in map state
      setPosts((prev) =>
        prev.map((p) => {
          if (p.id.toString() !== numericId.toString()) return p;
          const oldVote = p.user_vote ?? 0;
          const delta = nextVote - oldVote;
          return {
            ...p,
            user_vote: nextVote,
            score: (p.score ?? 0) + delta,
          };
        })
      );

      try {
        const res = await fetch(`${API_URL}/posts/${numericId}/vote`, {
          method: "POST",
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ value: nextVote }),
        });

        if (!res.ok) {
          const text = await res.text();
          console.error("❌ Vote error (map):", res.status, text);
          loadPosts();
        }
      } catch (err) {
        console.error("❌ Vote request failed (map):", err);
        loadPosts();
      }
    },
    [loadPosts]
  );

  if (loading || !coords) {
    return (
      <SafeAreaView className="flex-1 bg-background items-center justify-center">
        <StatusBar style="light" backgroundColor="#111827" />
        <ActivityIndicator size="large" />
        <Text className="text-white mt-2">Loading map...</Text>
      </SafeAreaView>
    );
  }

  const spots = posts.map((p) => ({
    id: p.id.toString(),
    latitude: p.latitude,
    longitude: p.longitude,
    title: p.title,
    description: p.description,
    image: p.s3_url,
    user_id: p.user_id,
    username: p.username,

    created_at: p.created_at, // ✅ NEW (so MapView can pass it to SpotDetail)

    score: p.score,
    user_vote: p.user_vote,
  }));

  return (
    <View className="flex-1 bg-background">
      <StatusBar style="light" backgroundColor="#111827" />

      <View className="flex-1 bg-background">
        <MapView
          latitude={coords.latitude}
          longitude={coords.longitude}
          zoom={14}
          showsUserLocation
          markers={spots}
          onVote={toggleVote}
        />
      </View>
    </View>
  );
}
