import React, { useEffect, useState, useCallback } from "react";
import { useRouter, useLocalSearchParams } from "expo-router";
import {
  View,
  Text,
  Image,
  TouchableOpacity,
  Linking,
  ActivityIndicator,
  Alert,
  ScrollView,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import MapView, { Marker } from "react-native-maps";
import * as Location from "expo-location";
import { Feather, FontAwesome } from "@expo/vector-icons";
import * as SecureStore from "expo-secure-store";
import { API_URL } from "@/lib/api";
import "../../global.css";
import { TAG_COLORS } from "@/lib/tags";

export default function SpotDetail() {
  const router = useRouter();
  const {
    id,
    title,
    description,
    image,
    latitude,
    longitude,
    username,
    user_id,
    created_at,
    score: paramScore,
    user_vote: paramUserVote,
    tags,
  } = useLocalSearchParams();

  const params = useLocalSearchParams();
  console.log("RAW PARAMS:", params);

  const [userCoords, setUserCoords] = useState<{
    latitude: number;
    longitude: number;
  } | null>(null);
  const [distance, setDistance] = useState<number | null>(null);
  const [saved, setSaved] = useState(false);
  const [loadingSave, setLoadingSave] = useState(false);
  const [checkingSaved, setCheckingSaved] = useState(true);
  const [alreadyFriend, setAlreadyFriend] = useState(false);
  const [loadingFriendState, setLoadingFriendState] = useState(true);
  const [currentUser, setCurrentUser] = useState<any>(null);

  // 🔼🔽 voting state
  const [score, setScore] = useState<number>(0);
  const [userVote, setUserVote] = useState<-1 | 0 | 1>(0);

  const parsedTags: string[] = (() => {
    try {
      if (typeof tags === "string") {
        return JSON.parse(tags);
      }
    } catch (e) {
      console.warn("Failed to parse tags:", tags);
    }
    return [];
  })();

  console.log("PARSED TAGS: ", parsedTags);

  const numericPostId = Number(id);
  const isOwnPost = Number(user_id) === Number(currentUser?.id);
  console.log("Post owner user_id =", Number(user_id));
  console.log("Current user id =", Number(currentUser?.id));
  console.log("isOwnPost =", Number(user_id) === Number(currentUser?.id));

  // Seed score/userVote from params if provided
  useEffect(() => {
    const initialScore = Number(paramScore);
    if (!Number.isNaN(initialScore)) {
      setScore(initialScore);
    }
    const initialUserVoteNum = Number(paramUserVote);
    if ([-1, 0, 1].includes(initialUserVoteNum)) {
      setUserVote(initialUserVoteNum as -1 | 0 | 1);
    }
  }, [paramScore, paramUserVote]);

  const deletePost = async () => {
    Alert.alert("Delete spot?", "This cannot be undone.", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Delete",
        style: "destructive",
        onPress: async () => {
          try {
            const token = await SecureStore.getItemAsync("access_token");
            if (!token) {
              Alert.alert("Error", "No access token");
              return;
            }

            const res = await fetch(`${API_URL}/posts/${numericPostId}`, {
              method: "DELETE",
              headers: { Authorization: `Bearer ${token}` },
            });

            const data = await res.json().catch(() => ({}));

            if (!res.ok) {
              Alert.alert("Error", data?.detail || "Failed to delete post");
              return;
            }

            Alert.alert("Deleted", "Spot removed.");
            router.back();
          } catch (err) {
            console.error("Delete error:", err);
            Alert.alert("Error", "Failed to delete post");
          }
        },
      },
    ]);
  };

  // 🧭 Get user location
  useEffect(() => {
    (async () => {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status === "granted") {
        const loc = await Location.getCurrentPositionAsync({});
        setUserCoords({
          latitude: loc.coords.latitude,
          longitude: loc.coords.longitude,
        });
      }
    })();
  }, []);

  // 📏 Estimate distance in miles
  useEffect(() => {
    if (userCoords && latitude && longitude) {
      const toRad = (v: number) => (v * Math.PI) / 180;
      const R = 3958.8;
      const dLat = toRad(Number(latitude) - userCoords.latitude);
      const dLon = toRad(Number(longitude) - userCoords.longitude);
      const a =
        Math.sin(dLat / 2) ** 2 +
        Math.cos(toRad(userCoords.latitude)) *
          Math.cos(toRad(Number(latitude))) *
          Math.sin(dLon / 2) ** 2;
      const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
      setDistance(R * c);
    }
  }, [userCoords, latitude, longitude]);

  // 🔍 Check if post is already saved when screen loads
  useEffect(() => {
    (async () => {
      try {
        const token = await SecureStore.getItemAsync("access_token");
        if (!token) return;

        const res = await fetch(`${API_URL}/me/saved`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (!res.ok) throw new Error("Failed to check saved posts");

        const data = await res.json();
        const savedPosts = data.saved_posts || [];

        //  If this post ID is in the saved list, set as saved
        const isSaved = savedPosts.some((p: any) => p.id === Number(id));
        setSaved(isSaved);
      } catch (err) {
        console.error("❌ Error checking saved state:", err);
      } finally {
        setCheckingSaved(false);
      }
    })();
  }, [id]);

  // 👥 Check friend state
  useEffect(() => {
    (async () => {
      try {
        const token = await SecureStore.getItemAsync("access_token");
        if (!token) return;

        const res = await fetch(`${API_URL}/me/friends`, {
          headers: { Authorization: `Bearer ${token}` },
        });

        const data = await res.json();
        const friendIds = data.friends.map((f: any) => Number(f.id));

        if (friendIds.includes(Number(user_id))) {
          setAlreadyFriend(true);
        }
      } catch (err) {
        console.error("friend check error:", err);
      } finally {
        setLoadingFriendState(false);
      }
    })();
  }, [user_id]);

  // 👤 Current user
  useEffect(() => {
    (async () => {
      try {
        const token = await SecureStore.getItemAsync("access_token");
        if (!token) return;

        const res = await fetch(`${API_URL}/me`, {
          headers: { Authorization: `Bearer ${token}` },
        });

        if (res.ok) {
          const data = await res.json();
          setCurrentUser(data);
        }
      } catch (err) {
        console.error("Error loading current user:", err);
      }
    })();
  }, []);

  // 💾 Toggle Save / Unsave
  const toggleSave = async () => {
    if (loadingSave) return;
    setLoadingSave(true);
    try {
      const token = await SecureStore.getItemAsync("access_token");
      if (!token) throw new Error("No token");

      const res = await fetch(`${API_URL}/posts/${id}/save`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
      });

      const data = await res.json();
      if (res.ok) {
        setSaved(data.message === "Post saved");
      } else {
        console.error("Error saving:", data);
      }
    } catch (err) {
      console.error("❌ Save error:", err);
    } finally {
      setLoadingSave(false);
    }
  };

  // 🔼🔽 Toggle vote (same logic as list screen)
  const toggleVote = useCallback(
    async (nextVote: -1 | 0 | 1) => {
      if (!numericPostId || Number.isNaN(numericPostId)) return;

      const token = await SecureStore.getItemAsync("access_token");
      if (!token) return;

      // optimistic update
      setScore((prevScore) => prevScore + (nextVote - userVote));
      const prevUserVote = userVote;
      setUserVote(nextVote);

      try {
        const res = await fetch(`${API_URL}/posts/${numericPostId}/vote`, {
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
          // rollback if server rejects
          setUserVote(prevUserVote);
          setScore((prevScore) => prevScore - (nextVote - prevUserVote));
        }
        // do NOT call res.json() to avoid JSON parse error on empty body
      } catch (err) {
        console.error("❌ Vote request failed:", err);
        // rollback on network error
        setUserVote(prevUserVote);
        setScore((prevScore) => prevScore - (nextVote - prevUserVote));
      }
    },
    [numericPostId, userVote],
  );

  // 🚗 Open in Apple Maps
  const openMaps = () => {
    if (!latitude || !longitude) return;
    const base = "http://maps.apple.com/?";
    if (userCoords) {
      Linking.openURL(
        `${base}saddr=${userCoords.latitude},${userCoords.longitude}&daddr=${latitude},${longitude}&dirflg=d`,
      );
    } else {
      Linking.openURL(`${base}daddr=${latitude},${longitude}&dirflg=d`);
    }
  };

  async function addFriend() {
    try {
      const token = await SecureStore.getItemAsync("access_token");

      const res = await fetch(`${API_URL}/friends/add/${user_id}`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
      });

      const data = await res.json();

      // ❗ Handle backend errors correctly
      if (!res.ok) {
        Alert.alert("Error", data.detail?.message || "Something went wrong");
        return;
      }

      // ❗ If backend says “Already friends”
      if (data.status === "exists") {
        setAlreadyFriend(true);
        Alert.alert("Info", "Already friends");
        return;
      }

      // 🎉 Successfully added friend
      setAlreadyFriend(true);
      Alert.alert("Success", data.message);
    } catch (err) {
      console.error(err);
      Alert.alert("Error", "Could not add friend");
    }
  }

  return (
    <SafeAreaView className="flex-1 bg-background">
      <ScrollView contentContainerStyle={{ paddingBottom: 60 }}>
        {/* 🧭 Back Button */}
        <TouchableOpacity
          onPress={() => router.back()}
          className="absolute top-3 left-3 z-50 bg-white/80 mt-12 rounded-full p-2 shadow"
        >
          <Feather name="arrow-left" size={22} color="#000" />
        </TouchableOpacity>

        {/* 💾 Save Button */}
        <TouchableOpacity
          onPress={toggleSave}
          className="absolute top-3 right-3 z-50 bg-white/80 mt-12 rounded-full p-2 shadow"
          disabled={loadingSave || checkingSaved}
        >
          {saved ? (
            <FontAwesome
              name="bookmark"
              size={24}
              color="#2490ef"
              style={{ opacity: loadingSave ? 0.6 : 1 }}
            />
          ) : (
            <FontAwesome
              name="bookmark-o"
              size={24}
              color="#000"
              style={{ opacity: loadingSave ? 0.6 : 1 }}
            />
          )}
        </TouchableOpacity>

        {/* 🖼️ Image */}
        {image && (
          <Image
            source={{ uri: image as string }}
            className="w-full"
            style={{ aspectRatio: 1.25 }}
            resizeMode="cover"
          />
        )}

        <View className="p-5">
          {/* 📍 Title */}
          <Text className="text-black text-2xl font-bold mb-2">{title}</Text>

          {parsedTags.length > 0 && (
            <View className="flex-row flex-wrap gap-2 mb-3">
              {parsedTags.map((tag) => (
                <View
                  key={tag}
                  className="px-2 py-1 rounded-full"
                  style={{
                    backgroundColor:
                      TAG_COLORS[tag as keyof typeof TAG_COLORS] ?? "#E5E7EB",
                  }}
                >
                  <Text className="text-xs font-semibold text-white">
                    {tag}
                  </Text>
                </View>
              ))}
            </View>
          )}

          {/* 💬 Description */}
          <Text className="text-black-300 text-base mb-2">
            {description || "No description provided."}
          </Text>

          {/* 🔼🔽 Reddit-style vote row */}
          <View className="mt-2 mb-3 flex-row items-center">
            <TouchableOpacity
              activeOpacity={0.7}
              onPress={() => toggleVote(userVote === 1 ? 0 : 1)}
              className="px-2 py-1"
            >
              <Text
                className={`text-2xl font-bold ${
                  userVote === 1 ? "text-orange-500" : "text-gray-400"
                }`}
              >
                ▲
              </Text>
            </TouchableOpacity>

            <Text className="mx-2 min-w-[32px] text-center text-base font-semibold text-gray-800">
              {score ?? 0}
            </Text>

            <TouchableOpacity
              activeOpacity={0.7}
              onPress={() => toggleVote(userVote === -1 ? 0 : -1)}
              className="px-2 py-1"
            >
              <Text
                className={`text-2xl font-bold ${
                  userVote === -1 ? "text-blue-500" : "text-gray-400"
                }`}
              >
                ▼
              </Text>
            </TouchableOpacity>
          </View>

          {/* 🌐 Coordinates */}
          <Text className="text-black text-sm mb-3">
            📍 Coordinates: {latitude}, {longitude}
          </Text>
          <Text className="text-black text-sm mb-3">
            Created: {String(created_at ?? "").split("T")[0]}
          </Text>

          {/* 🗺️ Map Preview */}
          {userCoords ? (
            <MapView
              style={{ width: "100%", height: 200, borderRadius: 12 }}
              region={{
                latitude: Number(latitude),
                longitude: Number(longitude),
                latitudeDelta: 0.05,
                longitudeDelta: 0.05,
              }}
              className="rounded-xl mb-4"
            >
              <Marker
                coordinate={{
                  latitude: userCoords.latitude,
                  longitude: userCoords.longitude,
                }}
                title="You"
                pinColor="blue"
              />
              <Marker
                coordinate={{
                  latitude: Number(latitude),
                  longitude: Number(longitude),
                }}
                title={title as string}
                pinColor="red"
              />
            </MapView>
          ) : (
            <ActivityIndicator size="small" color="#2490ef" />
          )}

          {/* 📏 Distance */}
          {distance && (
            <Text className="text-black text-sm mb-3">
              📏 {distance.toFixed(2)} miles away
            </Text>
          )}

          {/* 🚗 Open in Maps */}
          <TouchableOpacity
            onPress={openMaps}
            className="bg-primary py-3 rounded-xl"
          >
            <Text className="text-center text-white font-semibold">
              Open in Apple Maps
            </Text>
          </TouchableOpacity>
          {currentUser && isOwnPost && (
            <TouchableOpacity
              onPress={deletePost}
              className="bg-red-600 py-3 rounded-xl mt-4"
            >
              <Text className="text-center text-white font-semibold">
                Delete Spot
              </Text>
            </TouchableOpacity>
          )}

          {!loadingFriendState &&
            currentUser &&
            !isOwnPost &&
            (alreadyFriend ? (
              <View className="mt-4 py-3 rounded-xl bg-gray-300">
                <Text className="text-center text-white font-semibold">
                  Already Friends
                </Text>
              </View>
            ) : (
              <TouchableOpacity
                onPress={addFriend}
                className="bg-primary py-3 rounded-xl mt-4"
              >
                <Text className="text-center text-white font-semibold">
                  Add {username} as Friend
                </Text>
              </TouchableOpacity>
            ))}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
