import { Calendar } from "react-native-calendars";
import { Modal, View, StyleSheet } from "react-native";
import { SharedValue } from "react-native-reanimated";
import Animated from "react-native-reanimated";
export default function DateTime({
  translateY,
}: {
  translateY: SharedValue<number>;
}) {
  return (
    <Animated.View
      style={{
        height: 405,
        transform: [{ translateY }],
        justifyContent: "flex-start",
        borderBottomRightRadius: 10,
        borderBottomLeftRadius: 10,
        backgroundColor: "#999999",
      }}
    >
      <View style={styles.container}>
        <Calendar
          style={{}}
          theme={{
            backgroundColor: "#999999",
            calendarBackground: "#999999",
            textSectionTitleColor: "#ffffff",
            textMonthFontWeight: 500,
            dayTextColor: "#ffffff",
            textDisabledColor: "#bdbfbf",
            textDayFontWeight: 500,
            todayTextColor: "#000000",
            selectedDayTextColor: "#000000",
            arrowColor: "#000000",
          }}
        />
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {},
});

// TODO: I want it such that when the calendar icon is clicked,
// The calendar slides down
