import { Text } from "@/components/shared";
import ScreenView from "@/components/layout/ScreenView";
import PayDropQRCode from "@/components/sections/PayDropQRCode";
import { useBLEDiscovery } from "@/hooks/useBLEDiscovery";
import { useReceiveQr } from "@/hooks/useReceiveQr";
import { useUserStore } from "@/store/userStore";
import { Ionicons } from "@expo/vector-icons";
import * as Clipboard from "expo-clipboard";
import * as Haptics from "expo-haptics";
import { useRouter } from "expo-router";
import React, { useState } from "react";
import {
  ActivityIndicator,
  Image,
  Share,
  Switch,
  Linking,
  ScrollView,
  TouchableOpacity,
  View,
} from "react-native";

export default function ReceiveScreen() {
  const router = useRouter();
  const [visibleNearby, setVisibleNearby] = useState(false);
  const user = useUserStore((state) => state.user);

  const { qrPayload, qrTTL, qrLoading, qrRefreshing, qrError, refreshQrCode } =
    useReceiveQr();
  const {
    isAdvertising,
    isStarting,
    error: bleError,
    retry,
  } = useBLEDiscovery("advertise", visibleNearby);

  const handleShareQr = async () => {
    if (!qrPayload) return;

    try {
      await Share.share({
        message: `Pay me on PayDrop: ${qrPayload}`,
      });
    } catch {
      // Sharing may be cancelled by the native sheet.
    }
  };

  const handleCopyQr = async () => {
    if (!qrPayload) return;
    await Clipboard.setStringAsync(qrPayload);
    await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
  };

  const fullName =
    user?.first_name && user?.last_name
      ? `${user.first_name} ${user.last_name}`
      : user?.name || "PayDrop User";

  const username =
    user?.username || `@${(user?.first_name || "user").toLowerCase()}`;

  return (
    <ScreenView>
      <View className="flex-1 bg-white">
        {/* Header */}
        <View className="px-6 pt-4 pb-4 bg-white flex-row justify-between items-center">
          <View>
            <Text className="text-black font-satoshi-bold text-2xl ">
              Receive Money
            </Text>
            <View className="flex-row items-center">
              <View
                className={`w-2 h-2 rounded-full mr-2 ${isAdvertising ? "bg-green-500" : "bg-red-500"}`}
              />
              <Text className="text-[#6B7280] font-satoshi-medium text-[12px]">
                {isAdvertising
                  ? "Discoverable to nearby users"
                  : "Not discoverable"}
              </Text>
            </View>
          </View>
          <TouchableOpacity
            onPress={() => router.back()}
            className="w-10 h-10 bg-grey-50 rounded-full items-center justify-center border border-grey-100"
          >
            <Ionicons name="close" size={24} color="#1A1A1A" />
          </TouchableOpacity>
        </View>

        <ScrollView
          contentContainerStyle={{
            alignItems: "center",
            paddingHorizontal: 24,
            paddingTop: 20,
            paddingBottom: 40,
          }}
        >
          <View className="w-full flex-row items-center justify-between mb-4">
            <View className="flex-1 mr-4">
              <Text className="font-satoshi-bold">
                Visible to nearby senders
              </Text>
              <Text className="text-grey-500 text-xs">
                Keep this screen open to receive nearby.
              </Text>
            </View>
            <Switch
              accessibilityLabel="Visible to nearby senders"
              value={visibleNearby}
              onValueChange={setVisibleNearby}
              disabled={isStarting}
            />
          </View>
          <View className="bg-white rounded-[32px] p-[24px] border border-grey-200 shadow-sm w-full max-w-[320px] items-center">
            {qrLoading ? (
              <View
                style={{
                  width: 260,
                  height: 260,
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <ActivityIndicator size="large" color="#A855F7" />
              </View>
            ) : qrPayload ? (
              <PayDropQRCode value={qrPayload} size={260} />
            ) : (
              <View
                style={{
                  width: 260,
                  height: 260,
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <Text className="text-grey-400 font-satoshi-medium text-center">
                  {qrError
                    ? "Unable to load a valid QR code."
                    : "Refreshing receiving code..."}
                </Text>
              </View>
            )}
          </View>
          {qrError && (
            <TouchableOpacity
              onPress={() => {
                void refreshQrCode();
              }}
              className="p-3"
            >
              <Text className="text-purple-500">Retry QR code</Text>
            </TouchableOpacity>
          )}

          <View className="items-center mt-8">
            <View className="relative">
              <Image
                source={{
                  uri:
                    user?.avatar_url ||
                    user?.avatar ||
                    `https://ui-avatars.com/api/?name=${fullName}&background=F3E8FF&color=A855F7`,
                }}
                className="h-[64px] w-[64px] rounded-full border-2 border-purple-100"
              />
              <View
                className={`absolute bottom-2 -right-0 ${isAdvertising ? "bg-green-500" : "bg-red-500"} w-4 h-4 rounded-full border-2 border-white`}
              />
            </View>
            <Text className="mt-4 text-black font-satoshi-bold text-lg">
              {fullName}
            </Text>
            <Text className="text-grey-500 font-satoshi-medium text-[14px] mt-0.5">
              {username}
            </Text>
          </View>

          <View className="w-full max-w-[320px] flex-row gap-3 mt-10">
            <TouchableOpacity
              onPress={handleShareQr}
              className="flex-1 h-[56px] flex-row items-center justify-center rounded-2xl bg-purple-500"
            >
              <Ionicons
                name="share-social-outline"
                size={20}
                color="white"
                className="mr-2"
              />
              <Text className="text-white font-satoshi-bold text-[16px] ml-2">
                Share QR
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              onPress={handleCopyQr}
              className="w-[56px] h-[56px] items-center justify-center rounded-2xl bg-grey-50 border border-grey-100"
            >
              <Ionicons name="copy-outline" size={20} color="#1A1A1A" />
            </TouchableOpacity>
          </View>

          {(qrRefreshing || (qrTTL !== null && qrTTL <= 15)) && (
            <View className="mt-6 flex-row items-center">
              <ActivityIndicator size="small" color="#9CA3AF" />
              <Text className="ml-2 text-[#9CA3AF] font-satoshi-medium text-[12px]">
                Refreshing code in {qrTTL}s
              </Text>
            </View>
          )}

          {bleError && (
            <View className="mt-6 items-center">
              <Text className="text-red-500 font-satoshi-medium text-xs text-center">
                {bleError}
              </Text>
              <TouchableOpacity
                onPress={
                  bleError.includes("permissions")
                    ? () => {
                        void Linking.openSettings();
                      }
                    : retry
                }
                className="p-3"
              >
                <Text className="text-purple-500">
                  {bleError.includes("permissions")
                    ? "Open Settings"
                    : "Retry visibility"}
                </Text>
              </TouchableOpacity>
            </View>
          )}
        </ScrollView>
      </View>
    </ScreenView>
  );
}
