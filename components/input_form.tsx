import { useState } from "react";
import { Modal, TextInput, View, StyleSheet, Pressable } from "react-native";
import { green } from "react-native-reanimated/lib/typescript/Colors";
import { AddTaskProps } from "./addTask";
import FontAwesome6 from "@react-native-vector-icons/fontawesome6";

export default function InputForm({
  modalVisible,
  setModalVisible,
}: AddTaskProps) {
  const [task, setTask] = useState("");
  const [description, setDescription] = useState("");
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
            placeholder="What would you like to do?"
            placeholderTextColor={"#7D7A7A"}
            onChangeText={(newText) => setTask(newText)}
            defaultValue={task}
            style={{ color: "#ffffff" }}
          ></TextInput>
          <TextInput
            placeholder="Description"
            placeholderTextColor={"#7D7A7A"}
            onChangeText={(newDescription) => setDescription(newDescription)}
            defaultValue={description}
            style={{ color: "#ffffff", marginTop: 10, fontSize: 13 }}
          ></TextInput>

          <Pressable style={{ marginTop: 20 }} onPress={() => {}}></Pressable>
          <FontAwesome6 name="calendar" size={24} color="silver" />
        </Pressable>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: {
    height: 200,
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
