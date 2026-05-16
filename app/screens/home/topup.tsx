import ScreenView from "@/components/layout/ScreenView";
import { useUserStore } from "@/store/userStore";
import { Ionicons } from "@expo/vector-icons";
import { showToast } from "@/utils/toast";
import * as Clipboard from "expo-clipboard";
import { router } from "expo-router";
import {
  Alert,
  Platform,
  ScrollView,
  Share,
  Text,
  ToastAndroid,
  TouchableOpacity,
  View,
} from "react-native";

export default function TopUpScreen() {
  const user = useUserStore((state) => state.user);
  const accountNumber = user?.squad_virtual_account ?? "";
  const bankCode = user?.squad_bank_code ?? "";
  const accountName =
    `${user?.first_name ?? ""} ${user?.last_name ?? ""}`.trim();

  const handleCopy = async () => {
    await Clipboard.setStringAsync(accountNumber);
    showToast.success("Copied!", "Account number copied to clipboard.");
  };

  const handleShare = async () => {
    try {
      await Share.share({
        message: `PayDrop top-up details:\nAccount Number: ${accountNumber}\nBank: Guaranty Trust Bank\nAccount Name: ${accountName}`,
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
        <Text className="text-3xl font-clash-bold text-black mb-4">Top up</Text>
        <Text className="text-grey-500 font-clash-regular text-sm mb-8">
          Send funds from any Nigerian bank to your PayDrop wallet.
        </Text>

        <TouchableOpacity
          onPress={handleCopy}
          className="bg-grey-50 rounded-3xl p-6 mb-5 border border-grey-100"
        >
          <Text className="text-grey-500 font-clash-medium text-sm mb-2">
            Account number
          </Text>
          <Text className="text-black font-clash-semibold text-3xl mb-2">
            {accountNumber}
          </Text>
          <Text className="text-grey-500 font-clash-regular text-sm">
            Tap to copy
          </Text>
        </TouchableOpacity>

        <View className="bg-grey-50 rounded-3xl p-6 border border-grey-100 mb-5">
          <InfoRow label="Bank" value="Guaranty Trust Bank" />
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
          <Text className="text-white font-clash-semibold text-base">
            Share details
          </Text>
        </TouchableOpacity>
      </ScrollView>
    </ScreenView>
  );
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <View className="mb-4">
      <Text className="text-grey-500 font-clash-medium text-xs mb-2">
        {label}
      </Text>
      <Text className="text-black font-clash-semibold text-base">{value}</Text>
    </View>
  );
}
