import { useEffect, useState } from "react";
import { Redirect } from "expo-router";
import { ActivityIndicator, View, Text } from "react-native";
import { API_URL } from "../lib/api";
import { getToken, clearToken } from "../lib/token";

// ✅ Only allow "/auth" or "/(tabs)"
type Route = "/auth" | "/(tabs)";

export default function RootIndex() {
  const [route, setRoute] = useState<Route | null>(null);

  useEffect(() => {
    (async () => {
      try {
        const token = await getToken();
        if (token) {
          const res = await fetch(`${API_URL}/me`, {
            headers: { Authorization: `Bearer ${token}` },
          });
          if (res.ok) {
            setRoute("/(tabs)");
            return;
          } else {
            await clearToken();
          }
        }
        setRoute("/auth");
      } catch (e) {
        console.log("Startup check failed:", e);
        await clearToken();
        setRoute("/auth");
      }
    })();
  }, []);

  if (!route) {
    return (
      <View style={{ flex: 1, justifyContent: "center", alignItems: "center" }}>
        <ActivityIndicator size="large" />
        <Text style={{ marginTop: 12 }}>Loading…</Text>
      </View>
    );
  }

  return <Redirect href={route} />;
}
