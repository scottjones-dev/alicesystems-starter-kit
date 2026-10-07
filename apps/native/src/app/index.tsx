import { app } from "@repo/config/app";
import { Text, View } from "react-native";

export default function Index() {
  return (
    <View className="flex-1 items-center justify-center gap-2 bg-background p-6">
      <Text
        accessibilityRole="header"
        className="font-semibold text-3xl text-foreground"
      >
        {app.name}
      </Text>
      <Text className="text-center text-base text-muted-foreground">
        {app.description}
      </Text>
    </View>
  );
}
