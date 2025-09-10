import {StyleSheet, Pressable} from "react-native"
import FontAwesome6 from "@react-native-vector-icons/fontawesome6";

export default function TaskInputSend(){

    return(
        <Pressable style={styles.container}>
            <FontAwesome6 name="paper-plane" iconStyle="solid" style={{color: "#D9D9D9"}}></FontAwesome6>
        </Pressable>
    )
}

const styles = StyleSheet.create({
    container: {
        borderTopRightRadius: 20,
        borderBottomRightRadius: 20,
        // backgroundColor: "red",
        justifyContent: "center",
        alignItems: "center",
        width: 47,
        height: 43
    }
})