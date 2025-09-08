import { StatusBar } from "expo-status-bar";
import { StyleSheet, Text, View } from "react-native";

export default function App() {
  return (
    <View style={styles.container}>
      <Text style={{ color: "white" }}>Open up App.tsx to start working on your app!</Text>
      {/* Dark mode is default. Status bar shows the time, wifi, battery, etc. and here it is light which is for dark mode. */}
      <StatusBar style="light" /> 
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#1E1E1E",
    alignItems: "center",
    justifyContent: "center",
  },
});
