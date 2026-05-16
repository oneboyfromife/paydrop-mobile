import ScreenView from "@/components/layout/ScreenView";
import PayDropQRCode from "@/components/sections/PayDropQRCode";
import { useBLEDiscovery } from "@/hooks/useBLEDiscovery";
import { getQrCode } from "@/services/user";
import { useUserStore } from "@/store/userStore";
import {
  getDiscoveryTokenFromQrResponse,
  getQrCodeValue,
} from "@/utils/qrPayload";
import { Ionicons } from "@expo/vector-icons";
import { useQuery } from "@tanstack/react-query";
import * as Clipboard from "expo-clipboard";
import * as Haptics from "expo-haptics";
import { useRouter } from "expo-router";
import React, { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Image,
  Share,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

export default function ReceiveScreen() {
  const router = useRouter();
  const [qrTTL, setQrTTL] = useState<number | null>(null);
  const user = useUserStore((state) => state.user);
  const accessToken = useUserStore((state) => state.accessToken);
  const insets = useSafeAreaInsets();

  const {
    data: qrData,
    isLoading: qrLoading,
    isRefetching: qrRefreshing,
    error: qrError,
    refetch: refreshQrCode,
  } = useQuery({
    queryKey: ["qr-code", accessToken],
    queryFn: getQrCode,
    enabled: !!accessToken,
  });

  const discoveryToken = getDiscoveryTokenFromQrResponse(qrData);
  const qrPayload = getQrCodeValue(qrData) ?? discoveryToken ?? "";

  // Use the same token as the QR for BLE broadcast
  const { isAdvertising, error: bleError } = useBLEDiscovery(
    "advertise",
    discoveryToken,
  );

  useEffect(() => {
    if (qrData) {
      const ttl =
        typeof qrData?.ttl === "number"
          ? qrData.ttl
          : typeof qrData?.expires_in === "number"
            ? qrData.expires_in
            : 60;
      setQrTTL(ttl);
    }
  }, [qrData]);

  useEffect(() => {
    const interval = setInterval(() => {
      setQrTTL((prev) => (prev !== null ? Math.max(prev - 1, 0) : null));
    }, 1000);

    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    if (qrTTL !== null && qrTTL <= 10 && !qrRefreshing) {
      refreshQrCode();
    }
  }, [qrTTL, qrRefreshing]);

  const handleShareQr = async () => {
    if (!qrPayload) return;

    try {
      await Share.share({
        message: `Pay me on PayDrop: ${qrPayload}`,
      });
    } catch (error) {
      console.error("Share error", error);
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
            <Text className="text-black font-clash-semibold text-2xl ">
              Receive Money
            </Text>
            <View className="flex-row items-center">
              <View
                className={`w-2 h-2 rounded-full mr-2 ${isAdvertising ? "bg-green-500" : "bg-red-500"}`}
              />
              <Text className="text-[#6B7280] font-clash-medium text-[12px]">
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

        <View className="flex-1 items-center px-6 mt-10">
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
                <Text className="text-grey-400 font-clash-medium text-center">
                  Unable to load QR code.{"\n"}Please try again.
                </Text>
              </View>
            )}
          </View>

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
            <Text className="mt-4 text-black font-clash-semibold text-lg">
              {fullName}
            </Text>
            <Text className="text-grey-500 font-clash-medium text-[14px] mt-0.5">
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
              <Text className="text-white font-clash-semibold text-[16px] ml-2">
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
              <Text className="ml-2 text-[#9CA3AF] font-clash-medium text-[12px]">
                Refreshing code in {qrTTL}s
              </Text>
            </View>
          )}

          {bleError && (
            <Text className="mt-6 text-red-500 font-clash-medium text-xs text-center px-4">
              {bleError}
            </Text>
          )}
        </View>
      </View>
    </ScreenView>
  );
}
