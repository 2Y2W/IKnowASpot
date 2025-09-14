import React from "react";
import { StyleSheet } from "react-native";
import RNMapView, { Marker, Region } from "react-native-maps";
import { MapViewProps } from "./MapView.types";
import { View } from "react-native";
import "../../global.css";

export default function MapView({
  latitude,
  longitude,
  zoom = 14,
  style,
  markers
}: MapViewProps) {
  const region: Region = {
    latitude,
    longitude,
    latitudeDelta: 0.0922 / zoom,
    longitudeDelta: 0.0421 / zoom,
  };

  return (
    <View className="flex-1">
      <RNMapView style={[styles.map, style]} initialRegion={region}
      showsUserLocation={true}
      followsUserLocation={true}>
        {markers?.map((m) => (
          <Marker
            key={m.id}
            coordinate={{ latitude: m.latitude, longitude: m.longitude }}
            title={m.title}
          />
        ))}
      </RNMapView>
    </View>
  );
}

const styles = StyleSheet.create({
  map: {
    flex: 1,
  },
});
