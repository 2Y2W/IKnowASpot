import React, { useState } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
} from "react-native";
import { useRouter } from "expo-router";
import * as SecureStore from "expo-secure-store";

const API_URL = process.env.EXPO_PUBLIC_API_URL;

async function saveToken(token: string) {
  await SecureStore.setItemAsync("access_token", token);
}

export default function AuthScreen() {
  const router = useRouter();
  const [mode, setMode] = useState<"signin" | "signup">("signin");
  const [email, setEmail] = useState("");
  const [username, setUsername] = useState(""); // <-- NEW
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);

  async function handleSubmit() {
    if (!email || !password) {
      return Alert.alert("Missing fields", "Enter email & password");
    }
    if (mode === "signup" && !username) {
      return Alert.alert("Missing fields", "Enter a username");
    }
    if (mode === "signup" && password.length < 8) {
      return Alert.alert("Password", "Must be at least 8 characters");
    }

    setBusy(true);
    try {
      const endpoint = mode === "signup" ? "/auth/register" : "/auth/login";
      const body =
        mode === "signup"
          ? JSON.stringify({ email, username, password })
          : JSON.stringify({ email, password });

      const res = await fetch(`${API_URL}${endpoint}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body,
      });
      const data = await res.json();

      if (!res.ok) throw new Error(data?.detail || "Something went wrong");

      if (mode === "signup") {
        Alert.alert("Account created", "Now sign in with your new account");
        setMode("signin");
      } else {
        await saveToken(data.access_token);
        router.replace("/(tabs)");
      }
    } catch (err: any) {
      Alert.alert("Error", err.message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <View style={{ flex: 1, justifyContent: "center", padding: 20 }}>
      <Text style={{ fontSize: 24, marginBottom: 20, textAlign: "center" }}>
        {mode === "signin" ? "Sign In" : "Sign Up"}
      </Text>

      <TextInput
        placeholder="email"
        autoCapitalize="none"
        keyboardType="email-address"
        value={email}
        onChangeText={setEmail}
        style={{
          borderWidth: 1,
          borderRadius: 8,
          padding: 12,
          marginBottom: 12,
          borderColor: "#ddd",
        }}
      />

      {mode === "signup" && (
        <TextInput
          placeholder="username"
          autoCapitalize="none"
          value={username}
          onChangeText={setUsername}
          style={{
            borderWidth: 1,
            borderRadius: 8,
            padding: 12,
            marginBottom: 12,
            borderColor: "#ddd",
          }}
        />
      )}

      <TextInput
        placeholder="password"
        secureTextEntry
        value={password}
        onChangeText={setPassword}
        style={{
          borderWidth: 1,
          borderRadius: 8,
          padding: 12,
          marginBottom: 12,
          borderColor: "#ddd",
        }}
      />

      <TouchableOpacity
        onPress={handleSubmit}
        disabled={busy}
        style={{
          backgroundColor: "#007bff",
          padding: 15,
          borderRadius: 8,
          alignItems: "center",
        }}
      >
        {busy ? (
          <ActivityIndicator color="#fff" />
        ) : (
          <Text style={{ color: "#fff", fontWeight: "bold" }}>
            {mode === "signin" ? "Sign In" : "Sign Up"}
          </Text>
        )}
      </TouchableOpacity>

      <TouchableOpacity
        onPress={() =>
          setMode((prev) => (prev === "signin" ? "signup" : "signin"))
        }
        style={{ marginTop: 20, alignItems: "center" }}
      >
        <Text style={{ color: "#007bff" }}>
          {mode === "signin"
            ? "Don't have an account? Sign Up"
            : "Already have an account? Sign In"}
        </Text>
      </TouchableOpacity>
    </View>
  );
}
