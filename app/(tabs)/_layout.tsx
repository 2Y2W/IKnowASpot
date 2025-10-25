import { Feather } from "@expo/vector-icons";
import { Tabs } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import { View, Image, Text } from "react-native";
import "../../global.css";

export default function TabLayout() {
  return (
    <SafeAreaView className="flex-1 bg-background">
      {/* ✅ Top-left logo */}
      <View className="w-full flex-row items-center px-4 py-1 bg-background border-b border-card">
        <Text className="text-primary text-lg font-extrabold">
          I Know A Spot
        </Text>
      </View>

      <Tabs
        screenOptions={{
          // ✅ Colors
          tabBarActiveTintColor: "#2490ef", // active = primary blue
          tabBarInactiveTintColor: "#94a3b8", // inactive = muted gray

          // ✅ Tab bar styling
          tabBarStyle: {
            backgroundColor: "#fefaee", // background cream
            borderTopColor: "#fefaee", // blend border into background
            height: 60,
          },

          // ✅ Header
          headerStyle: {
            backgroundColor: "#fefaee", // match background
          },
          headerTintColor: "#2490ef", // header text/icons in primary
        }}
      >
        <Tabs.Screen
          name="index"
          options={{
            headerShown: false,
            title: "Explore",
            tabBarIcon: ({ color }) => (
              <Feather name="map" size={28} color={color} />
            ),
          }}
        />
        <Tabs.Screen
          name="ExplorePosts"
          options={{
            headerShown: false,
            title: "Explore2",
            tabBarIcon: ({ color }) => (
              <Feather name="book" size={28} color={color} />
            ),
          }}
        />
        <Tabs.Screen
          name="MakePost"
          options={{
            headerShown: false,
            title: "Post",
            tabBarIcon: ({ color }) => (
              <Feather size={28} name="arrow-up" color={color} />
            ),
          }}
        />
        <Tabs.Screen
          name="ProfileScreen"
          options={{
            headerShown: false,
            title: "Profile",
            tabBarIcon: ({ color }) => (
              <Feather size={28} name="user" color={color} />
            ),
          }}
        />
      </Tabs>
    </SafeAreaView>
  );
}
