import { CameraView, CameraType, useCameraPermissions } from "expo-camera";
import { useState, useRef, useCallback } from "react";
import { Button, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { useRouter, useFocusEffect } from "expo-router";
import { Feather } from "@expo/vector-icons";

export default function CameraScreen() {
  const [facing, setFacing] = useState<CameraType>("back");
  const [permission, requestPermission] = useCameraPermissions();
  const [active, setActive] = useState(false);
  const cameraRef = useRef<CameraView>(null);
  const router = useRouter();

  // 👇 Automatically mount/unmount camera when tab/screen focus changes
  useFocusEffect(
    useCallback(() => {
      setActive(true);
      return () => {
        setActive(false);
      };
    }, []),
  );

  if (!permission) return <View />;

  if (!permission.granted) {
    return (
      <View style={styles.container}>
        <Text style={styles.message}>
          We need your permission to show the camera
        </Text>
        <Button onPress={requestPermission} title="grant permission" />
      </View>
    );
  }

  function toggleCameraFacing() {
    setFacing((current) => (current === "back" ? "front" : "back"));
  }

  async function takePhoto() {
    if (cameraRef.current) {
      const photo = await cameraRef.current.takePictureAsync({
        quality: 0.7,
        base64: false,
      });
      router.push({
        pathname: "/ConfirmScreen",
        params: { uri: photo.uri },
      });
    }
  }

  return (
    <View style={styles.container} className="bg-background">
      {/* 👇 Only render the camera when screen is focused */}
      {active && (
        <CameraView ref={cameraRef} style={styles.camera} facing={facing} />
      )}

      <View className="absolute bottom-16 w-full items-center">
        {/* Take photo button in center */}
        <TouchableOpacity onPress={takePhoto} className="p-4">
          <Feather name="circle" size={72} color="#ffffff" />
        </TouchableOpacity>

        {/* Flip camera button in bottom-right */}
        <TouchableOpacity
          onPress={toggleCameraFacing}
          className="absolute right-8 bottom-2 p-2"
        >
          <Feather name="refresh-ccw" size={32} color="#ffffff" />
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, justifyContent: "center" },
  message: { textAlign: "center", paddingBottom: 10 },
  camera: { flex: 1 },
  buttonContainer: {
    position: "absolute",
    bottom: 64,
    flexDirection: "row",
    justifyContent: "space-around",
    width: "100%",
    paddingHorizontal: 32,
  },
  button: { flex: 1, alignItems: "center" },
  text: { fontSize: 18, fontWeight: "bold", color: "white" },
});
