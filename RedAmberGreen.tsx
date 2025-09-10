import { useState } from "react"
import {View, StyleSheet} from "react-native"

export default function RedAmberGreen(){
    const colors = ["#015900"]
    const [color, setColor] = useState(colors[0])

    const styles = StyleSheet.create({
        color:{
            backgroundColor: color,
            borderRadius: "50%",
            height: 10,
            width: 10
        }
    })

    return(
        <View style={styles.color}>

        </View>
    )
}

