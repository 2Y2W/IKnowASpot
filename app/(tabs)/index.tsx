import React, { useEffect, useState } from "react";
import { View, ActivityIndicator, Text } from "react-native";
import * as Location from "expo-location";
import { SafeAreaView } from "react-native-safe-area-context";
import { StatusBar } from "expo-status-bar";
import MapView from "../../components/maps/MapView";
import { API_URL } from "@/lib/api";
import "../../global.css";

export default function MapScreen() {
  const [coords, setCoords] = useState<{
    latitude: number;
    longitude: number;
  } | null>(null);
  const [posts, setPosts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status === "granted") {
        const loc = await Location.getCurrentPositionAsync({});
        setCoords({
          latitude: loc.coords.latitude,
          longitude: loc.coords.longitude,
        });
        try {
          const res = await fetch(`${API_URL}/posts`);
          const data = await res.json();
          setPosts(data.posts || []);
        } catch (err) {
          console.error("Error fetching posts:", err);
        } finally {
          setLoading(false);
        }
      }
    })();
  }, []);

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
    image: p.s3_url, // if your MapView supports showing images
    user_id: p.user_id,
    username: p.username,
  }));

  return (
    <View className="flex-1 bg-background">
      {/* ✅ Status bar (light icons, dark background) */}
      <StatusBar style="light" backgroundColor="#111827" />

      {/* ✅ Map fills safe area */}
      <View className="flex-1 bg-background">
        <MapView
          latitude={coords.latitude}
          longitude={coords.longitude}
          zoom={14}
          showsUserLocation
          markers={spots}
        />
      </View>
    </View>
  );
}
