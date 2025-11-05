import { useState } from "react";
import { Modal, TextInput, View, StyleSheet, Pressable } from "react-native";
import { AddTaskProps } from "./addTask";
import FontAwesome6 from "@react-native-vector-icons/fontawesome6";
import AntDesign from "@expo/vector-icons/AntDesign";

export default function InputForm({
  modalVisible,
  setModalVisible,
  handlePress,
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
            multiline={true}
            onChangeText={(newDescription) => setDescription(newDescription)}
            defaultValue={description}
            style={{ color: "#ffffff", marginTop: 10, fontSize: 13 }}
          ></TextInput>

          <View
            style={{
              flexDirection: "row",
              height: 30,
              alignItems: "center",
              justifyContent: "space-between",
              marginTop: 10,
            }}
          >
            <Pressable
              style={{ width: 24 }}
              onPress={() => {
                handlePress?.();
              }}
            >
              <FontAwesome6 name="calendar" size={24} color="silver" />
            </Pressable>
            <Pressable style={styles.taskButton} onPress={() => {}}>
              <AntDesign name="send" size={24} color="silver" />
            </Pressable>
          </View>
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
  taskButton: {
    width: 30,
    // backgroundColor: "blue",
    alignItems: "center",
    justifyContent: "center",
  },
});

// Create a button on the page of the Task Screen that summons the input modal
// Create an input form and a button which is part of a modal
// Create state to acess the input that comes from the form
// When the button is clicked, a view is created
