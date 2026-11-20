import { Text } from "@/components/shared";
import {
  getNotifications,
  markAllNotificationsRead,
  markNotificationRead,
} from "@/services/user";
import { useUserStore } from "@/store/userStore";
import type { Notification } from "@/types/api";
import { Ionicons } from "@expo/vector-icons";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
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

  const queryClient = useQueryClient();
  const notifications: Notification[] = data?.notifications ?? [];
  const isRead = (item: Notification) => !!(item.read ?? item.is_read);
  const unreadCount =
    data?.unread_count ?? notifications.filter((item) => !isRead(item)).length;
  const refresh = () =>
    queryClient.invalidateQueries({ queryKey: ["notifications"] });
  const markOne = useMutation({
    mutationFn: markNotificationRead,
    onSettled: refresh,
  });
  const markAll = useMutation({
    mutationFn: markAllNotificationsRead,
    onSettled: refresh,
  });

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
          {unreadCount > 0 && (
            <TouchableOpacity
              onPress={() => markAll.mutate()}
              disabled={markAll.isPending}
              className="self-end mb-3"
            >
              <Text className="text-purple-500 font-satoshi-bold text-sm">
                Mark all read
              </Text>
            </TouchableOpacity>
          )}
          {notifications.map((item) => (
            <TouchableOpacity
              key={item.id}
              activeOpacity={0.8}
              onPress={() => {
                if (!isRead(item)) markOne.mutate(item.id);
              }}
              className={`rounded-3xl p-4 mb-3 border ${isRead(item) ? "bg-grey-50 border-grey-100" : "bg-purple-50 border-purple-200"}`}
            >
              <View className="flex-row items-center justify-between mb-2">
                <View className="flex-row items-center">
                  <View
                    className={`w-10 h-10 rounded-full items-center justify-center mr-3 ${isRead(item) ? "bg-grey-200" : "bg-purple-100"}`}
                  >
                    <Ionicons
                      name="notifications-outline"
                      size={20}
                      color={isRead(item) ? "#6B7280" : "#7C3AED"}
                    />
                  </View>
                  <View>
                    <Text className="text-black font-satoshi-bold text-base">
                      {item.title}
                    </Text>
                    <Text className="text-grey-500 font-satoshi-regular text-xs mt-1">
                      {new Date(
                        item.createdAt ?? item.created_at ?? "",
                      ).toLocaleDateString(undefined, {
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
                {item.body ?? item.message}
              </Text>
            </TouchableOpacity>
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
