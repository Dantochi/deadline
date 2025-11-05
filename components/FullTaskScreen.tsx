import { View, Text, StyleSheet, Pressable } from "react-native";
import { getUrgencyColor } from "@/utils/GetUrgencyColor";
import Feather from "@expo/vector-icons/Feather";

interface FullScreenTaskProps {
  task: {
    id: string;
    name: string;
    date: string;
  };
  oneNotePress: () => void;
}

export default function FullScreenTask({
  task,
  oneNotePress,
}: FullScreenTaskProps) {
  const urgencyColor = getUrgencyColor(task.date);

  function calculateDaysLeft(dateString: string): number {
    const now = new Date();
    const deadline = new Date(dateString);
    const diffTime = deadline.getTime() - now.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays;
  }

  const daysLeft = calculateDaysLeft(task.date);

  return (
    <View style={[styles.container, { backgroundColor: urgencyColor }]}>
      <View style={styles.topBar}>
        <Pressable onPress={oneNotePress} style={styles.iconButton}>
          <Feather name="file-text" size={24} color="#000000" />
        </Pressable>

        <View style={styles.colorCircle} />
      </View>

      <View style={styles.centerContent}>
        <Text style={styles.taskName}>{task.name}</Text>
        <Pressable>
          <Text style={styles.daysLeft}>
            {daysLeft} {daysLeft === 1 ? "day" : "days"} left
          </Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 20,
  },
  topBar: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginTop: 10,
  },
  iconButton: {
    padding: 10,
  },
  colorCircle: {
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: "#000000",
  },
  centerContent: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  taskName: {
    fontSize: 32,
    fontWeight: "bold",
    color: "#000000",
    textAlign: "center",
    marginBottom: 20,
  },
  daysLeft: {
    fontSize: 20,
    color: "#000000",
    opacity: 0.8,
  },
});
