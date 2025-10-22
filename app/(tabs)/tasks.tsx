import AddTask from "@/components/addTask";
import { View, Text } from "react-native";
import { useState } from "react";
import InputForm from "@/components/input_form";
import DateTime from "@/components/DateTime";
import { useSharedValue, withSpring } from "react-native-reanimated";

export default function TaskScreen() {
  const [modalVisible, setModalVisible] = useState(false);
  const [calendarVisible, setCalendarVisible] = useState(false);
  const translateY = useSharedValue(-405);
  const handlePress = () => {
    translateY.value = withSpring(translateY.value ? 0 : -405); // This helps the calendar to slide in and out of view
  };
  return (
    <View>
      <DateTime translateY={translateY} />
      <AddTask modalVisible={modalVisible} setModalVisible={setModalVisible} />
      {modalVisible && (
        <InputForm
          modalVisible={modalVisible}
          setModalVisible={setModalVisible}
          handlePress={handlePress}
        />
      )}
    </View>
  );
}
