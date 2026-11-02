import { Alert } from "react-native";

export const showToast = {
  success: (message: string, description?: string) => {
    Alert.alert(message, description);
  },
  error: (message: string, description?: string) => {
    Alert.alert(message, description);
  },
  info: (message: string, description?: string) => {
    Alert.alert(message, description);
  },
  loading: (message: string, description?: string) => {
    // Alert doesn't have a loading state, we just show the message
    console.log("Loading toast:", message, description);
    return "loading-id";
  },
  dismiss: (id?: string | number) => {
    // No-op for Alert
  },
};
