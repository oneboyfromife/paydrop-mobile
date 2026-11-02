import { Text } from "@/components/shared";
import { useTransferStore } from "@/store/transferStore";
import { recoverTransfer } from "@/services/transfers";
import { isUnresolved } from "@/types/transfer";
import { koboToNaira } from "@/utils/currency";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { useEffect, useState } from "react";
import { ActivityIndicator, Share, TouchableOpacity, View } from "react-native";

export default function PaymentResultScreen() {
  const router = useRouter();
  const intent = useTransferStore((state) => state.active);
  const [checking, setChecking] = useState(false);
  const completed = intent?.phase === "completed";
  const pending = !!intent && isUnresolved(intent.phase);
  const failed = intent?.phase === "failed" || intent?.phase === "blocked";
  const name = intent?.recipient
    ? `${intent.recipient.first_name} ${intent.recipient.last_name}`.trim() ||
      intent.recipient.username
    : "";
  const checkStatus = async () => {
    if (checking) return;
    setChecking(true);
    try {
      await recoverTransfer();
    } finally {
      setChecking(false);
    }
  };
  useEffect(() => {
    if (pending) void recoverTransfer();
  }, []);
  const share = async () => {
    if (!completed || !intent) return;
    await Share.share({
      message: `PayDrop confirmed ${intent.amount !== null ? koboToNaira(intent.amount) : "a payment"}${name ? ` to ${name}` : ""}. Reference: ${intent.transactionId || intent.idempotencyKey}`,
    });
  };
  return (
    <View className="flex-1 bg-white items-center justify-center px-6">
      <View
        style={{
          backgroundColor: completed
            ? "#00D68F"
            : failed
              ? "#FF6B6B"
              : "#A855F7",
        }}
        className="w-20 h-20 rounded-full items-center justify-center mb-6"
      >
        {pending ? (
          <ActivityIndicator color="white" size="large" />
        ) : (
          <Ionicons
            name={completed ? "checkmark" : "close"}
            size={40}
            color="white"
          />
        )}
      </View>
      <Text className="font-satoshi-bold text-[32px] mb-3">
        {completed
          ? "Sent!"
          : pending
            ? "Processing"
            : failed
              ? "Payment not completed"
              : "No payment selected"}
      </Text>
      {intent?.amount !== null && intent?.amount !== undefined && (
        <Text className="font-satoshi-medium text-xl mb-2">
          {koboToNaira(intent.amount)}
        </Text>
      )}
      {!!name && <Text className="text-grey-500 mb-4">to {name}</Text>}
      <Text className="text-grey-500 text-center mb-4">
        {pending
          ? intent?.message ||
            "Waiting for the server to confirm the outcome. You can check later; do not send this payment again."
          : intent?.message ||
            (completed
              ? "The server confirmed this payment is completed."
              : "")}
      </Text>
      {intent && (
        <Text selectable className="text-grey-500 text-xs text-center mb-4">
          Reference: {intent.transactionId || intent.idempotencyKey}
        </Text>
      )}
      {pending && (
        <TouchableOpacity
          disabled={checking}
          onPress={checkStatus}
          className="p-4"
        >
          <Text className="text-purple-500">
            {checking ? "Checking..." : "Check status"}
          </Text>
        </TouchableOpacity>
      )}
      {intent?.phase === "flagged" &&
        intent.flag &&
        intent.flag.expiresAt > Date.now() && (
          <TouchableOpacity
            onPress={() => router.replace("/screens/payment/flag-warning")}
            className="p-4"
          >
            <Text className="text-purple-500">Review server warning</Text>
          </TouchableOpacity>
        )}
      <TouchableOpacity
        onPress={() => router.replace("/(tabs)/home")}
        className="bg-purple-500 rounded-full items-center py-4 w-full mt-6"
      >
        <Text className="text-white font-satoshi-bold">
          {pending ? "Check later" : "Done"}
        </Text>
      </TouchableOpacity>
      {completed && (
        <TouchableOpacity
          onPress={() => {
            void share().catch(() => {});
          }}
          className="p-4"
        >
          <Text className="text-grey-500">Share receipt</Text>
        </TouchableOpacity>
      )}
    </View>
  );
}
