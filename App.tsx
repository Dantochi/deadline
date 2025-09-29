import { StatusBar } from "expo-status-bar";
import {
  StyleSheet,
  Text,
  View,
  KeyboardAvoidingView,
  Platform,
  SafeAreaView,
} from "react-native";
import TaskList from "./TaskList";
import TaskInputContainer from "./TaskInputContainer";
import { GestureHandlerRootView } from "react-native-gesture-handler";

export default function App() {
  return (
    <GestureHandlerRootView>
      <View style={styles.container}>
        {/* Dark mode is default. Status bar shows the time, wifi, battery, etc. and here it is light which is for dark mode. */}
        <StatusBar style="dark" />
        <KeyboardAvoidingView
          style={{
            flex: 1,
            alignItems: "center",
            justifyContent: "space-between",
          }}
          behavior="height"
          keyboardVerticalOffset={0}
        >
          <View></View>
          <TaskList />
          <TaskInputContainer />
        </KeyboardAvoidingView>
      </View>
    </GestureHandlerRootView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#1E1E1E",
    alignItems: "center",
    justifyContent: "space-between",
  },
});
