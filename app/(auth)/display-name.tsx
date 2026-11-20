import { Text, TextInput } from "@/components/shared";
import { updateProfile } from "@/services/user";
import { useUserStore } from "@/store/userStore";
import type { ApiError } from "@/utils/apiPayload";
import { showToast } from "@/utils/toast";
import { Ionicons } from "@expo/vector-icons";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useRouter } from "expo-router";
import { useState } from "react";
import { ActivityIndicator, Image, TouchableOpacity, View } from "react-native";

/** "Edit profile": saves first/last name via PATCH /users/me. */
export default function DisplayNameScreen() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const user = useUserStore((state) => state.user);
  const [firstName, setFirstName] = useState<string>(user?.first_name ?? "");
  const [lastName, setLastName] = useState<string>(user?.last_name ?? "");
  const valid = firstName.trim() !== "" && lastName.trim() !== "";

  const { mutate, isPending } = useMutation({
    mutationFn: () =>
      updateProfile({
        first_name: firstName.trim(),
        last_name: lastName.trim(),
      }),
    onSuccess: async (updated) => {
      const current = useUserStore.getState().user;
      if (current?.id && updated?.id === current.id)
        useUserStore.getState().setUser({ ...current, ...updated });
      await queryClient.invalidateQueries({ queryKey: ["user-me"] });
      showToast.success("Saved", "Your name has been updated.");
      router.back();
    },
    onError: (error: ApiError) =>
      showToast.error("Could not save", error.message),
  });

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
        This is the name people see when they find you nearby.
      </Text>

      <View className="bg-grey-50 h-16 rounded-xl justify-center px-6 mb-4 border border-grey-200">
        <TextInput
          placeholder="First name"
          placeholderTextColor="#9CA3AF"
          className="text-lg font-satoshi-regular text-black"
          value={firstName}
          onChangeText={setFirstName}
          autoFocus
        />
      </View>
      <View className="bg-grey-50 h-16 rounded-xl justify-center px-6 mb-8 border border-grey-200">
        <TextInput
          placeholder="Last name"
          placeholderTextColor="#9CA3AF"
          className="text-lg font-satoshi-regular text-black"
          value={lastName}
          onChangeText={setLastName}
        />
      </View>

      <TouchableOpacity
        className={`h-16 rounded-2xl justify-center items-center ${
          valid && !isPending ? "bg-purple-500" : "bg-purple-300"
        }`}
        onPress={() => mutate()}
        disabled={!valid || isPending}
      >
        {isPending ? (
          <ActivityIndicator size="small" color="#FFFFFF" />
        ) : (
          <Text className="text-white font-satoshi-bold text-lg">Save</Text>
        )}
      </TouchableOpacity>
    </View>
  );
}
