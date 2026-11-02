import { Text, TextInput } from "@/components/shared";
import ScreenView from "@/components/layout/ScreenView";
import size from "@/utils/size";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { useTransferStore } from "@/store/transferStore";
import { useUserStore } from "@/store/userStore";
import { parseNairaToKobo } from "@/utils/currency";
import { isUnresolved } from "@/types/transfer";
import { useState } from "react";
import { Image, TouchableOpacity, View } from "react-native";

export default function EnterAmountScreen() {
  const router = useRouter();
  const recipient = useTransferStore((state) => state.recipient);
  const pending = useTransferStore(
    (state) => !!state.active && isUnresolved(state.active.phase),
  );
  const ownerId = useUserStore((state) => state.user?.id as string | undefined);
  const hydrated = useTransferStore((state) => state.hydrated);
  const recipientName = recipient
    ? `${recipient.first_name} ${recipient.last_name}`.trim() ||
      recipient.username
    : "";
  const recipientAvatar = recipient?.avatar_url;

  const [amount, setAmount] = useState("0");
  const [note, setNote] = useState("");
  const [error, setError] = useState<string | null>(null);

  const handleKeyPress = (key: string) => {
    if (key === "backspace") {
      setAmount((prev) => (prev.length > 1 ? prev.slice(0, -1) : "0"));
    } else if (key === ".") {
      if (!amount.includes(".")) {
        setAmount((prev) => prev + ".");
      }
    } else {
      setAmount((prev) => {
        if (
          prev.length >= 16 ||
          (prev.includes(".") && prev.split(".")[1].length >= 2)
        )
          return prev;
        return prev === "0" ? key : prev + key;
      });
    }
  };

  const formattedAmount = () => {
    const [whole, fraction = ""] = amount.split(".");
    return `${whole.replace(/\B(?=(\d{3})+(?!\d))/g, ",")}.${fraction.padEnd(2, "0")}`;
  };

  const amountInKobo = parseNairaToKobo(amount);
  const isValidAmount =
    amountInKobo !== null && !!recipient && !!ownerId && hydrated && !pending;
  const handleContinue = () => {
    if (!isValidAmount || amountInKobo === null || !ownerId) return;
    try {
      useTransferStore.getState().review(ownerId, amountInKobo, note);
      router.push("/screens/payment/payment-confirm" as any);
    } catch (error) {
      setError(
        error instanceof Error
          ? error.message
          : "Unable to review this payment.",
      );
    }
  };

  return (
    <ScreenView>
      <View className="flex-1 bg-white px-6 pt-4">
        {/* Header / Recipient Pill */}
        <View className="items-center mb-12">
          <View className="flex-row items-center bg-[#F3F4F6] rounded-full px-4 py-2">
            <Image
              source={{ uri: recipientAvatar || "https://i.pravatar.cc/100" }}
              className="w-10 h-10 rounded-full mr-3"
            />
            <Text className="text-black font-satoshi-bold text-[16px]">
              {recipientName}
            </Text>
          </View>
        </View>

        {/* Amount Display */}
        <View className="items-center mb-8">
          <View className="flex-row items-center">
            <Text className="text-[#9CA3AF] font-satoshi-medium text-[28px] mr-2">
              ₦
            </Text>
            <Text className="text-[#1A1A1A] font-satoshi-bold text-5xl">
              {formattedAmount()}
            </Text>
          </View>
          {!isValidAmount && amount !== "0" && (
            <Text className="text-[#FF6B6B] font-satoshi-regular text-[12px] mt-2">
              {pending
                ? "Check your pending payment before starting another."
                : "Enter a valid amount with up to two decimal places."}
            </Text>
          )}
        </View>
        {error && <Text className="text-red-500 text-center">{error}</Text>}
        {pending && (
          <TouchableOpacity
            onPress={() =>
              router.push("/screens/payment/payment-result" as any)
            }
            className="p-3"
          >
            <Text className="text-purple-500 text-center">
              View pending payment
            </Text>
          </TouchableOpacity>
        )}

        {/* Note Field */}
        <View className="bg-[#F3F4F6] rounded-[12px] p-[14px] mb-8">
          <TextInput
            value={note}
            onChangeText={setNote}
            placeholder="Add a note (optional)"
            placeholderTextColor="#9CA3AF"
            maxLength={100}
            className="text-[#1A1A1A] font-satoshi-regular text-[14px]"
          />
        </View>

        {/* Custom Numpad */}
        <View className="flex-1 justify-end pb-12">
          <View className="flex-row flex-wrap justify-between">
            {[
              "1",
              "2",
              "3",
              "4",
              "5",
              "6",
              "7",
              "8",
              "9",
              ".",
              "0",
              "backspace",
            ].map((key) => (
              <TouchableOpacity
                key={key}
                onPress={() => handleKeyPress(key)}
                className="w-[30%] h-[64px] bg-[#F3F4F6] rounded-[12px] items-center justify-center mb-3"
              >
                {key === "backspace" ? (
                  <Ionicons
                    name="backspace-outline"
                    size={24}
                    color="#1A1A1A"
                  />
                ) : (
                  <Text className="text-[#1A1A1A] font-satoshi-bold text-[22px]">
                    {key}
                  </Text>
                )}
              </TouchableOpacity>
            ))}
          </View>

          <TouchableOpacity
            onPress={handleContinue}
            disabled={!isValidAmount}
            style={{
              height: size.height(54),
            }}
            className={`rounded-full items-center justify-center w-full mt-6 ${isValidAmount ? "bg-purple-400" : "bg-purple-400/40"}`}
          >
            <Text className="text-white font-satoshi-bold text-xl">
              Continue
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    </ScreenView>
  );
}
