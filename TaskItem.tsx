import { View, Text } from "react-native";


export default function TaskItem({ title }: {title: string}) {
  console.log(title)
  return (
      <Text style={{color:"white"}}>{title}</Text>
  );
}