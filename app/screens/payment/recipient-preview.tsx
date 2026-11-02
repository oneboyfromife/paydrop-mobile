import { Text } from "@/components/shared";
import ScreenView from "@/components/layout/ScreenView";
import size from "@/utils/size";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { useTransferStore } from "@/store/transferStore";
import { relationshipLabel } from "@/utils/discoveryProfile";
import { Image, TouchableOpacity, View } from "react-native";

export default function RecipientPreviewScreen() {
  const router = useRouter();
  const recipient = useTransferStore((state) => state.recipient);

  if (!recipient) return null;

  const trustTier = (recipient.trust_tier || "unknown").toLowerCase();
  const trustScore = recipient.trust_score;

  const getTierBadge = () => {
    switch (trustTier) {
      case "high":
        return {
          bg: "#00D68F",
          label: "Server trust tier: High",
          color: "#000000",
        };
      case "medium":
        return {
          bg: "#FFB347",
          label: "Server trust tier: Medium",
          color: "#000000",
        };
      case "low":
        return {
          bg: "#FF6B6B",
          label: "Server trust tier: Low",
          color: "#FFFFFF",
        };
      default:
        return {
          bg: "#F3F4F6",
          label: "Trust context unavailable",
          color: "#1A1A1A",
        };
    }
  };

  const badge = getTierBadge();

  return (
    <ScreenView>
      <View className="flex-1 bg-white">
        <View className="px-6 pt-4 pb-4 flex-row justify-end">
          <TouchableOpacity onPress={() => router.back()}>
            <Ionicons name="close" size={28} color="#1A1A1A" />
          </TouchableOpacity>
        </View>

        <View className="flex-1 items-center px-6 mt-12">
          <View className="items-center">
            <Image
              source={{
                uri:
                  recipient.avatar_url ||
                  `https://ui-avatars.com/api/?name=${recipient.first_name}+${recipient.last_name}&background=random`,
              }}
              className="w-20 h-20 rounded-full mb-4"
            />
            <Text className="text-[#1A1A1A] font-satoshi-bold text-[22px]">
              {recipient.first_name} {recipient.last_name}
            </Text>
            <Text className="text-[#6B7280] font-satoshi-regular text-[15px] mb-4">
              {recipient.username}
            </Text>

            <View
              style={{ backgroundColor: badge.bg }}
              className="rounded-full px-4 py-2 mb-3"
            >
              <Text
                style={{ color: badge.color }}
                className="font-satoshi-medium text-[14px]"
              >
                {badge.label}
              </Text>
            </View>

            {trustScore !== undefined && (
              <Text className="text-[#6B7280] font-satoshi-regular text-[14px] mb-1">
                Server trust score: {trustScore}
              </Text>
            )}
            <Text className="text-[#6B7280] font-satoshi-regular text-[13px] mb-1">
              {relationshipLabel(recipient)}
            </Text>
            <Text className="text-grey-500 text-sm text-center mt-4">
              Confirm this is the person you intend to pay. Relationship
              information is context, not a safety guarantee.
            </Text>
          </View>
        </View>

        <View className="px-6 pb-12">
          <TouchableOpacity
            onPress={() => router.push("/screens/payment/enter-amount")}
            className="bg-purple-400 rounded-full items-center justify-center w-full mb-4"
            style={{ paddingVertical: size.height(18) }}
          >
            <Text className="text-white font-satoshi-bold text-[16px]">
              Proceed to Pay
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            onPress={() => router.back()}
            className="items-center"
          >
            <Text className="text-[#6B7280] font-satoshi-medium text-[14px]">
              Cancel
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    </ScreenView>
  );
}
