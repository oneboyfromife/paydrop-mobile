import "react-native-gesture-handler";
import FontAwesome from "@expo/vector-icons/FontAwesome";

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useFonts } from "expo-font";
import { Stack } from "expo-router";
import * as SplashScreen from "expo-splash-screen";
import { StatusBar } from "expo-status-bar";
import { useEffect } from "react";

import "react-native-reanimated";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { Toaster } from "sonner-native";
import "../global.css";

const queryClient = new QueryClient();

export {
  // Catch any errors thrown by the Layout component.
  ErrorBoundary,
} from "expo-router";

export const unstable_settings = {
  // Ensure that reloading on `/modal` keeps a back button present.
  initialRouteName: "index",
};

// Prevent the splash screen from auto-hiding before asset loading is complete.
SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  const [loaded, error] = useFonts({
    SpaceMono: require("../assets/fonts/SpaceMono-Regular.ttf"),
    "ClashDisplay-Bold": require("../assets/fonts/clash-display/ClashDisplay-Bold.ttf"),
    "ClashDisplay-Extralight": require("../assets/fonts/clash-display/ClashDisplay-Extralight.ttf"),
    "ClashDisplay-Light": require("../assets/fonts/clash-display/ClashDisplay-Light.ttf"),
    "ClashDisplay-Medium": require("../assets/fonts/clash-display/ClashDisplay-Medium.ttf"),
    "ClashDisplay-Regular": require("../assets/fonts/clash-display/ClashDisplay-Regular.ttf"),
    "ClashDisplay-Semibold": require("../assets/fonts/clash-display/ClashDisplay-Semibold.ttf"),
    ...FontAwesome.font,
  });

  // Expo Router uses Error Boundaries to catch errors in the navigation tree.
  useEffect(() => {
    if (error) throw error;
  }, [error]);

  useEffect(() => {
    if (loaded) {
      SplashScreen.hideAsync();
    }
  }, [loaded]);

  if (!loaded) {
    return null;
  }

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <QueryClientProvider client={queryClient}>
        <Toaster />
        <StatusBar backgroundColor="#fff" />
        <RootLayoutNav />
      </QueryClientProvider>
    </GestureHandlerRootView>
  );
}

function RootLayoutNav() {
  return (
    <Stack
      screenOptions={{
        contentStyle: {
          backgroundColor: "#ffffff",
        },
        headerStyle: {
          backgroundColor: "#ffffff",
        },
      }}
    >
      <Stack.Screen name="index" options={{ headerShown: false }} />
      <Stack.Screen name="(auth)" options={{ headerShown: false }} />
      <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
      <Stack.Screen name="screens" options={{ headerShown: false }} />
      <Stack.Screen name="modal" options={{ presentation: "modal" }} />
    </Stack>
  );
}
