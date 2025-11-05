import React from "react";
import FontAwesome from "@expo/vector-icons/FontAwesome";
import { Link, Tabs } from "expo-router";
import { Pressable } from "react-native";
import Feather from "@expo/vector-icons/Feather";
import Entypo from "@expo/vector-icons/Entypo";
import FontAwesome5 from "@expo/vector-icons/FontAwesome5";

import Colors from "@/constants/Colors";
import { useColorScheme } from "@/components/useColorScheme";
import { useClientOnlyValue } from "@/components/useClientOnlyValue";

// You can explore the built-in icon families and icons on the web at https://icons.expo.fyi/
// function TabBarIcon(props: {
//   name: React.ComponentProps<typeof FontAwesome>["name"];
//   color: string;
// }) {
//   return <FontAwesome size={28} style={{ marginBottom: -3 }} {...props} />;
// }

export default function TabLayout() {
  const colorScheme = useColorScheme();

  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: Colors[colorScheme ?? "light"].tint,
        // Disable the static render of the header on web
        // to prevent a hydration error in React Navigation v6.
        headerShown: useClientOnlyValue(false, true),
      }}
    >
      <Tabs.Screen
        name="TaskScreen"
        options={{
          title: "Tasks",
          headerShown: false,
          tabBarIcon: ({ color }) => (
            <Feather name="check-square" color={color} />
          ),
        }}
      />

      <Tabs.Screen
        name="LifeCalendarScreen"
        options={{
          title: "Life Calendar",
          headerShown: false,
          tabBarIcon: ({ color }) => <Entypo name="calendar" color={color} />,
        }}
      />

      {/* <Tabs.Screen
        name="JournalScreen"
        options={{
          title: "Journal",
          headerShown: false,
          tabBarIcon: ({ color }) => (
            <FontAwesome5 name="pen-nib" color={color} />
          ),
        }}
      /> */}

      <Tabs.Screen
        name="SettingScreen"
        options={{
          title: "Settings",
          headerShown: false,
          tabBarIcon: ({ color }) => <Feather name="settings" color={color} />,
        }}
      />
    </Tabs>
  );
}
