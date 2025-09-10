import {View, StyleSheet, KeyboardAvoidingView, Platform, TouchableWithoutFeedback, Keyboard} from "react-native"
import TaskInput from "./TaskInput"
import TaskInputCalendar from "./TaskInputCalendar"
import TaskInputSend from "./TaskInputSend"

// TODO: Make this a container for text input, message button and calendar

export default function TaskInputContainer(){
    return(
          
            
            <View style={style.container}>
            <TaskInputCalendar />
            <TaskInput />
            <TaskInputSend />
            </View>
    )
}


const style = StyleSheet.create({
    container: {
        flexDirection: "row",
        justifyContent: "center",
        alignItems: "flex-end",
        minHeight: 43,
        width: 348,
        borderWidth: 1,
        borderColor: "#FFFFFF",
        borderRadius: 20,
        backgroundColor: "#141414",
        marginBottom: 20,
        boxShadow: "rgba(229, 229, 236, 0.2) 0px 7px 29px 0px"
        }
})