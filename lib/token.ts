// lib/token.ts
import * as SecureStore from "expo-secure-store";

export async function saveToken(token: string) {
  await SecureStore.setItemAsync("access_token", token);
}

export async function getToken(): Promise<string | null> {
  return await SecureStore.getItemAsync("access_token");
}

export async function clearToken() {
  await SecureStore.deleteItemAsync("access_token");
}
