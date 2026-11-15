import { Text, TextInput } from "@/components/shared";
import { useAppState } from "@/store/appState";
import { useUserStore } from "@/store/userStore";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { useState } from "react";
import { Image, TouchableOpacity, View } from "react-native";

export default function DisplayNameScreen() {
  const router = useRouter();
  const [displayName, setDisplayName] = useState("");
  const { setOnboardingCompleted } = useAppState();
  const user = useUserStore((state) => state.user);
  const setUser = useUserStore((state) => state.setUser);

  const handleContinue = () => {
    if (displayName.trim()) {
      setUser({
        ...user,
        displayName,
        name: displayName,
      });
      setOnboardingCompleted(true);
      router.replace("/(tabs)/home");
    }
  };

  return (
    <View className="flex-1 bg-white px-6 pt-20">
      <View className="absolute inset-0 opacity-5">
        <Image
          source={require("../../assets/images/bg-mesh.png")}
          className="w-full h-full"
        />
      </View>

      <TouchableOpacity
        onPress={() => router.back()}
        className="w-12 h-12 bg-grey-50 rounded-full items-center justify-center mb-8 border border-grey-100"
      >
        <Ionicons name="arrow-back" size={18} color="#000" />
      </TouchableOpacity>

      <Text className="text-3xl font-satoshi-bold text-black mb-2">
        What&apos;s your name?
      </Text>
      <Text className="text-base font-satoshi-regular text-grey-500 mb-10 leading-6">
        Enter your full name so your friends and vendors can recognize you.
      </Text>

      <View className="bg-grey-50 h-16 rounded-xl justify-center px-6 mb-8 border border-grey-200">
        <TextInput
          placeholder="e.g. John Doe"
          placeholderTextColor="#9CA3AF"
          className="text-lg font-satoshi-regular text-black"
          value={displayName}
          onChangeText={setDisplayName}
          autoFocus
        />
      </View>

      <TouchableOpacity
        className={`h-16 rounded-2xl justify-center items-center ${
          displayName.trim() ? "bg-purple-500" : "bg-purple-300"
        }`}
        onPress={handleContinue}
        disabled={!displayName.trim()}
      >
        <Text className="text-white font-satoshi-bold text-lg">Continue</Text>
      </TouchableOpacity>
    </View>
  );
}
