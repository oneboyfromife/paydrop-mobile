import { Text } from "@/components/shared";
import FraudDetailModal from "@/components/sections/FraudDetailModal";
import QRModal from "@/components/sections/QRModal";
import { getMe, getTransactions, getWalletBalance } from "@/services/user";
import { useUserStore } from "@/store/userStore";
import {
  useTransferStore,
  hydrateTransferRecovery,
} from "@/store/transferStore";
import { isUnresolved } from "@/types/transfer";
import { formatNaira, koboToNaira } from "@/utils/currency";
import size from "@/utils/size";
import { Ionicons } from "@expo/vector-icons";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useRouter } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { useEffect, useState } from "react";
import {
  RefreshControl,
  ScrollView,
  TouchableOpacity,
  View,
} from "react-native";

interface User {
  id: string;
  phone?: string;
  first_name?: string;
  last_name?: string;
  username?: string;
  email?: string | null;
  avatar_url?: string | null;
  squad_virtual_account?: string | null;
  squad_bank_code?: string | null;
  kyc_verified?: boolean;
  balance?: number;
  wallet_balance?: number;
}

interface Transaction {
  id: string;
  sender_id: string;
  recipient_id: string;
  amount: number;
  status: string;
  note: string;
  squad_ref: string;
  fraud_score: number;
  fraud_verdict: string;
  createdAt: string;
  updatedAt: string;
}

const DEFAULT_USER: User = {
  id: "0",
  phone: "",
  first_name: "",
  last_name: "",
  username: "",
  email: "",
  avatar_url: "",
  squad_virtual_account: "",
  squad_bank_code: "",
  kyc_verified: false,
  balance: 0,
};

export default function HomeScreen() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const accessToken = useUserStore((state) => state.accessToken);
  const accountId = useUserStore(
    (state) => state.user?.id as string | undefined,
  );
  const pendingPayment = useTransferStore(
    (state) => !!state.active && isUnresolved(state.active.phase),
  );
  const recoveryError = useTransferStore((state) => state.recoveryError);
  const recoveryHydrated = useTransferStore((state) => state.hydrated);
  const [qrVisible, setQrVisible] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [selectedTxId, setSelectedTxId] = useState<string | null>(null);
  const [isFraudModalVisible, setIsFraudModalVisible] = useState(false);

  const {
    data: userData,
    isLoading: loadingUser,
    isRefetching: refetchingUser,
    error: userError,
  } = useQuery({
    queryKey: ["user-me", accessToken],
    queryFn: getMe,
    enabled: !!accessToken,
    retry: 1,
  });

  const {
    data: transactionsData,
    isLoading: loadingTransactions,
    isRefetching: refetchingTransactions,
    error: transactionsError,
  } = useQuery({
    queryKey: ["transactions", accessToken],
    queryFn: () => getTransactions(0, 10),
    enabled: !!accessToken,
    retry: 1,
  });

  const {
    data: balanceData,
    isLoading: loadingBalance,
    isRefetching: refetchingBalance,
    error: balanceError,
  } = useQuery({
    queryKey: ["wallet-balance", accessToken],
    queryFn: getWalletBalance,
    enabled: !!accessToken,
    retry: 1,
  });

  const user =
    accessToken && userData ? userData?.data || userData : DEFAULT_USER;
  useEffect(() => {
    if (user?.id && user.id === accountId)
      useUserStore.getState().setUser(user);
  }, [userData, accountId]);

  const handleRefresh = async () => {
    setIsRefreshing(true);
    const minDelay = new Promise((resolve) => setTimeout(resolve, 1500));
    try {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["user-me"] }),
        queryClient.invalidateQueries({ queryKey: ["transactions"] }),
        queryClient.invalidateQueries({ queryKey: ["wallet-balance"] }),
        minDelay,
      ]);
    } finally {
      setIsRefreshing(false);
    }
  };

  const refreshing =
    isRefreshing ||
    refetchingUser ||
    refetchingTransactions ||
    refetchingBalance;
  const error = userError || transactionsError || balanceError;

  const walletBalance = balanceData?.data?.balance || "";

  const transactions: Transaction[] =
    transactionsData?.transactions ??
    transactionsData?.data?.transactions ??
    [];
  const recentTransactions = transactions.slice(0, 3);

  return (
    <>
      <StatusBar style="light" />
      <QRModal visible={qrVisible} onClose={() => setQrVisible(false)} />

      <ScrollView
        className="flex-1 bg-white"
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={handleRefresh}
            tintColor="#000"
            colors={["#000"]}
          />
        }
      >
        <View className="bg-purple-500 rounded-b-[40px] pt-16 pb-8 px-6">
          <View className="flex-row justify-between items-center mb-8">
            <TouchableOpacity
              className="w-10 h-10 rounded-full bg-purple-400 items-center justify-center"
              onPress={() => setQrVisible(true)}
            >
              <Ionicons name="qr-code-outline" size={24} color="white" />
            </TouchableOpacity>
            <TouchableOpacity
              onPress={() => router.push("/screens/home/notifications")}
            >
              <Ionicons name="notifications-outline" size={24} color="white" />
            </TouchableOpacity>
          </View>

          <View className="items-center mb-8">
            <Text className="text-purple-200 font-satoshi-regular text-sm mb-1">
              Wallet Balance
            </Text>
            <View className="flex-row items-baseline">
              <Text className="text-white font-satoshi-bold text-4xl">
                {formatNaira(walletBalance)}
              </Text>
            </View>
            <View className="bg-purple-600 px-4 py-1.5 rounded-full mt-4">
              <Text className="text-white font-satoshi-medium text-sm">
                {user?.squad_virtual_account
                  ? "Account linked"
                  : "No account linked"}
              </Text>
            </View>
          </View>

          <View className="flex-row mb-6 px-1 gap-4">
            <ActionItem
              icon="send-outline"
              label="Send"
              onPress={() => router.push("/screens/home/nearby")}
            />
            <ActionItem
              icon="qr-code-outline"
              label="Receive"
              onPress={() => router.push("/screens/home/receive" as any)}
            />
            <ActionItem
              icon="add-outline"
              label="Top-up"
              onPress={() => router.push("/screens/home/topup")}
            />
          </View>

          <TouchableOpacity
            // onPress={handleCopyAccountNumber}
            className="bg-white/10 rounded-3xl px-4 py-5"
          >
            <Text className="text-purple-100 font-satoshi-medium text-sm mb-2">
              Account Number
            </Text>
            <Text className="text-white font-satoshi-bold text-2xl">
              {user?.squad_virtual_account ?? ""}
            </Text>
            <Text className="text-purple-200 font-satoshi-regular text-sm mt-1">
              {user?.squad_bank_code
                ? `GTBank • ${user.squad_bank_code}`
                : "GTBank"}
            </Text>
          </TouchableOpacity>
        </View>

        <View className="px-6 mt-8">
          {pendingPayment && (
            <TouchableOpacity
              onPress={() => router.push("/screens/payment/payment-result")}
              className="bg-purple-50 border border-purple-100 rounded-2xl p-4 mb-5"
            >
              <Text className="font-satoshi-bold text-purple-500">
                Payment processing
              </Text>
              <Text className="text-grey-500 mt-1">
                View the original payment status before sending again.
              </Text>
            </TouchableOpacity>
          )}
          {recoveryError && !recoveryHydrated && (
            <TouchableOpacity
              onPress={() => {
                if (accountId) void hydrateTransferRecovery(accountId);
              }}
              className="p-4 mb-4"
            >
              <Text className="text-red-500">{recoveryError}</Text>
              <Text className="text-purple-500 mt-2">
                Retry secure recovery
              </Text>
            </TouchableOpacity>
          )}
          <TouchableOpacity className="bg-grey-50 rounded-3xl p-5 flex-row items-center border border-grey-100 mb-6">
            <View className="w-12 h-12 bg-orange-100 rounded-2xl items-center justify-center mr-4">
              <Ionicons name="sparkles-outline" size={24} color="#F97316" />
            </View>
            <View className="flex-1">
              <Text className="text-black font-satoshi-bold text-xl">
                Stay on top of payments
              </Text>
              <Text className="text-grey-500 font-satoshi-regular text-sm mt-0.5">
                Review recent Naira transactions here.
              </Text>
            </View>
            <Ionicons name="chevron-forward" size={20} color="#9CA3AF" />
          </TouchableOpacity>

          <View className="flex-row justify-between items-center mb-6">
            <Text className="text-xl font-satoshi-medium text-black">
              Recent transactions
            </Text>
            <TouchableOpacity
              onPress={() => router.push("/screens/home/transactions")}
            >
              <Text className="text-grey-400 font-satoshi-medium text-sm">
                See all
              </Text>
            </TouchableOpacity>
          </View>

          {loadingTransactions && !refreshing ? (
            <Text className="text-grey-500 font-satoshi-regular text-base">
              Loading transactions...
            </Text>
          ) : error ? (
            <Text className="text-red-500 font-satoshi-regular text-base">
              {typeof error === "object" && error !== null
                ? (error as any).message ||
                  (error as any).error ||
                  JSON.stringify(error)
                : String(error)}
            </Text>
          ) : recentTransactions.length === 0 ? (
            <Text className="text-grey-500 font-satoshi-regular text-base">
              No recent transactions yet.
            </Text>
          ) : (
            recentTransactions.map((transaction) =>
              transaction ? (
                <TransactionItem
                  key={transaction.id}
                  transaction={transaction}
                  onPress={() => {
                    setSelectedTxId(transaction.id);
                    setIsFraudModalVisible(true);
                  }}
                />
              ) : null,
            )
          )}
        </View>
      </ScrollView>

      <FraudDetailModal
        visible={isFraudModalVisible}
        onClose={() => setIsFraudModalVisible(false)}
        transactionId={selectedTxId}
      />
    </>
  );
}

function ActionItem({
  icon,
  label,
  onPress,
}: {
  icon: any;
  label: string;
  onPress?: () => void;
}) {
  return (
    <TouchableOpacity onPress={onPress} className="items-center flex-1">
      <View className="w-full bg-purple-400/60 rounded-3xl py-6 items-center justify-center mb-2">
        <Ionicons name={icon} size={24} color="white" />
      </View>
      <Text
        style={{
          fontSize: size.fontSize(10),
        }}
        className="text-white font-satoshi-medium"
      >
        {label}
      </Text>
    </TouchableOpacity>
  );
}

function TransactionItem({
  transaction,
  onPress,
}: {
  transaction: Transaction;
  onPress: () => void;
}) {
  const direction = transaction.amount >= 0 ? "up" : "down";
  const amountLabel = `${transaction.amount >= 0 ? "+" : "-"}${koboToNaira(Math.abs(transaction.amount))}`;
  const date = new Date(transaction.createdAt).toLocaleDateString("en-NG", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
  const time = new Date(transaction.createdAt).toLocaleTimeString("en-NG", {
    hour: "2-digit",
    minute: "2-digit",
  });

  return (
    <TouchableOpacity
      onPress={onPress}
      activeOpacity={0.7}
      className="bg-grey-50 rounded-2xl p-4 mb-3 border border-grey-100 overflow-hidden"
    >
      <View className="flex-row items-start justify-between mb-3 gap-3">
        <View className="flex-row items-start flex-1 min-w-0">
          <View className="w-12 h-12 bg-white rounded-xl items-center justify-center mr-3 shrink-0">
            <Ionicons
              name={
                direction === "up" ? "arrow-up-outline" : "arrow-down-outline"
              }
              size={20}
              color="#9CA3AF"
            />
          </View>
          <View className="flex-1 min-w-0">
            <Text
              className="text-black font-satoshi-bold text-base"
              numberOfLines={2}
            >
              {transaction.squad_ref}
            </Text>
            <Text
              className="text-grey-500 font-satoshi-regular text-xs mt-1"
              numberOfLines={1}
            >
              {transaction.status}
            </Text>
          </View>
        </View>
        <Text
          className={`font-satoshi-bold text-base shrink-0 ${direction === "up" ? "text-green-600" : "text-red-600"}`}
        >
          {amountLabel}
        </Text>
      </View>
      {transaction.note ? (
        <Text
          className="text-grey-500 font-satoshi-regular text-sm mb-2"
          numberOfLines={2}
        >
          {transaction.note}
        </Text>
      ) : null}
      <View className="flex-row justify-between gap-2">
        <Text className="text-grey-400 font-satoshi-regular text-xs shrink">
          {date}
        </Text>
        <Text className="text-grey-400 font-satoshi-regular text-xs shrink-0">
          {time}
        </Text>
      </View>
    </TouchableOpacity>
  );
}
