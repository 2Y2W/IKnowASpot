import { useLocalSearchParams, useRouter } from "expo-router";
import { useState } from "react";
import {
  View,
  Image,
  Button,
  StyleSheet,
  ActivityIndicator,
  Alert,
} from "react-native";
import { API_URL } from "@/lib/api"; // adjust path if needed
import * as SecureStore from "expo-secure-store";

export default function ConfirmScreen() {
  const { uri } = useLocalSearchParams<{ uri: string }>();
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  async function handleUpload() {
    if (!uri) {
      Alert.alert("❌ Failed", "No photo to upload");
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

      if (!res.ok) {
        throw new Error(`Failed to get presigned URL. Status ${res.status}`);
      }

      const { uploadUrl, fileUrl } = await res.json();

      if (!uploadUrl) {
        throw new Error("Presigned URL missing from response");
      }

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

      if (!putRes.ok) {
        const errText = await putRes.text();
        throw new Error(`S3 upload failed: ${putRes.status} → ${errText}`);
      }

      console.log("✅ Uploaded to S3:", fileUrl);

      const token = await SecureStore.getItemAsync("access_token");

      // 5. Save metadata in backend
      const saveRes = await fetch(`${API_URL}/save-photo`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ s3Url: fileUrl }),
      });

      if (!saveRes.ok) {
        throw new Error(`Failed to save photo. Status ${saveRes.status}`);
      }

      const data = await saveRes.json();
      console.log("📡 Backend save-photo response:", data);

      Alert.alert("✅ Success", "Photo uploaded!");
      router.replace("/(tabs)");
    } catch (err: any) {
      console.error("❌ Upload error:", err);
      Alert.alert("❌ Upload failed", err.message || "Unknown error");
    } finally {
      setLoading(false);
    }
  }

  return (
    <View style={styles.container}>
      {uri && <Image source={{ uri }} style={styles.preview} />}

      {loading ? (
        <ActivityIndicator size="large" color="blue" />
      ) : (
        <>
          <Button title="Retake" onPress={() => router.back()} />
          <Button title="Upload" onPress={handleUpload} />
        </>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "black",
  },
  preview: {
    width: 300,
    height: 400,
    marginBottom: 20,
    borderRadius: 8,
  },
});
