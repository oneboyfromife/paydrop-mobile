import { Text } from "@/components/shared";
import ScreenView from "@/components/layout/ScreenView";
import { getWalletAccount } from "@/services/user";
import { useUserStore } from "@/store/userStore";
import { useQuery } from "@tanstack/react-query";
import { Ionicons } from "@expo/vector-icons";
import { showToast } from "@/utils/toast";
import * as Clipboard from "expo-clipboard";
import { router } from "expo-router";
import {
  ActivityIndicator,
  Alert,
  Platform,
  ScrollView,
  Share,
  ToastAndroid,
  TouchableOpacity,
  View,
} from "react-native";

export default function TopUpScreen() {
  const accountId = useUserStore((state) => state.user?.id);
  const {
    data: account,
    isLoading,
    error,
    refetch,
  } = useQuery({
    queryKey: ["wallet-account", accountId],
    queryFn: getWalletAccount,
    enabled: !!accountId,
    retry: 1,
  });
  const accountNumber = account?.virtual_account_number ?? "";
  const bankName = account?.bank_name ?? "";
  const accountName = account?.account_name ?? "";

  const handleCopy = async () => {
    await Clipboard.setStringAsync(accountNumber);
    showToast.success("Copied!", "Account number copied to clipboard.");
  };

  const handleShare = async () => {
    try {
      await Share.share({
        message: `PayDrop top-up details:\nAccount Number: ${accountNumber}\nBank: ${bankName}\nAccount Name: ${accountName}`,
      });
    } catch (error) {
      console.error("Share error", error);
    }
  };

  return (
    <ScreenView>
      <ScrollView
        className="flex-1 bg-white px-6 pt-4"
        showsVerticalScrollIndicator={false}
      >
        <TouchableOpacity
          onPress={() => router.back()}
          className="w-12 h-12 bg-grey-50 rounded-full items-center justify-center mb-8 border border-grey-100"
        >
          <Ionicons name="arrow-back" size={18} color="#000" />
        </TouchableOpacity>
        <Text className="text-3xl font-satoshi-bold text-black mb-4">
          Top up
        </Text>
        <Text className="text-grey-500 font-satoshi-regular text-sm mb-8">
          Send funds from any Nigerian bank to your PayDrop wallet.
        </Text>

        {isLoading ? (
          <ActivityIndicator size="large" color="#6C63FF" />
        ) : error ? (
          <TouchableOpacity onPress={() => void refetch()}>
            <Text className="text-red-500 font-satoshi-regular text-sm">
              {(error as { message?: string }).message ??
                "Could not load your account details."}{" "}
              Tap to retry.
            </Text>
          </TouchableOpacity>
        ) : !account ? (
          <View className="bg-grey-50 rounded-3xl p-6 border border-grey-100">
            <Text className="text-black font-satoshi-bold text-lg mb-2">
              No account number yet
            </Text>
            <Text className="text-grey-500 font-satoshi-regular text-sm">
              Bank top-ups need a dedicated account number, which is issued once
              your identity is verified.
            </Text>
          </View>
        ) : (
          <>
            <TouchableOpacity
              onPress={handleCopy}
              className="bg-grey-50 rounded-3xl p-6 mb-5 border border-grey-100"
            >
              <Text className="text-grey-500 font-satoshi-medium text-sm mb-2">
                Account number
              </Text>
              <Text className="text-black font-satoshi-bold text-3xl mb-2">
                {accountNumber}
              </Text>
              <Text className="text-grey-500 font-satoshi-regular text-sm">
                Tap to copy
              </Text>
            </TouchableOpacity>

            <View className="bg-grey-50 rounded-3xl p-6 border border-grey-100 mb-5">
              <InfoRow label="Bank" value={bankName} />
              <InfoRow label="Account name" value={accountName} />
              <InfoRow
                label="Instruction"
                value="Send any amount from any Nigerian bank."
              />
            </View>

            <TouchableOpacity
              onPress={handleShare}
              className="bg-purple-500 rounded-3xl py-4 items-center"
            >
              <Text className="text-white font-satoshi-bold text-base">
                Share details
              </Text>
            </TouchableOpacity>
          </>
        )}
      </ScrollView>
    </ScreenView>
  );
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <View className="mb-4">
      <Text className="text-grey-500 font-satoshi-medium text-xs mb-2">
        {label}
      </Text>
      <Text className="text-black font-satoshi-bold text-base">{value}</Text>
    </View>
  );
}
