import { Text } from "@/components/shared";
import PayDropQRCode from "@/components/sections/PayDropQRCode";
import { useReceiveQr } from "@/hooks/useReceiveQr";
import { useUserStore } from "@/store/userStore";
import React from "react";
import {
  ActivityIndicator,
  Image,
  Modal,
  Share,
  TouchableOpacity,
  View,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import * as Clipboard from "expo-clipboard";
import * as Haptics from "expo-haptics";
import { useSafeAreaInsets } from "react-native-safe-area-context";

interface QRModalProps {
  visible: boolean;
  onClose: () => void;
}

export default function QRModal({ visible, onClose }: QRModalProps) {
  const user = useUserStore((state) => state.user);
  const insets = useSafeAreaInsets();
  const { qrPayload, qrTTL, qrLoading, qrRefreshing, qrError, refreshQrCode } =
    useReceiveQr(visible);

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
    <Modal visible={visible} animationType="slide" transparent>
      <View className="flex-1 bg-black/60 justify-end">
        <TouchableOpacity
          activeOpacity={1}
          onPress={onClose}
          className="absolute inset-0"
        />
        <View
          className="bg-white rounded-t-[40px] px-6"
          style={{
            paddingTop: 32,
            paddingBottom: insets.bottom + 32,
          }}
        >
          <View className="flex-row items-center justify-between mb-8">
            <View className="w-10" />
            <Text className="text-black font-satoshi-bold text-xl">
              Receive Money
            </Text>
            <TouchableOpacity
              onPress={onClose}
              className="w-10 h-10 bg-grey-50 rounded-full items-center justify-center border border-grey-100"
            >
              <Ionicons name="close" size={22} color="#1A1A1A" />
            </TouchableOpacity>
          </View>

          <View className="items-center">
            <View className="bg-white rounded-[32px] p-[24px] border border-grey-200">
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
                      ? (qrError as any).message ||
                        (qrError as any).error ||
                        "Failed to load QR"
                      : "Unable to load QR code."}
                    {"\n"}Please try again.
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
            <View className="items-center mt-10">
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
              </View>
              <Text className="mt-4 text-black font-satoshi-bold text-lg">
                {fullName}
              </Text>
              <Text className="text-grey-500 font-satoshi-medium text-[14px] mt-0.5">
                {username}
              </Text>
            </View>

            <View className="w-full flex-row gap-3 mt-10">
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
          </View>
        </View>
      </View>
    </Modal>
  );
}
