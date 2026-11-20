import { Text, TextInput } from "@/components/shared";
import ScreenView from "@/components/layout/ScreenView";
import { startSession } from "@/lib/session";
import { requestOtp, verifyOtp, type OtpIntent } from "@/services/auth";
import type { ApiError } from "@/utils/apiPayload";
import { showToast } from "@/utils/toast";
import { Ionicons } from "@expo/vector-icons";
import { useMutation } from "@tanstack/react-query";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useEffect, useRef, useState } from "react";
import {
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
  const phone = getParam(params.phone) ?? "";
  const mode: OtpIntent = getParam(params.mode) === "login" ? "login" : "signup";
  const firstName = getParam(params.firstName);
  const lastName = getParam(params.lastName);
  const email = getParam(params.email);
  const username = getParam(params.username);
  const isLoginMode = mode === "login";

  const [otp, setOtp] = useState(["", "", "", "", "", ""]);
  const inputRefs = useRef<Array<TextInput | null>>([]);
  const [resendAt, setResendAt] = useState(
    () => Date.now() + Number(getParam(params.resendAfter) ?? 60) * 1000,
  );
  const [now, setNow] = useState(Date.now());
  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(timer);
  }, []);
  const resendIn = Math.max(0, Math.ceil((resendAt - now) / 1000));

  const { mutate: verifyMutate, isPending: isVerifying } = useMutation({
    mutationFn: verifyOtp,
    onSuccess: (session) => {
      startSession(session);
      router.replace("/(tabs)/home");
    },
    onError: (error: ApiError) => {
      if (error.code === "USERNAME_TAKEN" || error.code === "EMAIL_TAKEN") {
        showToast.error("Update your details", error.message);
        router.back();
        return;
      }
      if (error.code === "OTP_EXPIRED") setOtp(["", "", "", "", "", ""]);
      showToast.error("Verification Failed", error.message);
    },
  });

  const { mutate: resendMutate, isPending: isResending } = useMutation({
    mutationFn: () => requestOtp(mode, phone),
    onSuccess: ({ resendAfter }) => {
      setResendAt(Date.now() + resendAfter * 1000);
      showToast.success("Code sent", "A new code is on its way.");
    },
    onError: (error: ApiError) => {
      const retryAfter = Number(error.details.retry_after);
      if (Number.isFinite(retryAfter) && retryAfter > 0)
        setResendAt(Date.now() + retryAfter * 1000);
      showToast.error("Could not resend", error.message);
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
    const otpValue = otp.join("");
    if (otpValue.length < 6) {
      showToast.error("Error", "Please enter the complete 6-digit code");
      return;
    }

    verifyMutate({
      intent: mode,
      phone,
      otp: otpValue,
      ...(isLoginMode
        ? {}
        : {
            first_name: firstName,
            last_name: lastName,
            username,
            ...(email ? { email } : {}),
          }),
    });
  };

  const handleResend = () => {
    if (isResending || resendIn > 0) return;
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
                <TouchableOpacity
                  onPress={handleResend}
                  disabled={isResending || resendIn > 0}
                >
                  <Text
                    className={`font-satoshi-bold text-base ${resendIn > 0 ? "text-grey-400" : "text-purple-500"}`}
                  >
                    {resendIn > 0 ? `Resend in ${resendIn}s` : "Resend"}
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
