import { useState } from "react";
import { Modal, TextInput, View, StyleSheet, Pressable } from "react-native";
import { green } from "react-native-reanimated/lib/typescript/Colors";
import { AddTaskProps } from "./addTask";

export default function InputForm({
  modalVisible,
  setModalVisible,
}: AddTaskProps) {
  const [text, setText] = useState("");
  return (
    <Modal animationType="slide" transparent={true}>
      <Pressable
        style={styles.wrapper}
        onPress={() => {
          setModalVisible(!modalVisible);
        }}
      >
        <Pressable style={styles.container} onPress={() => {}}>
          <TextInput
            placeholder="Enter your task here"
            placeholderTextColor={"#Sa7D7A7A"}
            onChangeText={(newText) => setText(newText)}
            defaultValue={text}
            style={{ color: "#ffffff" }}
          ></TextInput>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: {
    height: 400,
    backgroundColor: "#403f3e",
    borderTopLeftRadius: 10,
    borderTopEndRadius: 10,
    padding: 10,
  },
  wrapper: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.5)",
    justifyContent: "flex-end",
  },
});

// Create a button on the page of the Task Screen that summons the input modal
// Create an input form and a button which is part of a modal
// Create state to acess the input that comes from the form
// When the button is clicked, a view is created
