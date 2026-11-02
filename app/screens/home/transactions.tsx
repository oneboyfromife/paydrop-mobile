import { Text } from "@/components/shared";
import ScreenView from "@/components/layout/ScreenView";
import FraudDetailModal from "@/components/sections/FraudDetailModal";
import api from "@/services/api";
import { useUserStore } from "@/store/userStore";
import { koboToNaira } from "@/utils/currency";
import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import { useMemo, useState } from "react";
import { useInfiniteQuery } from "@tanstack/react-query";
import {
  ActivityIndicator,
  FlatList,
  RefreshControl,
  TouchableOpacity,
  View,
} from "react-native";

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
  direction?: string;
}

const FILTERS = ["All", "Sent", "Received"] as const;

type FilterType = (typeof FILTERS)[number];

export default function TransactionsScreen() {
  const accessToken = useUserStore((state) => state.accessToken);
  const accountId = useUserStore((state) => state.user?.id);
  const [filter, setFilter] = useState<FilterType>("All");
  const [selectedTxId, setSelectedTxId] = useState<string | null>(null);
  const [isFraudModalVisible, setIsFraudModalVisible] = useState(false);
  const query = useInfiniteQuery({
    queryKey: ["transactions", accountId, "history"],
    enabled: !!accessToken,
    initialPageParam: 0,
    queryFn: async ({ pageParam, signal }) => {
      const response = await api.get("/transactions", {
        params: { page: pageParam, limit: 10 },
        signal,
      });
      const body = response.data?.data ?? response.data;
      return (
        Array.isArray(body?.transactions) ? body.transactions : []
      ) as Transaction[];
    },
    getNextPageParam: (lastPage, pages) =>
      lastPage.length >= 10 ? pages.length : undefined,
  });
  const transactions = useMemo(() => {
    const byId = new Map<string, Transaction>();
    query.data?.pages
      .flat()
      .forEach((transaction) => byId.set(transaction.id, transaction));
    return [...byId.values()];
  }, [query.data]);
  const loading = query.isLoading;
  const loadingMore = query.isFetchingNextPage;
  const refreshing = query.isRefetching && !loadingMore;
  const hasMore = query.hasNextPage;
  const handleRefresh = () => {
    void query.refetch();
  };
  const loadMore = () => {
    if (hasMore && !query.isFetching) void query.fetchNextPage();
  };

  const filteredTransactions = useMemo(() => {
    return transactions.filter((tx) => {
      if (filter === "All") return true;
      if (filter === "Sent") return tx.direction === "debit";
      if (filter === "Received") return tx.direction === "credit";
      return true;
    });
  }, [transactions, filter]);

  const renderItem = ({ item }: { item: Transaction }) => {
    const isCredit = item.direction === "credit";
    const direction = isCredit ? "up" : "down";
    const amountLabel = `${isCredit ? "+" : "-"}${koboToNaira(
      Math.abs(parseInt(item.amount as any)),
    )}`;
    const date = new Date(item.createdAt).toLocaleDateString("en-NG", {
      month: "short",
      day: "numeric",
      year: "numeric",
    });

    return (
      <TouchableOpacity
        onPress={() => {
          setSelectedTxId(item.id);
          setIsFraudModalVisible(true);
        }}
        activeOpacity={0.7}
        className="bg-white rounded-3xl p-4 mb-3 border border-grey-100 shadow-sm"
      >
        <View className="flex-row justify-between items-start mb-3 gap-3">
          <View className="flex-1 min-w-0">
            <Text
              className="text-black font-satoshi-bold text-base"
              numberOfLines={2}
            >
              {item.squad_ref}
            </Text>
            <Text
              className="text-grey-500 font-satoshi-regular text-xs mt-1"
              numberOfLines={2}
            >
              {(item.fraud_verdict || "Unavailable").toUpperCase()} • {date}
            </Text>
          </View>
          <Text
            className={`font-satoshi-bold text-base shrink-0 ${direction === "up" ? "text-green-600" : "text-red-600"}`}
          >
            {amountLabel}
          </Text>
        </View>
        <View className="flex-row justify-between items-center">
          <View className="bg-grey-100 rounded-full px-3 py-1">
            <Text className="text-grey-500 font-satoshi-medium text-xs">
              {item.status}
            </Text>
          </View>
          <View className="bg-purple-50 rounded-full px-3 py-1">
            <Text className="text-purple-700 font-satoshi-medium text-xs">
              {item.fraud_score} score
            </Text>
          </View>
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <ScreenView>
      <View className="flex-1 bg-white px-6 pt-4">
        <TouchableOpacity
          onPress={() => router.back()}
          className="w-12 h-12 bg-grey-50 rounded-full items-center justify-center mb-8 border border-grey-100"
        >
          <Ionicons name="arrow-back" size={18} color="#000" />
        </TouchableOpacity>
        <Text className="text-3xl font-satoshi-bold text-black mb-3">
          Transactions
        </Text>
        <Text className="text-grey-500 font-satoshi-regular text-sm mb-6">
          View your history and filter by sent or received activity.
        </Text>

        <View className="flex-row gap-4 mb-6">
          {FILTERS.map((option) => (
            <TouchableOpacity
              key={option}
              onPress={() => setFilter(option)}
              className={`px-4 py-2 rounded-full border ${
                filter === option
                  ? "bg-purple-500 border-purple-500"
                  : "bg-white border-grey-200"
              }`}
            >
              <Text
                className={`text-sm font-satoshi-medium ${filter === option ? "text-white" : "text-grey-600"}`}
              >
                {option}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {loading && !refreshing ? (
          <View className="flex-1 items-center justify-center">
            <ActivityIndicator size="large" color="#7C3AED" />
          </View>
        ) : (
          <FlatList
            data={filteredTransactions}
            keyExtractor={(item) => item.id}
            renderItem={renderItem}
            contentContainerStyle={{ paddingBottom: 32 }}
            refreshControl={
              <RefreshControl
                refreshing={refreshing}
                onRefresh={handleRefresh}
                tintColor="#7C3AED"
              />
            }
            ListEmptyComponent={() => (
              <View className="items-center mt-16">
                <Text className="text-grey-500 font-satoshi-regular text-base">
                  {query.error
                    ? "Unable to load transactions. Pull to retry."
                    : "No transactions found for this filter."}
                </Text>
              </View>
            )}
            ListFooterComponent={() =>
              hasMore ? (
                <TouchableOpacity
                  onPress={loadMore}
                  className="bg-purple-500 rounded-3xl py-4 items-center mt-4"
                  disabled={loadingMore}
                >
                  <Text className="text-white font-satoshi-medium text-base">
                    {loadingMore ? "Loading more..." : "Load more"}
                  </Text>
                </TouchableOpacity>
              ) : null
            }
          />
        )}

        <FraudDetailModal
          visible={isFraudModalVisible}
          onClose={() => setIsFraudModalVisible(false)}
          transactionId={selectedTxId}
        />
      </View>
    </ScreenView>
  );
}
