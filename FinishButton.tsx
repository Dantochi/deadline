import { StyleSheet, Pressable } from "react-native";
import FontAwesome6 from "@react-native-vector-icons/fontawesome6";


export default function FinishButton(){
    return(
        <Pressable style={styles.button}>
            <FontAwesome6 name="check" iconStyle="solid"></FontAwesome6>
        </Pressable>
    )
}

const styles = StyleSheet.create({
    button:{
        height: 20,
        width: 20,
        borderRadius: "50%",
        backgroundColor: "#D9D9D9",
        alignItems: "center",
        justifyContent: "center"
    },

    
})