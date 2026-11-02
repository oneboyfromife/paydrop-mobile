import { Text } from "@/components/shared";
import ScreenView from "@/components/layout/ScreenView";
import { confirmFlaggedTransfer, recoverTransfer } from "@/services/transfers";
import { useTransferStore } from "@/store/transferStore";
import { koboToNaira } from "@/utils/currency";
import { useRouter } from "expo-router";
import { useEffect, useRef, useState } from "react";
import { ActivityIndicator, TouchableOpacity, View } from "react-native";

export default function FlagWarningScreen() {
  const router = useRouter();
  const intent = useTransferStore((state) => state.active);
  const [now, setNow] = useState(Date.now());
  const [error, setError] = useState<string | null>(null);
  const locked = useRef(false);
  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(timer);
  }, []);
  const flag = intent?.flag;
  const expiresIn = flag
    ? Math.max(0, Math.ceil((flag.expiresAt - now) / 1000))
    : 0;
  const processing = intent?.phase === "submitting";
  const proceed = async () => {
    if (locked.current || processing || !expiresIn) return;
    locked.current = true;
    try {
      await confirmFlaggedTransfer();
      const active = useTransferStore.getState().active;
      if (active?.phase === "flagged") {
        setError(active.message || "Unable to confirm. Please retry.");
        return;
      }
      router.replace("/screens/payment/payment-result");
    } catch (error) {
      setError(
        error instanceof Error ? error.message : "Unable to confirm payment.",
      );
    } finally {
      locked.current = false;
    }
  };
  return (
    <ScreenView>
      <View className="flex-1 bg-white px-6 pt-8">
        <Text className="text-center text-3xl mb-6">⚠️</Text>
        <Text className="font-satoshi-bold text-2xl text-center mb-4">
          Review this payment
        </Text>
        <View className="bg-grey-50 rounded-2xl p-5 mb-6">
          <Text className="mb-4">
            {flag?.reason ||
              "Check the current payment status before proceeding."}
          </Text>
          {flag?.score !== null && flag?.score !== undefined && (
            <Text className="text-grey-500 mb-3">
              Server risk score: {flag.score} / 100
            </Text>
          )}
          {intent?.amount !== null && intent?.amount !== undefined && (
            <Text className="font-satoshi-bold text-xl">
              {koboToNaira(intent.amount)}
            </Text>
          )}
          <Text className="mt-2">
            {intent?.recipient
              ? `${intent.recipient.first_name} ${intent.recipient.last_name}`
              : "Pending payment"}
          </Text>
        </View>
        <Text className="text-center text-grey-500">
          {expiresIn
            ? `Approval expires in ${Math.floor(expiresIn / 60)}:${String(expiresIn % 60).padStart(2, "0")}`
            : "Approval expired. Check payment status."}
        </Text>
        {error && <Text className="text-red-500 mt-4">{error}</Text>}
        <View className="flex-1 justify-end pb-12">
          <TouchableOpacity
            onPress={proceed}
            disabled={processing || !expiresIn || intent?.phase !== "flagged"}
            className="bg-orange-300 rounded-full items-center py-4 mb-4"
            style={{ opacity: expiresIn ? 1 : 0.5 }}
          >
            {processing ? (
              <ActivityIndicator />
            ) : (
              <Text className="font-satoshi-bold">Confirm and proceed</Text>
            )}
          </TouchableOpacity>
          <TouchableOpacity
            onPress={() => {
              void recoverTransfer();
              router.replace("/screens/payment/payment-result");
            }}
            className="p-4"
          >
            <Text className="text-center text-purple-500">
              Check payment status
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            disabled={processing}
            onPress={() => router.replace("/(tabs)/home")}
            className="p-4"
          >
            <Text className="text-center text-grey-500">Check later</Text>
          </TouchableOpacity>
        </View>
      </View>
    </ScreenView>
  );
}
