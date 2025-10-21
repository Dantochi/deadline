import { View, StyleSheet} from "react-native";
import TaskItem from "./TaskItem";
import FinishButton from "./FinishButton"; 
import RedAmberGreen from "./RedAmberGreen";    
import CalendarTimeLeft from "./CalendarTimeLeft";
import Data from "./data";



export default function TaskList() {
    const data = Data

const homeView = data.map(function(item){
    return <View style={styles.container}>
                <View style={styles.taskItemContainer}><TaskItem title={item.title}/></View>
                <View style={styles.buttonContainer}>
                    <View style={{marginLeft: 10}}>
                    <FinishButton isCompleted={item.isCompleted}/>
                    </View>
                <View style={styles.indicatorContainer}>
                    <CalendarTimeLeft dueDate={item.dueDate}/>
                    <RedAmberGreen />
                </View>
                </View>
            </View>
})
  return (
        homeView
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