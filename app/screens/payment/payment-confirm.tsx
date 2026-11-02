import { Text } from "@/components/shared";
import ScreenView from "@/components/layout/ScreenView";
import { submitTransfer } from "@/services/transfers";
import { useTransferStore } from "@/store/transferStore";
import { koboToNaira } from "@/utils/currency";
import { relationshipLabel } from "@/utils/discoveryProfile";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { useRef } from "react";
import { ActivityIndicator, TouchableOpacity, View } from "react-native";

export default function PaymentConfirmScreen() {
  const router = useRouter();
  const intent = useTransferStore((state) => state.active);
  const locked = useRef(false);
  const processing = intent?.phase === "submitting";
  if (!intent)
    return (
      <ScreenView>
        <Text className="p-6">
          Select a recipient and review an amount first.
        </Text>
      </ScreenView>
    );
  const name = intent.recipient
    ? `${intent.recipient.first_name} ${intent.recipient.last_name}`.trim() ||
      intent.recipient.username
    : "Recipient";
  const handleConfirm = async () => {
    if (locked.current || intent.phase !== "review") return;
    locked.current = true;
    try {
      await submitTransfer();
      const phase = useTransferStore.getState().active?.phase;
      if (phase === "review") return;
      router.replace(
        phase === "flagged"
          ? "/screens/payment/flag-warning"
          : "/screens/payment/payment-result",
      );
    } catch (error) {
      const active = useTransferStore.getState().active;
      if (active)
        useTransferStore.setState({
          active: {
            ...active,
            message:
              error instanceof Error
                ? error.message
                : "Unable to submit payment.",
          },
        });
    } finally {
      locked.current = false;
    }
  };
  return (
    <ScreenView>
      <View className="flex-1 bg-white px-6 pt-4">
        <View className="flex-row items-center justify-between mb-12">
          <TouchableOpacity disabled={processing} onPress={() => router.back()}>
            <Ionicons name="arrow-back" size={24} color="#1A1A1A" />
          </TouchableOpacity>
          <Text className="font-satoshi-bold text-[22px]">Confirm Payment</Text>
          <View className="w-6" />
        </View>
        <View className="items-center mb-10">
          <Text className="font-satoshi-bold text-[40px]">
            {intent.amount !== null ? koboToNaira(intent.amount) : "Payment"}
          </Text>
          <Text className="text-grey-500 text-base mt-2">to {name}</Text>
          {intent.recipient?.username && (
            <Text className="text-grey-500 mt-1">
              @{intent.recipient.username.replace(/^@/, "")}
            </Text>
          )}
        </View>
        <View className="bg-grey-50 rounded-2xl p-5">
          <Text className="font-satoshi-bold mb-3">Payment review</Text>
          <Text className="text-grey-500 mb-3">
            {intent.recipient
              ? relationshipLabel(intent.recipient)
              : "Relationship information unavailable"}
          </Text>
          {intent.note ? (
            <Text className="mb-3">Note: {intent.note}</Text>
          ) : null}
          <Text className="text-grey-500">
            Check the recipient and amount. Server checks run when you confirm.
            Internet access is required.
          </Text>
        </View>
        {intent.message && (
          <Text className="text-red-500 mt-4">{intent.message}</Text>
        )}
        <View className="flex-1 justify-end pb-12">
          <TouchableOpacity
            onPress={handleConfirm}
            disabled={processing || intent.phase !== "review"}
            className="bg-purple-500 rounded-full items-center justify-center py-4 mb-4"
          >
            {processing ? (
              <ActivityIndicator color="white" />
            ) : (
              <Text className="text-white font-satoshi-bold text-base">
                Confirm &amp; Pay
              </Text>
            )}
          </TouchableOpacity>
          {intent.phase !== "review" && !processing && (
            <TouchableOpacity
              onPress={() => router.replace("/screens/payment/payment-result")}
              className="p-3"
            >
              <Text className="text-center text-purple-500">
                Check payment status
              </Text>
            </TouchableOpacity>
          )}
          <TouchableOpacity
            disabled={processing}
            onPress={() => router.back()}
            className="items-center p-3"
          >
            <Text className="text-grey-500">Cancel</Text>
          </TouchableOpacity>
        </View>
      </View>
    </ScreenView>
  );
}
