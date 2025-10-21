import { Calendar } from "react-native-calendars";
import { Modal, View, StyleSheet } from "react-native";

export default function DateTime() {
  return (
    <View
      style={{
        height: 400,
        justifyContent: "center",
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
    </View>
  );
}

const styles = StyleSheet.create({
  container: {},
});
