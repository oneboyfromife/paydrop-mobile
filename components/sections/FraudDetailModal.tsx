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

  const fraudData = data?.data || data;

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
                    fraudData?.fraud_score < 30
                      ? "border-green-100"
                      : fraudData?.fraud_score < 70
                        ? "border-yellow-100"
                        : "border-red-100"
                  }`}
                >
                  <Text
                    className={`text-4xl font-satoshi-bold ${getScoreColor(
                      fraudData?.fraud_score || 0,
                    )}`}
                  >
                    {fraudData?.fraud_score || 0}
                  </Text>
                  <Text className="text-grey-400 font-satoshi-medium text-xs">
                    RISK SCORE
                  </Text>
                </View>
                <View
                  className={`mt-4 px-4 py-1.5 rounded-full ${getScoreBg(
                    fraudData?.fraud_score || 0,
                  )}`}
                >
                  <Text
                    className={`font-satoshi-bold text-sm ${getScoreColor(
                      fraudData?.fraud_score || 0,
                    )}`}
                  >
                    {fraudData?.fraud_verdict?.toUpperCase() || "UNKNOWN"}
                  </Text>
                </View>
              </View>

              <View className="space-y-6">
                {/* Risk Factors */}
                <View>
                  <Text className="text-black font-satoshi-bold text-base mb-3">
                    Risk Indicators
                  </Text>
                  <View className="bg-grey-50 rounded-2xl p-4 border border-grey-100">
                    {fraudData?.risk_factors?.length > 0 ? (
                      fraudData.risk_factors.map(
                        (factor: string, index: number) => (
                          <View
                            key={index}
                            className="flex-row items-start mb-2 last:mb-0"
                          >
                            <Ionicons
                              name="warning-outline"
                              size={16}
                              color="#F59E0B"
                              style={{ marginTop: 2 }}
                            />
                            <Text className="ml-2 text-grey-700 font-satoshi-regular text-sm flex-1">
                              {factor}
                            </Text>
                          </View>
                        ),
                      )
                    ) : (
                      <View className="flex-row items-center">
                        <Ionicons
                          name="checkmark-circle-outline"
                          size={18}
                          color="#10B981"
                        />
                        <Text className="ml-2 text-green-600 font-satoshi-medium text-sm">
                          No significant risk factors detected
                        </Text>
                      </View>
                    )}
                  </View>
                </View>

                {/* Device Info */}
                <View className="mt-6">
                  <Text className="text-black font-satoshi-bold text-base mb-3">
                    Device Details
                  </Text>
                  <View className="bg-white rounded-2xl border border-grey-100 overflow-hidden">
                    <DetailRow
                      label="Device Model"
                      value={fraudData?.device_info?.model || "Unknown"}
                      icon="phone-portrait-outline"
                    />
                    <DetailRow
                      label="OS Version"
                      value={fraudData?.device_info?.os || "Unknown"}
                      icon="settings-outline"
                    />
                    <DetailRow
                      label="IP Address"
                      value={fraudData?.ip_address || "Unknown"}
                      icon="globe-outline"
                    />
                    <DetailRow
                      label="Location"
                      value={
                        fraudData?.location
                          ? `${fraudData.location.city}, ${fraudData.location.country}`
                          : "Unknown"
                      }
                      icon="location-outline"
                      isLast
                    />
                  </View>
                </View>

                {/* Network Info */}
                {fraudData?.network_info && (
                  <View className="mt-6">
                    <Text className="text-black font-satoshi-bold text-base mb-3">
                      Network Analysis
                    </Text>
                    <View className="bg-white rounded-2xl border border-grey-100 overflow-hidden">
                      <DetailRow
                        label="VPN Detected"
                        value={fraudData.network_info.vpn ? "Yes" : "No"}
                        icon="shield-checkmark-outline"
                        valueColor={
                          fraudData.network_info.vpn
                            ? "text-red-600"
                            : "text-green-600"
                        }
                      />
                      <DetailRow
                        label="Proxy Detected"
                        value={fraudData.network_info.proxy ? "Yes" : "No"}
                        icon="swap-horizontal-outline"
                        valueColor={
                          fraudData.network_info.proxy
                            ? "text-red-600"
                            : "text-green-600"
                        }
                        isLast
                      />
                    </View>
                  </View>
                )}
              </View>

              <TouchableOpacity
                onPress={onClose}
                className="mt-10 bg-black h-14 rounded-2xl items-center justify-center"
              >
                <Text className="text-white font-satoshi-bold text-base">
                  Dismiss
                </Text>
              </TouchableOpacity>
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
