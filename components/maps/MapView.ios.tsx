import React from "react";
import { StyleSheet } from "react-native";
import RNMapView, { Marker, Region } from "react-native-maps";
import { MapViewProps } from "./MapView.types";

export default function MapView({
  latitude,
  longitude,
  zoom = 14,
  style,
}: MapViewProps) {
  const region: Region = {
    latitude,
    longitude,
    latitudeDelta: 0.0922 / zoom,
    longitudeDelta: 0.0421 / zoom,
  };

  return (
    <RNMapView style={[styles.map, style]} initialRegion={region}>
      <Marker coordinate={{ latitude, longitude }} />
    </RNMapView>
  );
}

const styles = StyleSheet.create({
  map: {
    flex: 1,
  },
});
