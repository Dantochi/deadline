import { View, Text, StyleSheet } from "react-native";
import { getUrgencyColor } from "@/utils/GetUrgencyColor";

function formatDate(dateString: string): string {
  const date = new Date(dateString);
  // The Intl object in JavaScript is the namespace for the ECMAScript Internationalization API.
  // It provides language- and culture-sensitive functionalities like formatting dates, numbers, currencies,
  // and comparing strings according to locale-specific rules.
  // Intl contains constructors like Intl.DateTimeFormat, Intl.NumberFormat, and Intl.Collator, among others.
  const options: Intl.DateTimeFormatOptions = {
    month: "short",
    day: "numeric",
  };
  return date.toLocaleDateString("en-US", options);
}

export default function Task({
  item,
}: {
  item: {
    id: string;
    name: string;
    date: string;
  };
}) {
  const urgencyColor = getUrgencyColor(item.date);
  const formattedDate = formatDate(item.date);
  return (
    <View style={styles.container}>
      <View style={styles.leftSection}>
        <View style={styles.textContainer}>
          <Text style={styles.taskText}>{item.name}</Text>
          <Text style={styles.dateText}>{formattedDate}</Text>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: 15,
    marginHorizontal: 10, // This is shorthand for margin left and margin right
    marginTop: 10,
    borderRadius: 8,
    backgroundColor: "#2C2C2E",
    flexDirection: "row",
    alignItems: "center",
  },
  taskText: {
    fontSize: 16,
    color: "#000000",
    fontWeight: 500,
  },
  leftSection: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
  },
  colorCircle: {
    width: 12,
    height: 12,
    borderRadius: 6,
    marginRight: 12,
  },
  textContainer: {
    flex: 1,
  },
  dateText: {
    fontSize: 14,
    color: "#A0A0A0",
    marginTop: 4,
  },
});
