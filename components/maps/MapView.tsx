import React from "react";
import { View, Image, Text, Dimensions, TouchableOpacity } from "react-native";
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
  onVote, // 👈 from updated MapViewProps
  showUserLocation, // optional flag from props
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
        showsUserLocation={showUserLocation ?? true}
        followsUserLocation={false}
      >
        {markers?.map((m) => {
          const rawUserVote = typeof m.user_vote === "number" ? m.user_vote : 0;
          const normalizedUserVote: -1 | 0 | 1 =
            rawUserVote > 0 ? 1 : rawUserVote < 0 ? -1 : 0;

          return (
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
                      username: String(m.username ?? ""),
                      user_id: String(m.user_id ?? ""),

                      created_at: m.created_at ?? "",

                      score: m.score ?? 0,
                      user_vote: normalizedUserVote,
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
                      <Text className="text-black text-sm">
                        {m.description}
                      </Text>
                    ) : (
                      <Text className="text-gray-500 italic text-sm">
                        No description
                      </Text>
                    )}

                    {m.username && (
                      <Text className="text-black-300 text-sm mt-1">
                        {m.username}
                      </Text>
                    )}

                    {/* 🔼🔽 Reddit-style vote row inside callout */}
                    {onVote && (
                      <View className="mt-2 flex-row items-center">
                        <TouchableOpacity
                          activeOpacity={0.7}
                          onPress={() =>
                            onVote(
                              m.id.toString(),
                              normalizedUserVote === 1 ? 0 : 1
                            )
                          }
                          className="px-2 py-1"
                        >
                          <Text
                            className={`text-2xl font-bold ${
                              normalizedUserVote === 1
                                ? "text-orange-500"
                                : "text-gray-400"
                            }`}
                          >
                            ▲
                          </Text>
                        </TouchableOpacity>

                        <Text className="mx-2 min-w-[32px] text-center text-base font-semibold text-gray-800">
                          {m.score ?? 0}
                        </Text>

                        <TouchableOpacity
                          activeOpacity={0.7}
                          onPress={() =>
                            onVote(
                              m.id.toString(),
                              normalizedUserVote === -1 ? 0 : -1
                            )
                          }
                          className="px-2 py-1"
                        >
                          <Text
                            className={`text-2xl font-bold ${
                              normalizedUserVote === -1
                                ? "text-blue-500"
                                : "text-gray-400"
                            }`}
                          >
                            ▼
                          </Text>
                        </TouchableOpacity>
                      </View>
                    )}
                  </View>
                </View>
              </Callout>
            </Marker>
          );
        })}
      </RNMapView>
    </View>
  );
}
