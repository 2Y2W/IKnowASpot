import React from "react";
import { StyleSheet, View, Image, Text, Dimensions } from "react-native";
import RNMapView, { Marker, Callout, Region } from "react-native-maps";
import { MapViewProps } from "./MapView.types";
import "../../global.css";

const { width: screenWidth } = Dimensions.get("window");
const aspectRatio = 0.5;

export default function MapView({
  latitude,
  longitude,
  zoom = 14,
  style,
  markers,
}: MapViewProps) {
  const region: Region = {
    latitude,
    longitude,
    latitudeDelta: 0.0922 / zoom,
    longitudeDelta: 0.0421 / zoom,
  };

  return (
    <View className="flex-1">
      <RNMapView
        style={[{ flex: 1 }, style]}
        initialRegion={region}
        showsUserLocation={true}
        followsUserLocation={false}
      >
        {markers?.map((m) => (
          <Marker
            key={m.id}
            coordinate={{ latitude: m.latitude, longitude: m.longitude }}
          >
            {/* ✅ Callout popup when tapped */}
            <Callout tooltip>
              <View
                className="bg-card rounded-xl overflow-hidden shadow-lg"
                style={{ width: screenWidth * aspectRatio }}
              >
                {/* ✅ Full-width horizontal image */}
                {m.image && (
                  <Image
                    source={{ uri: m.image }}
                    className="w-full rounded-t-xl"
                    style={{ aspectRatio: 1.25 }}
                    resizeMode="cover"
                  />
                )}

                {/* ✅ Text section */}
                <View className="p-3">
                  <Text className="text-black font-semibold text-base mb-1">
                    {m.title || "Untitled Spot"}
                  </Text>

                  {m.description ? (
                    <Text className="text-black-300 text-sm">
                      {m.description}
                    </Text>
                  ) : (
                    <Text className="text-black italic text-sm">
                      No description
                    </Text>
                  )}
                  <Text className="text-black-300 text-sm">
                    <Text className="text-black-300 text-sm">
                      {m.username}
                    </Text>
                  </Text>
                </View>
              </View>
            </Callout>
          </Marker>
        ))}
      </RNMapView>
    </View>
  );
}

