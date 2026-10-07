import { app } from "@repo/config/app";
import { StyleSheet, Text, View } from "react-native";

export default function Index() {
  return (
    <View style={styles.container}>
      <Text accessibilityRole="header" style={styles.title}>
        {app.name}
      </Text>
      <Text style={styles.body}>{app.description}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  body: { color: "#475569", fontSize: 16, textAlign: "center" },
  container: {
    alignItems: "center",
    flex: 1,
    gap: 8,
    justifyContent: "center",
    padding: 24,
  },
  title: { fontSize: 28, fontWeight: "600" },
});
