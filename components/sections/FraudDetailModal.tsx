import { Text } from "@/components/shared";
import { getFraudDetail } from "@/services/user";
import { useQuery } from "@tanstack/react-query";
import React from "react";
import {
  ActivityIndicator,
  Modal,
  ScrollView,
  TouchableOpacity,
  View,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";

interface FraudDetailModalProps {
  visible: boolean;
  onClose: () => void;
  transactionId: string | null;
}

export default function FraudDetailModal({
  visible,
  onClose,
  transactionId,
}: FraudDetailModalProps) {
  const insets = useSafeAreaInsets();

  const { data, isLoading, error } = useQuery({
    queryKey: ["fraud-detail", transactionId],
    queryFn: () => getFraudDetail(transactionId!),
    enabled: visible && !!transactionId,
  });

  const getScoreColor = (score: number) => {
    if (score < 30) return "text-green-600";
    if (score < 70) return "text-yellow-600";
    return "text-red-600";
  };

  const getScoreBg = (score: number) => {
    if (score < 30) return "bg-green-50";
    if (score < 70) return "bg-yellow-50";
    return "bg-red-50";
  };

  // FraudDetailDto: { score, verdict, reason, features, source?, scored_at?, note? }
  const fraud = (data ?? {}) as {
    score?: number;
    verdict?: string;
    reason?: string;
    features?: {
      amount_vs_baseline?: number;
      velocity_1hr?: number;
      recipient_first_time?: boolean;
      time_anomaly?: boolean;
      account_name_match?: boolean;
    };
  };
  const score = typeof fraud.score === "number" ? fraud.score : 0;
  const features = fraud.features ?? {};
  const signals: { label: string; value: string; risky: boolean; icon: any }[] =
    [
      typeof features.amount_vs_baseline === "number" && {
        label: "Amount vs your usual",
        value: `${features.amount_vs_baseline.toFixed(1)}×`,
        risky: features.amount_vs_baseline >= 2,
        icon: "trending-up-outline",
      },
      typeof features.velocity_1hr === "number" && {
        label: "Payments in the last hour",
        value: String(features.velocity_1hr),
        risky: features.velocity_1hr >= 3,
        icon: "speedometer-outline",
      },
      typeof features.recipient_first_time === "boolean" && {
        label: "First payment to this person",
        value: features.recipient_first_time ? "Yes" : "No",
        risky: features.recipient_first_time,
        icon: "person-add-outline",
      },
      typeof features.time_anomaly === "boolean" && {
        label: "Unusual time of day",
        value: features.time_anomaly ? "Yes" : "No",
        risky: features.time_anomaly,
        icon: "time-outline",
      },
      typeof features.account_name_match === "boolean" && {
        label: "Account name matches",
        value: features.account_name_match ? "Yes" : "No",
        risky: !features.account_name_match,
        icon: "id-card-outline",
      },
    ].filter(Boolean) as {
      label: string;
      value: string;
      risky: boolean;
      icon: any;
    }[];

  return (
    <Modal visible={visible} animationType="slide" transparent>
      <View className="flex-1 bg-black/60 justify-end">
        <TouchableOpacity
          activeOpacity={1}
          onPress={onClose}
          className="absolute inset-0"
        />
        <View
          className="bg-white rounded-t-[40px] px-6 max-h-[90%]"
          style={{
            paddingTop: 32,
            paddingBottom: insets.bottom + 32,
          }}
        >
          <View className="flex-row items-center justify-between mb-8">
            <View className="w-10" />
            <Text className="text-black font-satoshi-bold text-xl">
              Fraud Analysis
            </Text>
            <TouchableOpacity
              onPress={onClose}
              className="w-10 h-10 bg-grey-50 rounded-full items-center justify-center border border-grey-100"
            >
              <Ionicons name="close" size={22} color="#1A1A1A" />
            </TouchableOpacity>
          </View>

          {isLoading ? (
            <View className="py-20 items-center justify-center">
              <ActivityIndicator size="large" color="#7C3AED" />
              <Text className="mt-4 text-grey-500 font-satoshi-medium">
                Analyzing transaction...
              </Text>
            </View>
          ) : error ? (
            <View className="py-20 items-center justify-center">
              <Ionicons name="alert-circle-outline" size={48} color="#EF4444" />
              <Text className="mt-4 text-red-500 font-satoshi-medium text-center">
                Failed to load fraud details.{"\n"}Please try again later.
              </Text>
            </View>
          ) : (
            <ScrollView showsVerticalScrollIndicator={false}>
              <View className="items-center mb-8">
                <View
                  className={`w-32 h-32 rounded-full items-center justify-center border-4 ${
                    score < 30
                      ? "border-green-100"
                      : score < 70
                        ? "border-yellow-100"
                        : "border-red-100"
                  }`}
                >
                  <Text
                    className={`text-4xl font-satoshi-bold ${getScoreColor(score)}`}
                  >
                    {score}
                  </Text>
                  <Text className="text-grey-400 font-satoshi-medium text-xs">
                    RISK SCORE
                  </Text>
                </View>
                <View
                  className={`mt-4 px-4 py-1.5 rounded-full ${getScoreBg(score)}`}
                >
                  <Text
                    className={`font-satoshi-bold text-sm ${getScoreColor(score)}`}
                  >
                    {fraud.verdict?.toUpperCase() || "UNKNOWN"}
                  </Text>
                </View>
                {fraud.reason ? (
                  <Text className="mt-4 text-grey-600 font-satoshi-regular text-sm text-center">
                    {fraud.reason}
                  </Text>
                ) : null}
              </View>

              <View>
                <Text className="text-black font-satoshi-bold text-base mb-3">
                  Risk signals
                </Text>
                {signals.length > 0 ? (
                  <View className="bg-white rounded-2xl border border-grey-100 overflow-hidden">
                    {signals.map((signal, index) => (
                      <DetailRow
                        key={signal.label}
                        label={signal.label}
                        value={signal.value}
                        icon={signal.icon}
                        valueColor={
                          signal.risky ? "text-red-600" : "text-green-600"
                        }
                        isLast={index === signals.length - 1}
                      />
                    ))}
                  </View>
                ) : (
                  <View className="bg-grey-50 rounded-2xl p-4 border border-grey-100 flex-row items-center">
                    <Ionicons
                      name="checkmark-circle-outline"
                      size={18}
                      color="#10B981"
                    />
                    <Text className="ml-2 text-green-600 font-satoshi-medium text-sm">
                      No significant risk signals recorded
                    </Text>
                  </View>
                )}
              </View>
            </ScrollView>
          )}
        </View>
      </View>
    </Modal>
  );
}

function DetailRow({
  label,
  value,
  icon,
  isLast,
  valueColor = "text-black",
}: {
  label: string;
  value: string;
  icon: any;
  isLast?: boolean;
  valueColor?: string;
}) {
  return (
    <View
      className={`flex-row items-center justify-between p-4 ${
        !isLast ? "border-b border-grey-50" : ""
      }`}
    >
      <View className="flex-row items-center">
        <View className="w-8 h-8 bg-grey-50 rounded-full items-center justify-center mr-3">
          <Ionicons name={icon} size={16} color="#4B5563" />
        </View>
        <Text className="text-grey-500 font-satoshi-medium text-sm">
          {label}
        </Text>
      </View>
      <Text className={`${valueColor} font-satoshi-bold text-sm`}>{value}</Text>
    </View>
  );
}
