import { Text } from "@/components/shared";
import { getNotifications } from "@/services/user";
import { useUserStore } from "@/store/userStore";
import { Ionicons } from "@expo/vector-icons";
import { useQuery } from "@tanstack/react-query";
import { useRouter } from "expo-router";
import {
  ActivityIndicator,
  RefreshControl,
  ScrollView,
  TouchableOpacity,
  View,
} from "react-native";

export default function NotificationsScreen() {
  const router = useRouter();
  const accessToken = useUserStore((state) => state.accessToken);

  const { data, isLoading, isRefetching, refetch } = useQuery({
    queryKey: ["notifications", accessToken],
    queryFn: getNotifications,
    enabled: !!accessToken,
  });

  const notifications: any[] = data?.notifications || [];

  return (
    <ScrollView
      className="flex-1 bg-white px-6 pt-14"
      showsVerticalScrollIndicator={false}
      refreshControl={
        <RefreshControl
          refreshing={isRefetching}
          onRefresh={refetch}
          tintColor="#7C3AED"
        />
      }
    >
      <TouchableOpacity
        onPress={() => router.back()}
        className="w-10 h-10 bg-grey-50 rounded-full items-center justify-center border border-grey-100 mb-6"
      >
        <Ionicons name="arrow-back" size={20} color="#1A1A1A" />
      </TouchableOpacity>

      <Text className="text-3xl font-satoshi-bold text-black mb-2">
        Notifications
      </Text>
      <Text className="text-grey-500 font-satoshi-regular text-sm mb-6">
        Latest activity from your account.
      </Text>

      {isLoading && !isRefetching ? (
        <View className="items-center mt-10">
          <ActivityIndicator size="large" color="#7C3AED" />
        </View>
      ) : (
        <>
          {notifications.map((item) => (
            <View
              key={item.id}
              className={`rounded-3xl p-4 mb-3 border ${item.read ? "bg-grey-50 border-grey-100" : "bg-purple-50 border-purple-200"}`}
            >
              <View className="flex-row items-center justify-between mb-2">
                <View className="flex-row items-center">
                  <View
                    className={`w-10 h-10 rounded-full items-center justify-center mr-3 ${item.read ? "bg-grey-200" : "bg-purple-100"}`}
                  >
                    <Ionicons
                      name="notifications-outline"
                      size={20}
                      color={item.read ? "#6B7280" : "#7C3AED"}
                    />
                  </View>
                  <View>
                    <Text className="text-black font-satoshi-bold text-base">
                      {item.title}
                    </Text>
                    <Text className="text-grey-500 font-satoshi-regular text-xs mt-1">
                      {new Date(item.created_at).toLocaleDateString(undefined, {
                        month: "short",
                        day: "numeric",
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </Text>
                  </View>
                </View>
              </View>
              <Text className="text-grey-600 font-satoshi-regular text-sm">
                {item.body}
              </Text>
            </View>
          ))}

          {notifications.length === 0 && (
            <View className="items-center mt-16">
              <Text className="text-grey-500 font-satoshi-regular text-base">
                No notifications yet.
              </Text>
            </View>
          )}
        </>
      )}
      <View className="h-10" />
    </ScrollView>
  );
}
