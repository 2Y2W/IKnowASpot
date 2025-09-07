import { Feather } from "@expo/vector-icons";
import { Tabs } from "expo-router";
import { blue } from "react-native-reanimated/lib/typescript/Colors";

export default function TabLayout() {
  return (
    <Tabs screenOptions={{ tabBarActiveTintColor: "blue" }}>
      <Tabs.Screen
        name="index"
        options={{
          headerShown: false,
          title: "Explore",
          tabBarIcon: ({ color }) => (
            <Feather name="map" size={28} color={color}/>
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
        name="Account"
        options={{
          headerShown: false,
          title: "Account",
          tabBarIcon: ({ color }) => (
            <Feather size={28} name="user" color={color} />
          ),
        }}
      />
    </Tabs>
  );
}
