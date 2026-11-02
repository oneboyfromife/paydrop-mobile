import * as SecureStore from "expo-secure-store";
import { Platform } from "react-native";

const volatile = new Map<string, string>();
let writes: Promise<void> = Promise.resolve();
export const secureStorage = {
  async get(key: string) {
    await writes.catch(() => {});
    return Platform.OS === "web"
      ? (volatile.get(key) ?? null)
      : SecureStore.getItemAsync(key);
  },
  set(key: string, value: string | null) {
    const write = writes
      .catch(() => {})
      .then(async () => {
        if (Platform.OS === "web") {
          if (value === null) volatile.delete(key);
          else volatile.set(key, value);
          return;
        }
        if (value === null) await SecureStore.deleteItemAsync(key);
        else
          await SecureStore.setItemAsync(key, value, {
            keychainAccessible: SecureStore.WHEN_UNLOCKED_THIS_DEVICE_ONLY,
          });
      });
    writes = write;
    return write;
  },
};
