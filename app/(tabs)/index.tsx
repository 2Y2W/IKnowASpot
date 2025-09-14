import React from "react";
import { View, StyleSheet } from "react-native";
import MapView from "../../components/maps/MapView";

export default function MapScreen() {
  return (
    <View style={styles.container}>
      <MapView latitude={40.7128} longitude={-74.006} zoom={13} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
});
