import React from "react";
import { View, Image, Text, Dimensions } from "react-native";
import RNMapView, { Marker, Callout, Region } from "react-native-maps";
import { MapViewProps } from "./MapView.types";
import { useRouter } from "expo-router";
import "../../global.css";

const { width: screenWidth } = Dimensions.get("window");

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

  const router = useRouter();

  return (
    <View className="flex-1">
      <RNMapView
        style={[{ flex: 1 }, style]}
        initialRegion={region}
        showsUserLocation
        followsUserLocation={false}
      >
        {markers?.map((m) => (
          <Marker
            key={m.id}
            coordinate={{ latitude: m.latitude, longitude: m.longitude }}
          >
            <Callout
              tooltip
              onPress={() =>
                router.push({
                  pathname: "/spot/[id]",
                  params: {
                    id: m.id.toString(),
                    title: m.title,
                    description: m.description,
                    image: m.image,
                    latitude: m.latitude,
                    longitude: m.longitude,
                  },
                })
              }
            >
              <View
                className="bg-card rounded-xl overflow-hidden shadow-lg"
                style={{ width: screenWidth * 0.8 }}
              >
                {m.image && (
                  <Image
                    source={{ uri: m.image }}
                    className="w-full rounded-t-xl"
                    style={{ aspectRatio: 1.25 }}
                    resizeMode="cover"
                  />
                )}

                <View className="p-3">
                  <Text className="text-black font-semibold text-base mb-1">
                    {m.title || "Untitled Spot"}
                  </Text>
                  {m.description ? (
                    <Text className="text-black text-sm">{m.description}</Text>
                  ) : (
                    <Text className="text-gray-500 italic text-sm">
                      No description
                    </Text>
                  )}
                  <Text className="text-black-300 text-sm"> {m.username} </Text>
                </View>
              </View>
            </Callout>
          </Marker>
        ))}
      </RNMapView>
    </View>
  );
}
