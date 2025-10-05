import { useLocalSearchParams, useRouter } from "expo-router";
import { useState, useEffect } from "react";
import {
  View,
  Image,
  Button,
  ActivityIndicator,
  Alert,
  TextInput,
  Text,
  ScrollView,
  TouchableOpacity,
} from "react-native";
import * as SecureStore from "expo-secure-store";
import * as Location from "expo-location";
import { API_URL } from "@/lib/api";

export default function ConfirmScreen() {
  const { uri } = useLocalSearchParams<{ uri: string }>();
  const router = useRouter();

  const [loading, setLoading] = useState(false);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [coords, setCoords] = useState<{ lat: number; lon: number } | null>(
    null
  );
  const PRIMARY = "#2490ef";

  // ✅ Grab user location on mount
  useEffect(() => {
    (async () => {
      let { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== "granted") {
        Alert.alert("Permission denied", "Location is required to post");
        return;
      }
      let loc = await Location.getCurrentPositionAsync({});
      setCoords({ lat: loc.coords.latitude, lon: loc.coords.longitude });
    })();
  }, []);

  async function handleUpload() {
    if (!uri) {
      Alert.alert("❌ Failed", "No photo to upload");
      return;
    }

    if (!title) {
      Alert.alert("⚠️ Missing title", "Please enter a title for your spot.");
      return;
    }

    try {
      setLoading(true);

      // 1. Derive fileName + fileType
      const fileName = uri.split("/").pop() || `photo_${Date.now()}.jpg`;
      const fileType = "image/jpeg";

      // 2. Ask backend for presigned URL
      const res = await fetch(`${API_URL}/presign`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ fileName, fileType }),
      });

      if (!res.ok)
        throw new Error(`Failed to get presigned URL. Status ${res.status}`);

      const { uploadUrl, fileUrl } = await res.json();
      if (!uploadUrl) throw new Error("Presigned URL missing from response");

      console.log("🚀 Uploading to S3:", uploadUrl);

      // 3. Convert local file to blob
      const localRes = await fetch(uri);
      const blob = await localRes.blob();

      // 4. Upload file to S3
      const putRes = await fetch(uploadUrl, {
        method: "PUT",
        headers: { "Content-Type": fileType },
        body: blob,
      });
      if (!putRes.ok) throw new Error(`S3 upload failed: ${putRes.status}`);

      console.log("✅ Uploaded to S3:", fileUrl);

      const token = await SecureStore.getItemAsync("access_token");

      // 5. Save metadata in backend
      const saveRes = await fetch(`${API_URL}/create-post`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          s3Url: fileUrl,
          title,
          description,
          latitude: coords?.lat,
          longitude: coords?.lon,
        }),
      });

      if (!saveRes.ok)
        throw new Error(`Failed to save post. Status ${saveRes.status}`);

      const data = await saveRes.json();
      console.log("📡 Backend create-post response:", data);

      Alert.alert("✅ Success", "Post uploaded!");
      router.replace("/(tabs)");
    } catch (err: any) {
      console.error("❌ Upload error:", err);
      Alert.alert("❌ Upload failed", err.message || "Unknown error");
    } finally {
      setLoading(false);
    }
  }

  return (
    <ScrollView className="flex-1 bg-background p-4">
      {uri && (
        <Image
          source={{ uri }}
          className="w-full h-96 mb-4 rounded-lg"
          resizeMode="cover"
        />
      )}

      {/* Coordinates */}
      {coords ? (
        <Text className="text-primary mb-4">
          📍 {coords.lat.toFixed(4)}, {coords.lon.toFixed(4)}
        </Text>
      ) : (
        <Text className="text-gray-400 mb-4">📍 Fetching location...</Text>
      )}

      {/* Title input */}
      <TextInput
        className="w-full bg-card rounded-md p-3 mb-3 text-black"
        placeholder="Enter a title"
        value={title}
        onChangeText={setTitle}
        placeholderTextColor="#888"
      />

      {/* Description input */}
      <TextInput
        className="w-full bg-card rounded-md p-3 mb-3 h-24 text-black"
        placeholder="Add a description"
        value={description}
        onChangeText={setDescription}
        multiline
        placeholderTextColor="#888"
      />

      {/* Buttons */}
      {loading ? (
        <ActivityIndicator size="large" color={PRIMARY} />
      ) : (
        <View className="flex flex-col justify-between gap-10">
          <View className="flex-1">
            <TouchableOpacity
              onPress={() => router.back()}
              className="p-3 border border-primary rounded-full"
            >
              <Text className="text-primary text-center font-semibold text-lg">
                Retake
              </Text>
            </TouchableOpacity>
          </View>

          <View className="flex-1">
            <TouchableOpacity
              onPress={handleUpload}
              className="p-3 bg-primary rounded-full"
            >
              <Text className="text-white text-center font-semibold text-lg">
                Upload
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      )}
    </ScrollView>
  );
}
