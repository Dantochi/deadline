import AddTask from "@/components/addTask";
import { View, Text } from "react-native";
import { useState } from "react";
import InputForm from "@/components/input_form";

export default function TaskScreen() {
  const [modalVisible, setModalVisible] = useState(false);
  return (
    <View>
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
