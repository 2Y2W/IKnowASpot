import React, {useEffect, useState} from "react";
import { View, StyleSheet, ActivityIndicator } from "react-native";
import * as Location from "expo-location";
import MapView from "../../components/maps/MapView";
import "../../global.css"

export default function MapScreen() {
  const [coords, setCoords] = useState<{
    latitude: number;
    longitude: number;
  } | null>(null);

  useEffect(() => {
    (async () => {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status === "granted") {
        const loc = await Location.getCurrentPositionAsync({});
        setCoords({
          latitude: loc.coords.latitude,
          longitude: loc.coords.longitude,
        });
      }
    })();
  }, []);

  if (!coords) {
    return (
      <View className="flex-1 items-center justify-center">
        <ActivityIndicator size="large" />
      </View>
    );
  }

  return (
    <MapView
      latitude={coords.latitude}
      longitude={coords.longitude}
      zoom={14}
      showsUserLocation
      markers={[
        { id: "1", latitude: 40.7128, longitude: -74.006, title: "New York" },
        {
          id: "2",
          latitude: 40.0522,
          longitude: -74.006,
          title: "Los Angeles",
        },
      ]}
    />
  );
}

