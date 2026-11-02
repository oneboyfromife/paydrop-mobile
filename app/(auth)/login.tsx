import ScreenView from "@/components/layout/ScreenView";
import { Text, TextInput } from "@/components/shared";
import { requestOtp } from "@/services/auth";
import size from "@/utils/size";
import { showToast } from "@/utils/toast";
import { useMutation } from "@tanstack/react-query";
import { useRouter } from "expo-router";
import { useState } from "react";

import {
  ActivityIndicator,
  Image,
  Keyboard,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
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
    <ScreenView hasSafeArea={false}>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        keyboardVerticalOffset={Platform.OS === "ios" ? 40 : 0}
      >
        <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
          <ScrollView
            contentContainerStyle={{
              flexGrow: 1,

              paddingBottom: 32,
            }}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
          >
            <View className="flex-1">
              <Image
                source={require("../../assets/images/def.png")}
                style={{
                  width: "100%",
                  height: size.height(400),
                  borderBottomLeftRadius: size.width(30),
                  borderBottomRightRadius: size.width(30),
                }}
                // imageStyle={{ tintColor: "#6C63FF", opacity: 0.18 }}
                resizeMode="cover"
                accessible={false}
              />

              <View className="flex-1 px-6 pt-8">
                {/* <Text className="text-4xl font-satoshi-bold text-black mb-2 ">
                  Login
                </Text>
                <Text className="text-base font-satoshi-regular text-grey-500 mb-10 leading-6">
                  Enter your phone number to receive a one-time login code.
                </Text> */}
                <Text className="font-satoshi-regular mb-3 text-neutral-500">
                  Phone Number
                </Text>
                <View className="bg-neutral-100 h-16 rounded-full flex-row items-center px-6 mb-3 border border-neutral-100">
                  <Text className="text-lg font-satoshi-medium mr-4">+234</Text>
                  <View className="w-[1px] h-8 bg-grey-300 mr-4" />
                  <TextInput
                    placeholder="812 345 6789"
                    placeholderTextColor="#9CA3AF"
                    keyboardType="phone-pad"
                    maxLength={10}
                    className="flex-1 h-full font-satoshi-regular text-black"
                    value={phone}
                    onChangeText={(text) => setPhone(text.replace(/\D/g, ""))}
                  />
                </View>

                <TouchableOpacity
                  className={`h-16 rounded-full justify-center items-center ${
                    phone.length === 10 && !isPending
                      ? "bg-purple-500"
                      : "bg-purple-300"
                  }`}
                  onPress={handleSubmit}
                  disabled={phone.length !== 10 || isPending}
                >
                  {isPending ? (
                    <ActivityIndicator size="small" color="#FFFFFF" />
                  ) : (
                    <Text className="text-white font-satoshi-medium text-lg">
                      Continue
                    </Text>
                  )}
                </TouchableOpacity>

                <TouchableOpacity
                  className="mt-4 items-center"
                  onPress={() => router.push("/(auth)/register")}
                >
                  <Text className="font-satoshi-medium text-neutral-400">
                    Need to register?{" "}
                    <Text className="text-purple-500 underline ">
                      Create account
                    </Text>
                  </Text>
                </TouchableOpacity>
              </View>
            </View>
          </ScrollView>
        </TouchableWithoutFeedback>
      </KeyboardAvoidingView>
    </ScreenView>
  );
}
