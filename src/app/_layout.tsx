import { DarkTheme, DefaultTheme, Stack, ThemeProvider } from "expo-router";
import { useColorScheme } from "react-native";
import { GestureHandlerRootView } from "react-native-gesture-handler";

import { AnimatedSplashOverlay } from "@/components/animated-icon";
import { DatabaseProvider } from "@/db/DatabaseProvider";
import { SecurityGate } from "@/features/security/SecurityGate";

export default function RootLayout() {
  const colorScheme = useColorScheme();

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <ThemeProvider value={colorScheme === "dark" ? DarkTheme : DefaultTheme}>
        <DatabaseProvider>
          <AnimatedSplashOverlay />
          <SecurityGate>
            <Stack
              screenOptions={{
                headerShown: false,
                contentStyle: { backgroundColor: "#07111F" },
              }}
            >
              <Stack.Screen name="index" />
              <Stack.Screen
                name="add/index"
                options={{ presentation: "modal" }}
              />
              <Stack.Screen name="card/[id]" />
              <Stack.Screen name="card/[id]/edit" />
              <Stack.Screen name="settings" />
            </Stack>
          </SecurityGate>
        </DatabaseProvider>
      </ThemeProvider>
    </GestureHandlerRootView>
  );
}
