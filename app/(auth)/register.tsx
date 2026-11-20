import ScreenView from "@/components/layout/ScreenView";
import { Text, TextInput } from "@/components/shared";
import { checkAvailability, requestOtp } from "@/services/auth";
import type { ApiError } from "@/utils/apiPayload";
import { showToast } from "@/utils/toast";
import { useMutation } from "@tanstack/react-query";
import { useRouter } from "expo-router";
import { useState } from "react";
import {
  ActivityIndicator,
  Keyboard,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  TouchableOpacity,
  TouchableWithoutFeedback,
  View,
} from "react-native";

const USERNAME_RE = /^[a-z0-9_.]{3,20}$/;
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
type Field = "phone" | "email" | "username";

export default function PhoneScreen() {
  const router = useRouter();
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [username, setUsername] = useState("");
  const [phone, setPhone] = useState("");
  const [errors, setErrors] = useState<Partial<Record<Field, string>>>({});

  const trimmedEmail = email.trim().toLowerCase();
  const isFormValid =
    phone.length === 10 &&
    firstName.trim() !== "" &&
    lastName.trim() !== "" &&
    USERNAME_RE.test(username) &&
    (trimmedEmail === "" || EMAIL_RE.test(trimmedEmail));

  const { mutate, isPending } = useMutation({
    mutationFn: async () => {
      const formattedPhone = `0${phone}`;
      const availability = await checkAvailability({
        phone: formattedPhone,
        username,
        ...(trimmedEmail ? { email: trimmedEmail } : {}),
      });
      const problems: Partial<Record<Field, string>> = {};
      if (availability.phone === "taken")
        problems.phone = "This number already has an account. Log in instead.";
      else if (availability.phone === "invalid")
        problems.phone = "Enter a valid Nigerian mobile number.";
      if (availability.username === "taken")
        problems.username = "That username is taken.";
      else if (availability.username === "invalid")
        problems.username = "3-20 characters: a-z, 0-9, underscore or dot.";
      if (trimmedEmail && availability.email === "taken")
        problems.email = "That email is already in use.";
      else if (trimmedEmail && availability.email === "invalid")
        problems.email = "Enter a valid email address.";
      if (Object.keys(problems).length) return { problems };
      const { resendAfter } = await requestOtp("signup", formattedPhone);
      return { formattedPhone, resendAfter };
    },
    onSuccess: (result) => {
      if ("problems" in result) {
        setErrors(result.problems ?? {});
        return;
      }
      router.push({
        pathname: "/otp",
        params: {
          phone: result.formattedPhone,
          mode: "signup",
          firstName: firstName.trim(),
          lastName: lastName.trim(),
          username,
          email: trimmedEmail,
          resendAfter: String(result.resendAfter),
        },
      });
    },
    onError: (error: ApiError) => {
      if (error.code === "ACCOUNT_EXISTS") {
        setErrors({ phone: error.message });
        return;
      }
      showToast.error("Could not continue", error.message);
    },
  });

  const handleSubmit = () => {
    setErrors({});
    if (isFormValid && !isPending) mutate();
  };

  const fieldError = (field: Field) =>
    errors[field] ? (
      <Text className="text-red-600 font-satoshi-regular text-xs -mt-2 mb-3 ml-2">
        {errors[field]}
      </Text>
    ) : null;

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
              <Text className="text-3xl font-satoshi-bold text-black mb-2 ">
                Register
              </Text>
              <Text className="text-base font-satoshi-regular text-grey-500 mb-10 leading-6">
                Create an account with your phone number and name. Email is optional.
              </Text>

              <View className="bg-grey-50 h-16 rounded-xl flex-row items-center px-6 mb-4 border border-grey-200">
                <TextInput
                  placeholder="First Name"
                  placeholderTextColor="#9CA3AF"
                  className="flex-1 h-full font-satoshi-regular text-black"
                  value={firstName}
                  onChangeText={setFirstName}
                />
              </View>

              <View className="bg-grey-50 h-16 rounded-xl flex-row items-center px-6 mb-4 border border-grey-200">
                <TextInput
                  placeholder="Last Name"
                  placeholderTextColor="#9CA3AF"
                  className="flex-1 h-full font-satoshi-regular text-black"
                  value={lastName}
                  onChangeText={setLastName}
                />
              </View>

              <View className="bg-grey-50 h-16 rounded-xl flex-row items-center px-6 mb-4 border border-grey-200">
                <TextInput
                  placeholder="Email Address (optional)"
                  placeholderTextColor="#9CA3AF"
                  autoCorrect={false}
                  keyboardType="email-address"
                  autoCapitalize="none"
                  className="flex-1 h-full font-satoshi-regular text-black"
                  value={email}
                  onChangeText={setEmail}
                />
              </View>
              {fieldError("email")}

              <View className="bg-grey-50 h-16 rounded-xl flex-row items-center px-6 mb-4 border border-grey-200">
                <TextInput
                  placeholder="Username"
                  placeholderTextColor="#9CA3AF"
                  autoCorrect={false}
                  autoCapitalize="none"
                  className="flex-1 h-full font-satoshi-regular text-black"
                  value={username}
                  maxLength={20}
                  onChangeText={(text) =>
                    setUsername(text.toLowerCase().replace(/[^a-z0-9_.]/g, ""))
                  }
                />
              </View>
              {fieldError("username")}

              <View className="bg-grey-50 h-16 rounded-xl flex-row items-center px-6 mb-4 border border-grey-200">
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
              {fieldError("phone")}

              <TouchableOpacity
                activeOpacity={0.6}
                className={`h-16 rounded-2xl justify-center items-center ${
                  isFormValid && !isPending ? "bg-purple-500" : "bg-purple-300"
                }`}
                onPress={handleSubmit}
                disabled={!isFormValid || isPending}
              >
                {isPending ? (
                  <ActivityIndicator size="small" color="#FFFFFF" />
                ) : (
                  <Text className="text-white font-satoshi-bold text-lg">
                    Continue
                  </Text>
                )}
              </TouchableOpacity>

              <TouchableOpacity
                className="mt-4 items-center"
                onPress={() => router.push({ pathname: "./login" })}
              >
                <Text className="text-purple-500 font-satoshi-bold">
                  Already have an account? Login
                </Text>
              </TouchableOpacity>
            </View>
          </ScrollView>
        </TouchableWithoutFeedback>
      </KeyboardAvoidingView>
    </ScreenView>
  );
}
