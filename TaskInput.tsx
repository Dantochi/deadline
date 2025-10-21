import {TextInput, StyleSheet} from "react-native"

export default function TaskInput(){
    return(
        <TextInput
        placeholder="This is my dummy text"
        placeholderTextColor="white"
        cursorColor="white"
        style={styles.input}
        multiline={true}
        >

        </TextInput>
    )
}

const styles = StyleSheet.create({
    input: {
        backgroundColor: "#141414",
        color: "white",
        height: "100%",
        width: 251,
        paddingLeft: 10,
        paddingTop: 10
    }
})