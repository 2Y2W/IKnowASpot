import { useEffect, useState, useCallback, useMemo } from "react";
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
import { useRouter } from "expo-router";
import { API_URL } from "@/lib/api";

type Post = {
  id: number;
  title: string | null;
  description: string | null;
  s3_url: string | null;
  latitude?: number | null;
  longitude?: number | null;
  username?: string | null;
  user_id?: number | string;
  score: number; // total score
  user_vote: -1 | 0 | 1; // current user vote
};

export default function ExplorePosts() {
  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();
  const PRIMARY = "#2490ef";

  const parseList = (payload: unknown): Post[] => {
    const arr = Array.isArray(payload)
      ? payload
      : (payload as any)?.posts && Array.isArray((payload as any).posts)
        ? (payload as any).posts
        : [];

    return arr
      .filter((x) => x && typeof x === "object")
      .map((x: any) => {
        const rawUserVote = typeof x.user_vote === "number" ? x.user_vote : 0;
        const normalizedUserVote: -1 | 0 | 1 =
          rawUserVote > 0 ? 1 : rawUserVote < 0 ? -1 : 0;

        return {
          id: Number(x.id),
          title: typeof x.title === "string" ? x.title : "",
          description: typeof x.description === "string" ? x.description : null,
          s3_url: typeof x.s3_url === "string" ? x.s3_url : null,
          latitude: typeof x.latitude === "number" ? x.latitude : null,
          longitude: typeof x.longitude === "number" ? x.longitude : null,
          username: typeof x.username === "string" ? x.username : "",
          user_id: x.user_id != null ? String(x.user_id) : "",
          score: typeof x.score === "number" ? x.score : 0,
          user_vote: normalizedUserVote,
        };
      })
      .filter((p) => Number.isFinite(p.id));
  };

  const loadPosts = useCallback(async () => {
    try {
      setError(null);
      const token = await SecureStore.getItemAsync("access_token");
      if (!token) {
        console.warn("No access token found");
        setPosts([]);
        return;
      }

      const res = await fetch(`${API_URL}/posts`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (!res.ok) {
        throw new Error(`Failed to load posts: ${res.status}`);
      }

      const payload = await res.json();
      console.log("/posts response:", payload);
      setPosts(parseList(payload));
    } catch (e: any) {
      console.error("Error fetching /posts:", e);
      setError(e?.message ?? "Failed to load posts.");
      setPosts([]);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    loadPosts();
  }, [loadPosts]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await loadPosts();
  }, [loadPosts]);

  // upvote/downvote toggle
  const toggleVote = useCallback(
    async (postId: number, nextVote: -1 | 0 | 1) => {
      const token = await SecureStore.getItemAsync("access_token");
      if (!token) return;

      // optimistic update
      setPosts((prev) =>
        prev.map((p) => {
          if (p.id !== postId) return p;
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
        const res = await fetch(`${API_URL}/posts/${postId}/vote`, {
          method: "POST",
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ value: nextVote }), // matches VoteRequest(value: int)
        });

        if (!res.ok) {
          const text = await res.text();
          console.error("❌ Vote error:", res.status, text);
          // re-sync from server on error
          loadPosts();
        }
        // we don't need res.json() here because we already optimistically updated
      } catch (err) {
        console.error("❌ Vote request failed:", err);
        // re-sync from server on network error
        loadPosts();
      }
    },
    [loadPosts]
  );

  const content = useMemo(() => {
    if (loading) {
      return (
        <View className="flex-1 items-center justify-center">
          <ActivityIndicator size="large" color={PRIMARY} />
          <Text className="mt-3 text-gray-500">Loading posts…</Text>
        </View>
      );
    }

    return (
      <FlatList
        data={posts}
        keyExtractor={(item) => String(item?.id ?? Math.random())}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
        contentContainerStyle={
          posts.length === 0 ? { flex: 1, justifyContent: "center" } : undefined
        }
        ListEmptyComponent={
          <View className="items-center px-6">
            {error ? (
              <>
                <Text className="text-base font-semibold text-red-600">
                  Couldn’t load posts
                </Text>
                <Text className="mt-1 text-center text-sm text-gray-600">
                  {error}
                </Text>
                <Text className="mt-3 text-center text-xs text-gray-500">
                  Pull down to retry.
                </Text>
              </>
            ) : (
              <>
                <Text className="text-base font-semibold text-gray-700">
                  No posts yet
                </Text>
                <Text className="mt-1 text-center text-sm text-gray-600">
                  Pull down to refresh or try again later.
                </Text>
              </>
            )}
          </View>
        }
        renderItem={({ item }) => (
          <TouchableOpacity
            activeOpacity={0.85}
            onPress={() => {
              console.log("ITEM: ", item);
              router.push({
                pathname: `/spot/${item.id}`,
                params: {
                  id: item.id,
                  title: item.title,
                  description: item.description,
                  image: item.s3_url,
                  latitude: item.latitude,
                  longitude: item.longitude,
                  username: String(item.username),
                  user_id: String(item.user_id),
                  // 👇 pass vote data to detail screen
                  score: item.score,
                  user_vote: item.user_vote,
                },
              });
            }}
          >
            <View className="mb-4 rounded-lg bg-card p-3 shadow">
              <Text className="text-lg font-semibold mb-1">
                {item.title?.trim() || "Untitled"}
              </Text>

              {item.s3_url ? (
                <Image
                  source={{ uri: item.s3_url }}
                  className="w-full h-52 mb-2 rounded-lg"
                  resizeMode="cover"
                  onError={(e) => {
                    console.warn(
                      "Image failed to load for post",
                      item.id,
                      e.nativeEvent?.error
                    );
                  }}
                />
              ) : (
                <View className="w-full h-52 mb-2 rounded-lg bg-gray-200 items-center justify-center">
                  <Text className="text-gray-500">No image</Text>
                </View>
              )}

              <Text className="text-sm text-gray-700 mb-1">
                {item.description?.trim() || "No description provided."}
              </Text>

              {(Number.isFinite(item.latitude) ||
                Number.isFinite(item.longitude)) && (
                <Text className="text-xs text-gray-500">
                  📍{" "}
                  {Number.isFinite(item.latitude)
                    ? item.latitude!.toFixed(4)
                    : "--"}
                  ,{" "}
                  {Number.isFinite(item.longitude)
                    ? item.longitude!.toFixed(4)
                    : "--"}
                </Text>
              )}

              {item.username && (
                <Text className="mt-1 text-xs text-gray-400">
                  by {item.username}
                </Text>
              )}

              {/* Reddit-style vote row */}
              <View className="mt-3 flex-row items-center">
                <TouchableOpacity
                  activeOpacity={0.7}
                  onPress={() =>
                    toggleVote(item.id, item.user_vote === 1 ? 0 : 1)
                  }
                  className="px-2 py-1"
                >
                  <Text
                    className={`text-2xl font-bold ${
                      item.user_vote === 1 ? "text-orange-500" : "text-gray-400"
                    }`}
                  >
                    ▲
                  </Text>
                </TouchableOpacity>

                <Text className="mx-2 min-w-[32px] text-center text-base font-semibold text-gray-800">
                  {item.score ?? 0}
                </Text>

                <TouchableOpacity
                  activeOpacity={0.7}
                  onPress={() =>
                    toggleVote(item.id, item.user_vote === -1 ? 0 : -1)
                  }
                  className="px-2 py-1"
                >
                  <Text
                    className={`text-2xl font-bold ${
                      item.user_vote === -1 ? "text-blue-500" : "text-gray-400"
                    }`}
                  >
                    ▼
                  </Text>
                </TouchableOpacity>
              </View>
            </View>
          </TouchableOpacity>
        )}
      />
    );
  }, [loading, posts, refreshing, onRefresh, error, toggleVote]);

  return <View className="flex-1 p-4 bg-background">{content}</View>;
}
