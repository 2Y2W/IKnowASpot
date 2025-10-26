import React, { useEffect, useState } from "react";
import { useRouter, useLocalSearchParams } from "expo-router";
import {
  View,
  Text,
  Image,
  TouchableOpacity,
  Linking,
  ActivityIndicator,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import MapView, { Marker } from "react-native-maps";
import * as Location from "expo-location";
import { Feather, FontAwesome } from "@expo/vector-icons";
import * as SecureStore from "expo-secure-store";
import { API_URL } from "@/lib/api";
import "../../global.css";

export default function SpotDetail() {
  const router = useRouter();
  const { id, title, description, image, latitude, longitude } =
    useLocalSearchParams();

  const [userCoords, setUserCoords] = useState<{
    latitude: number;
    longitude: number;
  } | null>(null);
  const [distance, setDistance] = useState<number | null>(null);
  const [saved, setSaved] = useState(false);
  const [loadingSave, setLoadingSave] = useState(false);
  const [checkingSaved, setCheckingSaved] = useState(true);

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

        // ✅ If this post ID is in the saved list, set as saved
        const isSaved = savedPosts.some((p: any) => p.id === Number(id));
        setSaved(isSaved);
      } catch (err) {
        console.error("❌ Error checking saved state:", err);
      } finally {
        setCheckingSaved(false);
      }
    })();
  }, [id]);

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

  // 🚗 Open in Apple Maps
  const openMaps = () => {
    if (!latitude || !longitude) return;
    const base = "http://maps.apple.com/?";
    if (userCoords) {
      Linking.openURL(
        `${base}saddr=${userCoords.latitude},${userCoords.longitude}&daddr=${latitude},${longitude}&dirflg=d`
      );
    } else {
      Linking.openURL(`${base}daddr=${latitude},${longitude}&dirflg=d`);
    }
  };

  return (
    <SafeAreaView className="flex-1 bg-background pt-12">
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

        {/* 💬 Description */}
        <Text className="text-black-300 text-base mb-4">
          {description || "No description provided."}
        </Text>

        {/* 🌐 Coordinates */}
        <Text className="text-black text-sm mb-3">
          📍 Coordinates: {latitude}, {longitude}
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
      </View>
    </SafeAreaView>
  );
}
