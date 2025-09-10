import {Pressable, StyleSheet} from "react-native"
import FontAwesome6 from "@react-native-vector-icons/fontawesome6";


export default function TaskInputCalendar(){

    return(
        <Pressable style={styles.container}>
            <FontAwesome6 name="calendar-days" iconStyle="solid" style={{color: "#D9D9D9"}}></FontAwesome6>
        </Pressable>
    )
}

const styles = StyleSheet.create({
    container: {
        borderTopLeftRadius: 20,
        borderBottomLeftRadius: 20,
        // backgroundColor: "red",
        justifyContent: "center",
        alignItems: "center",
        width: 47,
        height: 43
    }
})