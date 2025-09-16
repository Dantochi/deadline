import { View, StyleSheet, KeyboardAvoidingView, Platform, TouchableWithoutFeedback, Keyboard} from "react-native";
import TaskItem from "./TaskItem";
import FinishButton from "./FinishButton"; 
import RedAmberGreen from "./RedAmberGreen";    
import CalendarTimeLeft from "./CalendarTimeLeft";
import Data from "./data";



export default function TaskList() {
    const data = Data
    const taskItemProps = {
        title: data[0].title
    }
    const timeLeftProps = {
        dueDate: data[0].dueDate 
    }
    const buttonProps = {
        isCompleted: data[0].isCompleted
    }

data.map(function(item){
    <View style={styles.container}>
                <View style={styles.taskItemContainer}><TaskItem title={item.title}/></View>
                <View style={styles.buttonContainer}>
                    <View style={{marginLeft: 10}}>
                    <FinishButton />
                    </View>
                <View style={styles.indicatorContainer}>
                    <CalendarTimeLeft />
                    <RedAmberGreen />
                </View>
                </View>
            </View>
})
  return (

                <View style={styles.container}>
                <View style={styles.taskItemContainer}><TaskItem {...taskItemProps}/></View>
                <View style={styles.buttonContainer}>
                    <View style={{marginLeft: 10}}>
                    <FinishButton />
                    </View>
                <View style={styles.indicatorContainer}>
                    <CalendarTimeLeft />
                    <RedAmberGreen />
                </View>
                </View>
            </View>
  );
}

const styles = StyleSheet.create({
    container:{ 
        justifyContent:"center",
        borderWidth:1,
        borderColor:"#FFFFFF",
        color:"white",
        height:100,
        borderRadius:5,
        width: 348,
        backgroundColor:"#141414",
        gap: 20,
    },
    taskItemContainer:{
        width: 300,
        padding:5,
        borderRadius:5,
        backgroundColor:"#000000",
        marginLeft: 10
    },
    buttonContainer:{
        flexDirection: "row",
        justifyContent: "space-between",
    },
    indicatorContainer: {
        flexDirection: "row",
        gap: 5,
        alignItems: "center",
        marginRight: 10
    }   
})