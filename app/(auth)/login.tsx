import ScreenView from "@/components/layout/ScreenView";
import { requestOtp } from "@/services/auth";
import { showToast } from "@/utils/toast";
import { useMutation } from "@tanstack/react-query";
import { useRouter } from "expo-router";
import { useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Image,
  Keyboard,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Text,
  TextInput,
  TouchableOpacity,
  TouchableWithoutFeedback,
  View,
} from "react-native";

export default function LoginScreen() {
  const router = useRouter();
  const [phone, setPhone] = useState("");

  const { mutate, isPending } = useMutation({
    mutationFn: (formattedPhone: string) => requestOtp("login", formattedPhone),
    onSuccess: (_, formattedPhone) => {
      router.push({
        pathname: "./otp",
        params: {
          phone: formattedPhone,
          mode: "login",
        },
      });
    },
    onError: (error: any) => {
      console.error("API error", error);
      showToast.error(
        "Login Failed",
        error?.message || "Something went wrong. Please try again.",
      );
    },
  });

  const handleSubmit = () => {
    const formattedPhone = phone.startsWith("0") ? phone : `0${phone}`;
    mutate(formattedPhone);
  };

  return (
    <ScreenView>
      <KeyboardAvoidingView
        style={{ flex: 1, backgroundColor: "white" }}
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        keyboardVerticalOffset={Platform.OS === "ios" ? 40 : 0}
      >
        <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
          <ScrollView
            contentContainerStyle={{
              flexGrow: 1,
              paddingTop: 20,
              paddingHorizontal: 24,
              paddingBottom: 32,
              backgroundColor: "white",
            }}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
          >
            <View className="flex-1 bg-white">
              <View className="absolute inset-0 opacity-5">
                <Image
                  source={require("../../assets/images/bg-mesh.png")}
                  className="w-full h-full"
                />
              </View>

              <Image
                source={require("../../assets/images/paydrop-icon-2.png")}
                className="size-16 mt-10 mb-4"
              />
              <Text className="text-4xl font-clash-semibold text-black mb-2 ">
                Login
              </Text>
              <Text className="text-base font-clash-regular text-grey-500 mb-10 leading-6">
                Enter your phone number to receive a one-time login code.
              </Text>

              <View className="bg-grey-50 h-16 rounded-xl flex-row items-center px-6 mb-6 border border-grey-200">
                <Text className="text-lg font-clash-medium mr-4">+234</Text>
                <View className="w-[1px] h-8 bg-grey-300 mr-4" />
                <TextInput
                  placeholder="812 345 6789"
                  placeholderTextColor="#9CA3AF"
                  keyboardType="phone-pad"
                  maxLength={10}
                  className="flex-1 h-full font-clash-regular text-black"
                  value={phone}
                  onChangeText={(text) => setPhone(text.replace(/\D/g, ""))}
                />
              </View>

              <TouchableOpacity
                className={`h-16 rounded-2xl justify-center items-center ${
                  phone.length === 10 && !isPending ? "bg-purple-500" : "bg-purple-300"
                }`}
                onPress={handleSubmit}
                disabled={phone.length !== 10 || isPending}
              >
                {isPending ? (
                  <ActivityIndicator size="small" color="#FFFFFF" />
                ) : (
                  <Text className="text-white font-clash-bold text-lg">
                    Continue
                  </Text>
                )}
              </TouchableOpacity>

              <TouchableOpacity
                className="mt-4 items-center"
                onPress={() => router.push("/(auth)/register")}
              >
                <Text className="text-purple-500 font-clash-semibold">
                  Need to register? Create account
                </Text>
              </TouchableOpacity>
            </View>
          </ScrollView>
        </TouchableWithoutFeedback>
      </KeyboardAvoidingView>
    </ScreenView>
  );
}
