import { useState } from "react";
import { View, StyleSheet } from "react-native";

export default function RedAmberGreen({ timeColour }: { timeColour: number }) {
  const colors = ["#8F0500", "#8F6700", "#028F00"];
  const [color, setColor] = useState(colors[0]);

  function getColor() {
    if (timeColour <= 20) {
      setColor(colors[0]);
    } else if (timeColour < 70) {
      setColor(color[1]);
    } else {
      setColor(color[2]);
    }
  }

  const styles = StyleSheet.create({
    color: {
      backgroundColor: color,
      borderRadius: "50%",
      height: 10,
      width: 10,
    },
  });

  return <View style={styles.color}></View>;
}
