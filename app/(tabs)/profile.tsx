import { Text } from "@/components/shared";
import ScreenView from "@/components/layout/ScreenView";
import { endSession } from "@/lib/session";
import { getMe } from "@/services/user";
import { useUserStore } from "@/store/userStore";
import { Ionicons } from "@expo/vector-icons";
import { useQuery } from "@tanstack/react-query";
import * as ImagePicker from "expo-image-picker";
import { useRouter } from "expo-router";
import { Alert, Image, ScrollView, TouchableOpacity, View } from "react-native";

export default function ProfileScreen() {
  const router = useRouter();
  const accessToken = useUserStore((state) => state.accessToken);
  const storedUser = useUserStore((state) => state.user);
  // Same cache entry as Home; the persisted session only keeps the account id.
  const { data: me } = useQuery({
    queryKey: ["user-me", accessToken],
    queryFn: getMe,
    enabled: !!accessToken,
  });
  const user = me ?? storedUser;

  const fullName =
    user?.first_name && user?.last_name
      ? `${user.first_name} ${user.last_name}`
      : "PayDrop User";
  const username: string | null = user?.username ?? null;
  const avatar: string | null = user?.avatar_url ?? null;
  const trustScore: number | null =
    typeof user?.trust_score === "number" ? user.trust_score : null;
  const verified = user?.kyc_status === "VERIFIED" || !!user?.kyc_verified;

  const handleAvatarPress = async () => {
    const permissionResult =
      await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (permissionResult.granted === false) {
      Alert.alert(
        "Permission required",
        "Permission to access camera roll is required!",
      );
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [1, 1],
      quality: 1,
    });

    if (!result.canceled) {
      // TODO: PATCH /users/me with result.assets[0].uri
      console.log(result.assets[0].uri);
    }
  };

  const handleLogout = () => {
    endSession();
    router.replace("/(auth)/login");
  };

  const handleEditProfile = () => {
    router.push("/(auth)/display-name");
  };

  const handleNotifications = () => {
    // TODO: navigate to notifications
  };

  const handleSecurity = () => {
    // TODO: navigate to security
  };

  const handleHelp = () => {
    // TODO: navigate to help
  };

  return (
    <ScreenView>
      <ScrollView
        className="flex-1 bg-white"
        showsVerticalScrollIndicator={false}
      >
        {/* Header */}
        <View className="bg-white px-6 pt-4 pb-4">
          <Text className="text-black font-satoshi-bold text-2xl">Profile</Text>
        </View>

        {/* Profile Card */}
        <View className="bg-white rounded-3xl mx-6 mt-6 p-6 border border-grey-100">
          <View className="items-center mb-6">
            <TouchableOpacity onPress={handleAvatarPress} className="relative">
              <View className="w-24 h-24 rounded-full bg-purple-100 items-center justify-center mb-4 border-2 border-purple-200">
                {avatar ? (
                  <Image
                    source={{ uri: avatar }}
                    className="w-24 h-24 rounded-full"
                  />
                ) : (
                  <Text className="text-purple-600 font-satoshi-medium text-3xl">
                    {fullName
                      .split(" ")
                      .map((n) => n[0])
                      .join("")
                      .toUpperCase()}
                  </Text>
                )}
              </View>
              <View className="absolute bottom-4 right-0 bg-purple-500 rounded-full p-2 border-2 border-white">
                <Ionicons name="camera" size={16} color="white" />
              </View>
            </TouchableOpacity>
            <Text className="text-black font-satoshi-bold text-2xl mb-1">
              {fullName}
            </Text>
            {username ? (
              <Text className="text-grey-500 font-satoshi-regular text-base mb-4">
                @{username}
              </Text>
            ) : null}
          </View>

          {trustScore !== null && (
            <View className="bg-grey-50 rounded-2xl p-4 mb-4">
              <View className="flex-row items-center justify-between mb-3">
                <Text className="text-black font-satoshi-bold text-base">
                  Trust Score
                </Text>
                <View className="bg-green-100 rounded-full px-3 py-1">
                  <Text className="text-green-600 font-satoshi-medium text-sm">
                    {trustScore}%{user?.trust_tier ? ` · ${user.trust_tier}` : ""}
                  </Text>
                </View>
              </View>
              <View className="h-2 bg-grey-200 rounded-full overflow-hidden">
                <View
                  style={{ width: `${Math.max(0, Math.min(100, trustScore))}%` }}
                  className="h-full bg-green-500"
                />
              </View>
            </View>
          )}

          <View className="flex-row items-center bg-blue-50 rounded-2xl p-3 border border-blue-100">
            <Ionicons
              name={verified ? "shield-checkmark" : "shield-outline"}
              size={20}
              color="#3B82F6"
            />
            <Text className="text-blue-600 font-satoshi-regular text-sm ml-3 flex-1">
              {verified ? "Identity verified" : "Identity not verified (optional)"}
            </Text>
          </View>
        </View>

        {/* Presence Activity Card */}
        {/* <View className="bg-grey-50 rounded-3xl mx-6 mt-4 p-5 border border-grey-100">
        <Text className="text-black font-satoshi-bold text-sm mb-4">
          Where you're seen
        </Text>
        <View className="flex-row flex-wrap gap-2">
          {["Faculty Building", "Cafeteria", "Hostel Zone"].map((place) => (
            <View key={place} className="bg-green-50 rounded-full px-3 py-1">
              <Text className="text-green-600 font-satoshi-regular text-sm">
                {place}
              </Text>
            </View>
          ))}
        </View>
      </View> */}

        {/* Settings Section */}
        <View className="mx-6 mt-8">
          <Text className="text-black font-satoshi-bold text-lg mb-4">
            Settings
          </Text>
          <TouchableOpacity
            onPress={handleEditProfile}
            className="bg-white rounded-2xl p-4 flex-row items-center justify-between border border-grey-100 mb-3"
          >
            <View className="flex-row items-center flex-1">
              <View className="w-10 h-10 bg-purple-100 rounded-full items-center justify-center mr-4">
                <Ionicons name="person-outline" size={18} color="#A855F7" />
              </View>
              <Text className="text-black font-satoshi-bold text-base">
                Edit Profile
              </Text>
            </View>
            <Ionicons name="chevron-forward" size={20} color="#9CA3AF" />
          </TouchableOpacity>
          <TouchableOpacity
            onPress={handleNotifications}
            className="bg-white rounded-2xl p-4 flex-row items-center justify-between border border-grey-100 mb-3"
          >
            <View className="flex-row items-center flex-1">
              <View className="w-10 h-10 bg-blue-100 rounded-full items-center justify-center mr-4">
                <Ionicons
                  name="notifications-outline"
                  size={18}
                  color="#3B82F6"
                />
              </View>
              <Text className="text-black font-satoshi-bold text-base">
                Notifications
              </Text>
            </View>
            <Ionicons name="chevron-forward" size={20} color="#9CA3AF" />
          </TouchableOpacity>
          <TouchableOpacity
            onPress={handleSecurity}
            className="bg-white rounded-2xl p-4 flex-row items-center justify-between border border-grey-100 mb-3"
          >
            <View className="flex-row items-center flex-1">
              <View className="w-10 h-10 bg-green-100 rounded-full items-center justify-center mr-4">
                <Ionicons
                  name="lock-closed-outline"
                  size={18}
                  color="#10B981"
                />
              </View>
              <Text className="text-black font-satoshi-bold text-base">
                Security
              </Text>
            </View>
            <Ionicons name="chevron-forward" size={20} color="#9CA3AF" />
          </TouchableOpacity>
          <TouchableOpacity
            onPress={handleHelp}
            className="bg-white rounded-2xl p-4 flex-row items-center justify-between border border-grey-100"
          >
            <View className="flex-row items-center flex-1">
              <View className="w-10 h-10 bg-orange-100 rounded-full items-center justify-center mr-4">
                <Ionicons
                  name="help-circle-outline"
                  size={18}
                  color="#F97316"
                />
              </View>
              <Text className="text-black font-satoshi-bold text-base">
                Help & Support
              </Text>
            </View>
            <Ionicons name="chevron-forward" size={20} color="#9CA3AF" />
          </TouchableOpacity>
        </View>

        {/* Log Out Button */}
        <TouchableOpacity
          onPress={handleLogout}
          className="mx-6 mt-8 mb-8 bg-red-50 rounded-2xl p-4 border border-red-200 items-center"
        >
          <View className="flex-row items-center">
            <Ionicons name="log-out-outline" size={20} color="#EF4444" />
            <Text className="text-red-600 font-satoshi-medium text-base ml-3">
              Log Out
            </Text>
          </View>
        </TouchableOpacity>
      </ScrollView>
    </ScreenView>
  );
}
