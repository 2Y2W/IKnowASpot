import { useEffect, useState, useCallback, useMemo } from "react";
import {
  View,
  Text,
  Image,
  FlatList,
  ActivityIndicator,
  RefreshControl,
  TouchableOpacity,
  Modal,
  Pressable,
} from "react-native";
import * as SecureStore from "expo-secure-store";
import { useRouter } from "expo-router";
import { API_URL } from "@/lib/api";
import { TAGS, Tag, TAG_COLORS } from "@/lib/tags";

type Post = {
  id: number;
  title: string | null;
  description: string | null;
  s3_url: string | null;
  latitude?: number | null;
  longitude?: number | null;
  username?: string | null;
  user_id?: number | string;
  created_at: string;
  score: number; // total score
  user_vote: -1 | 0 | 1; // current user vote
  tags?: string[];
};

type SortMode = "recent" | "top";

export default function ExplorePosts() {
  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedTags, setSelectedTags] = useState<Tag[]>([]);

  const [sortMode, setSortMode] = useState<SortMode>("recent");
  const [sortOpen, setSortOpen] = useState(false);

  const router = useRouter();
  const PRIMARY = "#2490ef";

  const sortLabel = sortMode === "recent" ? "New" : "Top";
  const toggleTag = (tag: Tag) => {
    setSelectedTags((prev) =>
      prev.includes(tag) ? prev.filter((t) => t !== tag) : [...prev, tag],
    );
  };

  const clearTags = () => setSelectedTags([]);

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
          created_at: typeof x.created_at === "string" ? x.created_at : "",
          score: typeof x.score === "number" ? x.score : 0,
          user_vote: normalizedUserVote,
          tags: Array.isArray(x.tags) ? x.tags : [],
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

  const sortedPosts = useMemo(() => {
    // 1️⃣ Filter by selected tags (ANY match)
    const filteredPosts =
      selectedTags.length === 0
        ? posts
        : posts.filter((p) =>
            p.tags?.some((tag) => selectedTags.includes(tag as Tag)),
          );

    // 2️⃣ Sort filtered posts
    const copy = [...filteredPosts];

    // robust time parser (unchanged from your code)
    const safeTime = (s: string) => {
      if (!s) return 0;

      let cleaned = String(s).trim();

      if (!cleaned.includes("T") && cleaned.includes(" ")) {
        cleaned = cleaned.replace(" ", "T");
      }

      cleaned = cleaned.replace(/\.(\d{3})\d+/, ".$1");

      const hasTZ = /Z$|[+-]\d{2}:\d{2}$/.test(cleaned);
      if (!hasTZ) cleaned += "Z";

      const t = Date.parse(cleaned);
      return Number.isFinite(t) ? t : 0;
    };

    if (sortMode === "recent") {
      copy.sort((a, b) => safeTime(b.created_at) - safeTime(a.created_at));
      return copy;
    }

    // top
    copy.sort((a, b) => {
      if ((b.score ?? 0) !== (a.score ?? 0))
        return (b.score ?? 0) - (a.score ?? 0);
      return safeTime(b.created_at) - safeTime(a.created_at);
    });

    return copy;
  }, [posts, sortMode, selectedTags]);

  const setSortAndClose = useCallback((mode: SortMode) => {
    setSortMode(mode);
    setSortOpen(false);
  }, []);

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
        }),
      );

      try {
        const res = await fetch(`${API_URL}/posts/${postId}/vote`, {
          method: "POST",
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ value: nextVote }),
        });

        if (!res.ok) {
          const text = await res.text();
          console.error("❌ Vote error:", res.status, text);
          loadPosts();
        }
      } catch (err) {
        console.error("❌ Vote request failed:", err);
        loadPosts();
      }
    },
    [loadPosts],
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
      <>
        {/* Sort dropdown modal */}
        <Modal
          visible={sortOpen}
          transparent
          animationType="fade"
          onRequestClose={() => setSortOpen(false)}
        >
          <Pressable
            className="flex-1 bg-black/50"
            onPress={() => setSortOpen(false)}
          >
            <Pressable
              onPress={(e) => e.stopPropagation()}
              className="mx-4 mt-24 rounded-xl bg-card p-2"
            >
              <Text className="px-2 py-2 text-xs uppercase text-gray-400">
                Sort
              </Text>

              <TouchableOpacity
                activeOpacity={0.85}
                onPress={() => setSortAndClose("recent")}
                className={`rounded-lg px-3 py-3 ${
                  sortMode === "recent" ? "bg-zinc-800" : "bg-transparent"
                }`}
              >
                <Text
                  className={`text-base font-semibold ${
                    sortMode === "recent" ? "text-primary" : "text-black"
                  }`}
                >
                  New
                </Text>
                <Text className="mt-0.5 text-xs text-gray-400">
                  Most recent posts first
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                activeOpacity={0.85}
                onPress={() => setSortAndClose("top")}
                className={`mt-1 rounded-lg px-3 py-3 ${
                  sortMode === "top" ? "bg-zinc-800" : "bg-transparent"
                }`}
              >
                <Text
                  className={`text-base font-semibold ${
                    sortMode === "top" ? "text-primary" : "text-black"
                  }`}
                >
                  Top
                </Text>
                <Text className="mt-0.5 text-xs text-gray-400">
                  Highest score first
                </Text>
              </TouchableOpacity>
              {/* 🔖 TAG FILTERS */}
              <Text className="px-2 py-2 mt-3 text-xs uppercase text-gray-400">
                Filter by tags
              </Text>

              <View className="flex-row flex-wrap gap-2 px-2 pb-2">
                {TAGS.map((tag) => {
                  const active = selectedTags.includes(tag);
                  return (
                    <TouchableOpacity
                      key={tag}
                      onPress={() => toggleTag(tag)}
                      className="px-3 py-1.5 rounded-full"
                      style={{
                        backgroundColor: active ? TAG_COLORS[tag] : "#E5E7EB",
                      }}
                    >
                      <Text
                        className="text-xs font-semibold"
                        style={{ color: active ? "white" : "#374151" }}
                      >
                        {tag}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>

              {selectedTags.length > 0 && (
                <TouchableOpacity
                  onPress={() => setSelectedTags([])}
                  className="mx-2 mt-2 rounded-lg bg-gray-200 px-3 py-2"
                >
                  <Text className="text-center text-sm font-semibold text-gray-700">
                    Clear tag filters
                  </Text>
                </TouchableOpacity>
              )}
            </Pressable>
          </Pressable>
        </Modal>

        <FlatList
          data={sortedPosts}
          keyExtractor={(item) => String(item?.id ?? Math.random())}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
          }
          contentContainerStyle={
            sortedPosts.length === 0
              ? { flex: 1, justifyContent: "center" }
              : undefined
          }
          ListHeaderComponent={
            <View className="mb-3 flex-row items-center justify-end">
              <TouchableOpacity
                activeOpacity={0.85}
                onPress={() => setSortOpen(true)}
                className="flex-row items-center rounded-xl bg-card px-3 py-2"
              >
                <Text className="text-sm text-black mr-2">Sort:</Text>
                <Text className="text-sm font-semibold text-primary">
                  {sortLabel}
                </Text>
                <Text className="ml-2 text-gray-400">▾</Text>
              </TouchableOpacity>
            </View>
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
                // console.log("ITEM: ", item);
                console.log("ITEM TAGS:", item.tags);

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
                    created_at: item.created_at,
                    score: item.score,
                    user_vote: item.user_vote,
                    tags: JSON.stringify(item.tags ?? []),
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
                        e.nativeEvent?.error,
                      );
                    }}
                  />
                ) : (
                  <View className="w-full h-52 mb-2 rounded-lg bg-gray-200 items-center justify-center">
                    <Text className="text-gray-500">No image</Text>
                  </View>
                )}
                {item.tags && item.tags.length > 0 && (
                  <View className="flex-row flex-wrap gap-2 mb-2">
                    {item.tags.map((tag) => (
                      <View
                        key={tag}
                        className="px-2 py-1 rounded-full"
                        style={{
                          backgroundColor:
                            TAG_COLORS[tag as keyof typeof TAG_COLORS] ??
                            "#E5E7EB",
                        }}
                      >
                        <Text className="text-xs font-semibold text-white">
                          {tag}
                        </Text>
                      </View>
                    ))}
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
                        item.user_vote === 1
                          ? "text-orange-500"
                          : "text-gray-400"
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
                        item.user_vote === -1
                          ? "text-blue-500"
                          : "text-gray-400"
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
      </>
    );
  }, [
    loading,
    sortedPosts,
    refreshing,
    onRefresh,
    error,
    toggleVote,
    sortOpen,
    sortMode,
    sortLabel,
    setSortAndClose,
  ]);

  return <View className="flex-1 p-4 bg-background">{content}</View>;
}
