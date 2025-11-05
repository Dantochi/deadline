import { GestureDetector, Gesture } from "react-native-gesture-handler";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
} from "react-native-reanimated";
import AddTask from "@/components/addTask";
import { Text } from "react-native";
import { useState, useEffect } from "react";
import InputForm from "@/components/input_form";
import DateTime from "@/components/DateTime";
import Task from "@/components/Task";
import { FlatList } from "react-native";
import { getUrgencyColor } from "@/utils/GetUrgencyColor";
import { SafeAreaView } from "react-native-safe-area-context";
import FullScreenTask from "@/components/FullTaskScreen";

export default function TaskScreen() {
  const [modalVisible, setModalVisible] = useState(false);
  const [currentTaskIndex, setCurrentTaskIndex] = useState(0);
  const [calendarVisible, setCalendarVisible] = useState(false);
  const translateY = useSharedValue(-520);
  const data = [
    {
      id: "1",
      name: "Buy groceries",
      date: "2025-10-25",
    },
    {
      id: "2",
      name: "Finish project report",
      date: "2025-10-26",
    },
    {
      id: "3",
      name: "Call dentist for appointment",
      date: "2025-10-24",
    },
    {
      id: "4",
      name: "Review pull requests",
      date: "2025-10-27",
    },
    {
      id: "5",
      name: "Plan weekend trip",
      date: "2025-10-28",
    },
    {
      id: "6",
      name: "Update resume",
      date: "2025-10-29",
    },
    {
      id: "7",
      name: "Water the plants",
      date: "2025-10-24",
    },
    {
      id: "8",
      name: "Study for certification exam",
      date: "2025-10-30",
    },
    {
      id: "9",
      name: "Clean the garage",
      date: "2025-10-31",
    },
    {
      id: "10",
      name: "Prepare presentation slides",
      date: "2025-10-25",
    },
  ];
  const offsetY = useSharedValue(0);

  const panGesture = Gesture.Pan()
    .activeOffsetY([-10, 10])
    .failOffsetX([-5, 5])
    .onUpdate((event) => {
      offsetY.value = event.translationY;
    })
    .onEnd((event) => {
      if (event.translationY < -50) {
        if (currentTaskIndex < data.length - 1) {
          setCurrentTaskIndex(currentTaskIndex + 1);
        }
      } else if (event.translationY > 50) {
        if (currentTaskIndex > 0) {
          setCurrentTaskIndex(currentTaskIndex - 1);
        }
      }
      offsetY.value = withSpring(0);
    });
  const handlePress = () => {
    if (translateY.value === 0) {
      translateY.value = withSpring(-520);
    } else {
      translateY.value = withSpring(0);
    }
  };
  const animatedStyle = useAnimatedStyle(() => {
    return {
      transform: [{ translateY: offsetY.value }],
    };
  });

  useEffect(() => {
    // This ensures that when I the modal is not visible and the calendar is showing, the calendar is made to go back up
    if (!modalVisible && translateY.value === 0) {
      translateY.value = withSpring(-520);
    }
  }, [modalVisible]);
  return (
    <SafeAreaView style={styles.container}>
      <DateTime translateY={translateY} />
      <Animated.View style={[{ flex: 1 }, animatedStyle]}>
        <FullScreenTask
          task={data[currentTaskIndex]}
          oneNotePress={() => {
            console.log("Note Pressed");
          }}
        />
      </Animated.View>
      <AddTask modalVisible={modalVisible} setModalVisible={setModalVisible} />
      {modalVisible && (
        <InputForm
          modalVisible={modalVisible}
          setModalVisible={setModalVisible}
          handlePress={handlePress}
        />
      )}
    </SafeAreaView>
  );
}

const styles = {
  container: {
    flex: 1,
    paddingBottom: 40,
  },
};
