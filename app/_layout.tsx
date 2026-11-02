import { Text } from "@/components/shared";
import "react-native-gesture-handler";
import FontAwesome from "@expo/vector-icons/FontAwesome";

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useFonts } from "expo-font";
import { Stack } from "expo-router";
import * as SplashScreen from "expo-splash-screen";
import { StatusBar } from "expo-status-bar";
import { useEffect } from "react";
import { ActivityIndicator, TouchableOpacity, View } from "react-native";
import TransferRuntime from "@/components/TransferRuntime";
import { hydrateUserSession, useUserStore } from "@/store/userStore";

import "react-native-reanimated";
import { GestureHandlerRootView } from "react-native-gesture-handler";
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
  const hasHydrated = useUserStore((state) => state.hasHydrated);
  const storageError = useUserStore((state) => state.storageError);
  useEffect(() => {
    void hydrateUserSession();
  }, []);
  const [loaded, error] = useFonts({
    SpaceMono: require("../assets/fonts/SpaceMono-Regular.ttf"),
    "Satoshi-Light": require("../assets/fonts/satoshi/Satoshi-Light.ttf"),
    "Satoshi-Regular": require("../assets/fonts/satoshi/Satoshi-Regular.ttf"),
    "Satoshi-Medium": require("../assets/fonts/satoshi/Satoshi-Medium.ttf"),
    "Satoshi-Bold": require("../assets/fonts/satoshi/Satoshi-Bold.ttf"),
    "Satoshi-Black": require("../assets/fonts/satoshi/Satoshi-Black.ttf"),
    "Satoshi-Italic": require("../assets/fonts/satoshi/Satoshi-Italic.ttf"),
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

  if (!hasHydrated)
    return (
      <View
        style={{
          flex: 1,
          justifyContent: "center",
          alignItems: "center",
          padding: 24,
          backgroundColor: "white",
        }}
      >
        {storageError ? (
          <>
            <Text>{storageError}</Text>
            <TouchableOpacity
              onPress={() => {
                void hydrateUserSession();
              }}
              style={{ padding: 20 }}
            >
              <Text>Retry</Text>
            </TouchableOpacity>
          </>
        ) : (
          <ActivityIndicator color="#A855F7" />
        )}
      </View>
    );

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <QueryClientProvider client={queryClient}>
        <TransferRuntime />
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
        headerTitleStyle: { fontFamily: "Satoshi-Bold" },
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
