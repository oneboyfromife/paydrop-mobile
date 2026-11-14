import { Text, TextInput } from "@/components/shared";
import ScreenView from "@/components/layout/ScreenView";
import { requestOtp, verifyOtp } from "@/services/auth";
import { showToast } from "@/utils/toast";
import { useAppState } from "@/store/appState";
import { useUserStore } from "@/store/userStore";
import { Ionicons } from "@expo/vector-icons";
import { useMutation } from "@tanstack/react-query";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useRef, useState } from "react";
import {
  Alert,
  Image,
  Keyboard,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  TouchableOpacity,
  TouchableWithoutFeedback,
  View,
} from "react-native";

export default function OTPScreen() {
  const router = useRouter();
  const params = useLocalSearchParams();
  const getParam = (value: string | string[] | undefined) =>
    Array.isArray(value) ? value[0] : value;
  const phone = getParam(params.phone);
  const mode = getParam(params.mode) || "signup";
  const firstName = getParam(params.firstName);
  const lastName = getParam(params.lastName);
  const email = getParam(params.email);
  const username = getParam(params.username);
  const bvn = getParam(params.bvn);
  const dob = getParam(params.dob);
  const avatarUrl = getParam(params.avatarUrl);
  const isLoginMode = mode === "login";

  ///...
  const setTokens = useUserStore((state) => state.setTokens);
  const setUser = useUserStore((state) => state.setUser);
  const setOnboardingCompleted = useAppState(
    (state) => state.setOnboardingCompleted,
  );

  ///...
  const [otp, setOtp] = useState(["", "", "", "", "", ""]);
  const inputRefs = useRef<Array<TextInput | null>>([]);

  const { mutate: verifyMutate, isPending: isVerifying } = useMutation({
    mutationFn: async (data: any) => await verifyOtp(data),
    onSuccess: (data) => {
      // Robust extraction for different API response formats
      const accessToken =
        data?.access_token ||
        data?.accessToken ||
        data?.token ||
        data?.data?.token ||
        data?.data?.accessToken ||
        data?.data?.access_token;

      const refreshToken =
        data?.refresh_token ||
        data?.refreshToken ||
        data?.refresh ||
        data?.data?.refreshToken ||
        data?.data?.refresh_token;

      const resolvedUser = data?.user || data?.data?.user || data?.data;

      if (
        typeof accessToken !== "string" ||
        typeof resolvedUser?.id !== "string"
      ) {
        showToast.error(
          "Verification Failed",
          "The server returned an incomplete session. Please try again.",
        );
        return;
      }
      setTokens(
        accessToken,
        typeof refreshToken === "string" ? refreshToken : null,
      );
      setUser(resolvedUser);

      setOnboardingCompleted(true);
      router.replace("/(tabs)/home");
    },
    onError: (error: any) => {
      showToast.error(
        "Verification Failed",
        error?.message || "Invalid code. Please try again.",
      );
    },
  });

  const { mutate: resendMutate, isPending: isResending } = useMutation({
    mutationFn: async () => await requestOtp(mode as string, phone as string),
    onSuccess: () => {
      showToast.success("Success", "OTP has been resent to your phone.");
    },
    onError: () => {
      showToast.error("Error", "Failed to resend OTP. Please try again.");
    },
  });

  const handleOtpChange = (value: string, index: number) => {
    const newOtp = [...otp];
    newOtp[index] = value;
    setOtp(newOtp);
    if (value && index < 5) {
      inputRefs.current[index + 1]?.focus();
    }
  };

  const handleKeyPress = (e: any, index: number) => {
    if (e.nativeEvent.key === "Backspace" && !otp[index] && index > 0) {
      inputRefs.current[index - 1]?.focus();
    }
  };

  const handleVerify = () => {
    ///temp bypass....
    // setOnboardingCompleted(true);
    // router.replace("/(tabs)/home");
    // return;

    const otpValue = otp.join("");
    if (otpValue.length < 6) {
      showToast.error("Error", "Please enter the complete 6-digit code");
      return;
    }

    const requestData: any = {
      phone,
      otp: otpValue,
      intent: mode,
    };

    if (!isLoginMode) {
      requestData.first_name = firstName;
      requestData.last_name = lastName;
      requestData.email = email;
      requestData.username = username;
      requestData.bvn = bvn;
      requestData.dob = dob;
      requestData.avatar_url = avatarUrl;
    }

    verifyMutate(requestData);
  };

  const handleResend = () => {
    if (isResending) return;
    resendMutate();
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
              paddingBottom: 24,
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

              <Text className="text-3xl font-satoshi-bold text-black mb-2">
                Verify Code
              </Text>
              <Text className="text-base font-satoshi-regular text-grey-500 mb-10 leading-6">
                Enter the 6-digit code sent to your phone number.
              </Text>

              <View className="flex-row justify-between mb-10 gap-4">
                {otp.map((digit, index) => (
                  <View
                    key={index}
                    className={`flex-1 h-16 bg-grey-50 rounded-xl border ${
                      digit ? "border-purple-500" : "border-grey-200"
                    } items-center justify-center`}
                  >
                    <TextInput
                      ref={(ref) => {
                        inputRefs.current[index] = ref;
                      }}
                      className="text-2xl font-satoshi-bold text-black text-center w-full h-full"
                      keyboardType="number-pad"
                      maxLength={1}
                      value={digit}
                      onChangeText={(value) => handleOtpChange(value, index)}
                      onKeyPress={(e) => handleKeyPress(e, index)}
                      autoFocus={index === 0}
                    />
                  </View>
                ))}
              </View>

              <TouchableOpacity
                className={`h-16 rounded-2xl justify-center items-center mb-6 ${
                  isVerifying ? "bg-purple-300" : "bg-purple-500"
                }`}
                onPress={handleVerify}
                disabled={isVerifying}
              >
                <Text className="text-white font-satoshi-bold text-lg">
                  {isVerifying ? "Verifying..." : "Verify & Continue"}
                </Text>
              </TouchableOpacity>

              <View className="flex-row justify-center">
                <Text className="text-grey-500 font-satoshi-regular text-base">
                  Didn&apos;t receive the code?{" "}
                </Text>
                <TouchableOpacity onPress={handleResend}>
                  <Text className="text-purple-500 font-satoshi-bold text-base">
                    Resend
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
