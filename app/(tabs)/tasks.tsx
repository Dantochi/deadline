import AddTask from "@/components/addTask";
import { View, Text } from "react-native";
import { useState } from "react";
import InputForm from "@/components/input_form";
import DateTime from "@/components/DateTime";

export default function TaskScreen() {
  const [modalVisible, setModalVisible] = useState(false);
  const [calendarVisible, setCalendarVisible] = useState(false);
  return (
    <View>
      <DateTime />
      <AddTask modalVisible={modalVisible} setModalVisible={setModalVisible} />
      {modalVisible && (
        <InputForm
          modalVisible={modalVisible}
          setModalVisible={setModalVisible}
        />
      )}
    </View>
  );
}
