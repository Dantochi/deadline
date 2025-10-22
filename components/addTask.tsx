import { View, StyleSheet, Pressable } from "react-native";
import MaterialIcons from "@expo/vector-icons/MaterialIcons";

export interface AddTaskProps {
  modalVisible: boolean;
  setModalVisible: (value: boolean) => void;
  handlePress?: () => void;
}

export default function AddTask({
  modalVisible,
  setModalVisible,
}: AddTaskProps) {
  function modalVisibility() {
    setModalVisible(!modalVisible); // This is where the visiblity of the modal is set when the button is clicked
  }
  return (
    <Pressable style={styles.button} onPress={modalVisibility}>
      <MaterialIcons name="add" size={30} color="white"></MaterialIcons>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: {
    borderRadius: "50%",
    backgroundColor: "black",
    height: 60,
    width: 60,
    alignItems: "center",
    justifyContent: "center",
    position: "absolute",
    right: 10,
    top: 700,
  },
});
