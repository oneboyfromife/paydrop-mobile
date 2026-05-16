import ScreenView from "@/components/layout/ScreenView";
import { requestOtp } from "@/services/auth";
import { showToast } from "@/utils/toast";
import { Ionicons } from "@expo/vector-icons";
import { useMutation } from "@tanstack/react-query";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Image,
  Keyboard,
  KeyboardAvoidingView,
  Modal,
  Platform,
  ScrollView,
  Text,
  TextInput,
  TouchableOpacity,
  TouchableWithoutFeedback,
  View,
} from "react-native";

export default function KYCScreen() {
  const router = useRouter();
  const params = useLocalSearchParams();
  const getParam = (value: string | string[] | undefined) =>
    Array.isArray(value) ? value[0] : value;

  const phone = getParam(params.phone);
  const firstName = getParam(params.firstName);
  const lastName = getParam(params.lastName);
  const email = getParam(params.email);
  const username = getParam(params.username);

  const [bvn, setBvn] = useState("");
  const [dob, setDob] = useState("");

  const handleDobChange = (text: string) => {
    // Remove all non-digits
    const cleaned = text.replace(/\D/g, "");
    
    // Format as YYYY-MM-DD
    let formatted = cleaned;
    if (cleaned.length > 4) {
      formatted = `${cleaned.slice(0, 4)}-${cleaned.slice(4)}`;
    }
    if (cleaned.length > 6) {
      formatted = `${cleaned.slice(0, 4)}-${cleaned.slice(4, 6)}-${cleaned.slice(6, 8)}`;
    }
    
    setDob(formatted);
  };

  const isFormValid = bvn.trim().length === 11 && dob.length === 10;

  const { mutate, isPending, isError, isSuccess } = useMutation({
    mutationFn: async () => await requestOtp("signup", phone as string),
    mutationKey: ["REGISTER", phone],
    onError: (error: any) => {
      showToast.error(
        "Verification Failed",
        error?.message || "Something went wrong. Please try again.",
      );
    },
  });

  const handleSubmit = () => {
    if (isFormValid) {
      mutate();
    }
  };

  useEffect(() => {
    if (isSuccess) {
      router.push({
        pathname: "/otp",
        params: {
          phone,
          mode: "signup",
          firstName,
          lastName,
          email,
          username,
          bvn,
          dob,
        },
      });
    }
  }, [isSuccess]);

  // Remove existing useEffect error handling since we use onError in mutation

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

              <TouchableOpacity
                onPress={() => router.back()}
                className="w-12 h-12 bg-grey-50 rounded-full items-center justify-center mb-8 border border-grey-100"
              >
                <Ionicons name="arrow-back" size={18} color="#000" />
              </TouchableOpacity>
              <Text className="text-4xl font-clash-semibold text-black mb-2 ">
                KYC Verification
              </Text>
              <Text className="text-base font-clash-regular text-grey-500 mb-10 leading-6">
                Please provide your BVN and Date of Birth to complete
                registration.
              </Text>

              <View className="bg-grey-50 h-16 rounded-xl flex-row items-center px-6 mb-4 border border-grey-200">
                <TextInput
                  placeholder="BVN (11 digits)"
                  placeholderTextColor="#9CA3AF"
                  keyboardType="number-pad"
                  maxLength={11}
                  className="flex-1 h-full font-clash-regular text-black"
                  value={bvn}
                  onChangeText={setBvn}
                />
              </View>

              <View className="bg-grey-50 h-16 rounded-xl flex-row items-center px-6 mb-4 border border-grey-200">
                <TextInput
                  placeholder="Date of Birth (YYYY-MM-DD)"
                  placeholderTextColor="#9CA3AF"
                  keyboardType="number-pad"
                  maxLength={10}
                  className="flex-1 h-full font-clash-regular text-black"
                  value={dob}
                  onChangeText={handleDobChange}
                />
              </View>

              <TouchableOpacity
                activeOpacity={0.6}
                className={`h-16 rounded-2xl justify-center items-center mt-6 ${
                  isFormValid ? "bg-purple-500" : "bg-purple-300"
                }`}
                onPress={handleSubmit}
                disabled={!isFormValid || isPending}
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
                onPress={() => router.back()}
              >
                <Text className="text-purple-500 font-clash-semibold">
                  Back
                </Text>
              </TouchableOpacity>
            </View>
          </ScrollView>
        </TouchableWithoutFeedback>
      </KeyboardAvoidingView>
    </ScreenView>
  );
}
