import { useState } from "react";
import { useFonts } from "expo-font";
import { IstokWeb_400Regular } from "@expo-google-fonts/istok-web";
import { View, Text, StyleSheet } from "react-native";

export default function CalendarTimeLeft({ dueDate }: { dueDate: string }) {
  // This useFont returns a boolean to confirm is the font has been loaded
  const [fontLoaded] = useFonts({});
  const [days, setDays] = useState(5);
  return (
    <View style={styles.container}>
      <Text style={styles.istokWeb}> {days} days left</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    borderWidth: 1,
    borderColor: "#767676",
    borderRadius: 3,
    width: 70,
    height: 20,
    alignItems: "center",
    justifyContent: "center",
  },
  istokWeb: {
    fontFamily: "IstokWeb_400Regular",
    fontSize: 10,
    color: "#767676",
  },
});
