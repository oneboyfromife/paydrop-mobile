import { Text, TextInput } from "@/components/shared";
import { COLORS } from "@/config/colors";
import { Ionicons } from "@expo/vector-icons";
import { useMemo, useState } from "react";
import { Alert, ScrollView, TouchableOpacity, View } from "react-native";

interface Bank {
  code: string;
  name: string;
}

const BANKS: Bank[] = [
  { code: "050", name: "GTBank" },
  { code: "011", name: "First Bank" },
  { code: "058", name: "Zenith Bank" },
  { code: "044", name: "Access Bank" },
  { code: "023", name: "CBN" },
  { code: "076", name: "Polaris Bank" },
  { code: "070", name: "Fidelity Bank" },
  { code: "032", name: "Union Bank" },
];

const PAYDROP_USERS = [
  { id: "1", name: "Ada Okeke", username: "@AdaPay" },
  { id: "2", name: "Chidi Nwosu", username: "@ChidiDrop" },
  { id: "3", name: "Sade Afolabi", username: "@SadeSend" },
  { id: "4", name: "Emeka Obi", username: "@EmekaFunds" },
];

function generateId() {
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 11)}`;
}

export default function TransferScreen() {
  const [activeTab, setActiveTab] = useState<"paydrop" | "bank">("paydrop");
  const [search, setSearch] = useState("");
  const [selectedUser, setSelectedUser] = useState<{
    id: string;
    name: string;
    username: string;
  } | null>(null);
  const [selectedBank, setSelectedBank] = useState<Bank>(BANKS[0]);
  const [accountNumber, setAccountNumber] = useState("");
  const [accountName, setAccountName] = useState("");
  const [amount, setAmount] = useState("");
  const [note, setNote] = useState("");
  const [processing, setProcessing] = useState(false);
  const [idempotencyKey] = useState(generateId);

  const filteredUsers = useMemo(() => {
    const query = search.toLowerCase();
    return PAYDROP_USERS.filter(
      (user) =>
        user.name.toLowerCase().includes(query) ||
        user.username.toLowerCase().includes(query),
    );
  }, [search]);

  const filteredBanks = useMemo(() => {
    const query = search.toLowerCase();
    return BANKS.filter(
      (bank) =>
        bank.name.toLowerCase().includes(query) || bank.code.includes(query),
    );
  }, [search]);

  const handleLookup = () => {
    if (accountNumber.length !== 10) {
      Alert.alert("Invalid account", "Account number must be 10 digits.");
      return;
    }
    setAccountName(`Verified ${selectedBank.name} account`);
  };

  const handleSend = async () => {
    const parsedAmount = Number(amount.replace(/\D/g, ""));
    if (!parsedAmount || parsedAmount < 100) {
      Alert.alert("Invalid amount", "Enter a valid NGN amount over 100.");
      return;
    }
    setProcessing(true);
    await new Promise((resolve) => setTimeout(resolve, 1400));
    setProcessing(false);
    Alert.alert("Success", "Your transfer is pending.");
  };

  return (
    <ScrollView
      className="flex-1 bg-white px-6 pt-14"
      showsVerticalScrollIndicator={false}
    >
      <Text className="text-3xl font-satoshi-bold text-black mb-4">
        Send money
      </Text>
      <Text className="text-grey-500 font-satoshi-regular text-sm mb-6">
        Send to a PayDrop user or transfer directly to another bank.
      </Text>

      <View className="flex-row mb-6 bg-grey-100 rounded-full p-1">
        <TouchableOpacity
          onPress={() => {
            setActiveTab("paydrop");
            setSearch("");
          }}
          className={`flex-1 py-3 rounded-full items-center ${activeTab === "paydrop" ? "bg-white" : "bg-transparent"}`}
        >
          <Text
            className={`font-satoshi-bold text-sm ${activeTab === "paydrop" ? "text-black" : "text-grey-500"}`}
          >
            PayDrop user
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          onPress={() => {
            setActiveTab("bank");
            setSearch("");
          }}
          className={`flex-1 py-3 rounded-full items-center ${activeTab === "bank" ? "bg-white" : "bg-transparent"}`}
        >
          <Text
            className={`font-satoshi-bold text-sm ${activeTab === "bank" ? "text-black" : "text-grey-500"}`}
          >
            Other bank
          </Text>
        </TouchableOpacity>
      </View>

      <View className="bg-grey-50 rounded-3xl p-4 mb-6 border border-grey-100">
        <View className="flex-row items-center bg-white rounded-2xl px-4 py-3 border border-grey-200 mb-4">
          <Ionicons
            name="search-outline"
            size={20}
            color={COLORS.purple[500]}
          />
          <TextInput
            value={search}
            onChangeText={setSearch}
            placeholder={
              activeTab === "paydrop"
                ? "Search PayDrop users"
                : "Search bank name or code"
            }
            placeholderTextColor="#9CA3AF"
            className="ml-3 flex-1 text-sm font-satoshi-regular text-black"
          />
        </View>

        {activeTab === "paydrop"
          ? filteredUsers.map((user) => (
              <TouchableOpacity
                key={user.id}
                onPress={() => setSelectedUser(user)}
                className={`p-4 rounded-3xl mb-3 border ${selectedUser?.id === user.id ? "border-purple-500 bg-purple-50" : "border-grey-100 bg-white"}`}
              >
                <Text className="text-black font-satoshi-bold">
                  {user.name}
                </Text>
                <Text className="text-grey-500 font-satoshi-regular text-xs mt-1">
                  {user.username}
                </Text>
              </TouchableOpacity>
            ))
          : filteredBanks.map((bank) => (
              <TouchableOpacity
                key={bank.code}
                onPress={() => setSelectedBank(bank)}
                className={`p-4 rounded-3xl mb-3 border ${selectedBank.code === bank.code ? "border-purple-500 bg-purple-50" : "border-grey-100 bg-white"}`}
              >
                <Text className="text-black font-satoshi-bold">
                  {bank.name}
                </Text>
                <Text className="text-grey-500 font-satoshi-regular text-xs mt-1">
                  Code {bank.code}
                </Text>
              </TouchableOpacity>
            ))}
      </View>

      {activeTab === "paydrop" ? (
        <View className="bg-grey-50 rounded-3xl p-4 mb-6 border border-grey-100">
          <Text className="text-grey-500 font-satoshi-medium text-xs mb-2">
            Selected PayDrop user
          </Text>
          <Text className="text-black font-satoshi-bold text-base mb-3">
            {selectedUser ? selectedUser.name : "No user selected"}
          </Text>
          <View className="bg-white rounded-3xl p-4 border border-grey-200 mb-4">
            <Text className="text-grey-500 font-satoshi-medium text-xs">
              Amount (NGN)
            </Text>
            <TextInput
              value={amount}
              onChangeText={setAmount}
              placeholder="0"
              keyboardType="numeric"
              placeholderTextColor="#9CA3AF"
              className="text-black text-2xl font-satoshi-bold mt-2"
            />
          </View>
          <View className="bg-white rounded-3xl p-4 border border-grey-200 mb-4">
            <Text className="text-grey-500 font-satoshi-medium text-xs">
              Note (optional)
            </Text>
            <TextInput
              value={note}
              onChangeText={setNote}
              placeholder="Reason for transfer"
              placeholderTextColor="#9CA3AF"
              className="text-black text-base font-satoshi-regular mt-2"
            />
          </View>
          <TouchableOpacity
            onPress={handleSend}
            disabled={!selectedUser || !amount || processing}
            className={`rounded-3xl py-4 items-center ${selectedUser && amount && !processing ? "bg-purple-500" : "bg-grey-300"}`}
          >
            <Text className="text-white font-satoshi-bold text-base">
              {processing ? "Processing..." : "Send"}
            </Text>
          </TouchableOpacity>
        </View>
      ) : (
        <View className="bg-grey-50 rounded-3xl p-4 mb-6 border border-grey-100">
          <View className="bg-white rounded-3xl p-4 border border-grey-200 mb-4">
            <Text className="text-grey-500 font-satoshi-medium text-xs mb-2">
              Selected bank
            </Text>
            <Text className="text-black font-satoshi-bold text-base">
              {selectedBank.name}
            </Text>
            <Text className="text-grey-500 font-satoshi-regular text-xs">
              Code {selectedBank.code}
            </Text>
          </View>
          <View className="bg-white rounded-3xl p-4 border border-grey-200 mb-4">
            <Text className="text-grey-500 font-satoshi-medium text-xs mb-2">
              Account number
            </Text>
            <TextInput
              value={accountNumber}
              onChangeText={(value) =>
                setAccountNumber(value.replace(/\D/g, ""))
              }
              placeholder="1234567890"
              keyboardType="number-pad"
              maxLength={10}
              placeholderTextColor="#9CA3AF"
              className="text-black text-base font-satoshi-regular"
            />
          </View>
          <TouchableOpacity
            onPress={handleLookup}
            className="bg-purple-500 rounded-3xl py-4 items-center mb-4"
          >
            <Text className="text-white font-satoshi-bold text-base">
              Lookup account name
            </Text>
          </TouchableOpacity>
          <View className="bg-white rounded-3xl p-4 border border-grey-200 mb-4">
            <Text className="text-grey-500 font-satoshi-medium text-xs mb-2">
              Account name
            </Text>
            <Text className="text-black font-satoshi-bold text-base">
              {accountName || "Not available"}
            </Text>
          </View>
          <View className="bg-white rounded-3xl p-4 border border-grey-200 mb-4">
            <Text className="text-grey-500 font-satoshi-medium text-xs mb-2">
              Amount (NGN)
            </Text>
            <TextInput
              value={amount}
              onChangeText={setAmount}
              placeholder="0"
              keyboardType="numeric"
              placeholderTextColor="#9CA3AF"
              className="text-black text-2xl font-satoshi-bold"
            />
          </View>
          <Text className="text-grey-500 font-satoshi-regular text-xs mb-4">
            Idempotency key generated once per screen.
          </Text>
          <TouchableOpacity
            onPress={handleSend}
            disabled={
              !accountName ||
              accountNumber.length !== 10 ||
              !amount ||
              processing
            }
            className={`rounded-3xl py-4 items-center ${accountName && accountNumber.length === 10 && amount && !processing ? "bg-purple-500" : "bg-grey-300"}`}
          >
            <Text className="text-white font-satoshi-bold text-base">
              {processing ? "Processing..." : "Confirm transfer"}
            </Text>
          </TouchableOpacity>
        </View>
      )}

      <View className="bg-grey-50 rounded-3xl p-4 border border-grey-100">
        <Text className="text-grey-500 font-satoshi-medium text-xs mb-2">
          Idempotency key
        </Text>
        <Text className="text-black font-satoshi-regular text-xs break-words">
          {idempotencyKey}
        </Text>
      </View>
    </ScrollView>
  );
}
