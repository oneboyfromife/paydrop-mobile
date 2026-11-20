import { Text, TextInput } from "@/components/shared";
import { resolveDiscoveryToken } from "@/services/user";
import { useTransferStore } from "@/store/transferStore";
import { extractDiscoveryToken } from "@/utils/discoveryToken";
import { resolvedProfiles } from "@/utils/discoveryProfile";
import { Ionicons } from "@expo/vector-icons";
import { useMutation } from "@tanstack/react-query";
import { CameraView, useCameraPermissions } from "expo-camera";
import * as Haptics from "expo-haptics";
import { useFocusEffect, useRouter } from "expo-router";
import { useIsFocused } from "@react-navigation/native";
import { useCallback, useRef, useState } from "react";
import {
  ActivityIndicator,
  Linking,
  StyleSheet,
  TouchableOpacity,
  View,
} from "react-native";

export default function QRScannerScreen() {
  const router = useRouter();
  const isFocused = useIsFocused();
  const [permission, requestPermission] = useCameraPermissions();
  const [manualCode, setManualCode] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [scanLocked, setScanLocked] = useState(false);
  const isProcessingRef = useRef(false);
  const epoch = useRef(0);
  const abort = useRef<AbortController | null>(null);
  const scannerSettings = { barcodeTypes: ["qr"] as "qr"[] };
  const handleOpenSettings = () => {
    void Linking.openSettings();
  };

  useFocusEffect(
    useCallback(() => {
      epoch.current++;
      isProcessingRef.current = false;
      setScanLocked(false);
      setError(null);
      return () => {
        epoch.current++;
        abort.current?.abort();
      };
    }, []),
  );

  const { mutate: resolveMutate, isPending: resolving } = useMutation({
    mutationFn: async ({
      raw,
      requestEpoch,
    }: {
      raw: string;
      requestEpoch: number;
    }) => {
      abort.current = new AbortController();
      const token = extractDiscoveryToken(raw);
      if (!token) throw new Error("Enter a valid PayDrop recipient code.");
      const response = await resolveDiscoveryToken(token, abort.current.signal);
      const recipient = resolvedProfiles(response)[0];
      if (!recipient)
        throw new Error("This recipient code is invalid or expired.");
      return { recipient, requestEpoch };
    },
    onSuccess: ({ recipient, requestEpoch }) => {
      if (requestEpoch !== epoch.current) return;
      useTransferStore.getState().selectRecipient(recipient);
      router.push("/screens/payment/recipient-preview" as any);
    },
    onError: (error, { requestEpoch }) => {
      if (requestEpoch !== epoch.current) return;
      const code = (error as { code?: string | null }).code;
      setError(
        code === "TOKEN_INVALID" || code === "TOKEN_EXPIRED"
          ? (error as { message: string }).message
          : error instanceof Error
            ? error.message
            : "Unable to resolve this recipient. Check your connection and use a current code.",
      );
      isProcessingRef.current = false;
      setScanLocked(false);
    },
  });

  const resolveRawCode = (raw: string) => {
    if (!raw.trim() || isProcessingRef.current || resolving) return;
    isProcessingRef.current = true;
    setScanLocked(true);
    setError(null);
    resolveMutate({ raw: raw.trim(), requestEpoch: epoch.current });
  };
  const handleBarCodeScanned = (scanResult: { type: string; data: string }) => {
    if (scanLocked || isProcessingRef.current || resolving) return;
    void Haptics.notificationAsync(
      Haptics.NotificationFeedbackType.Success,
    ).catch(() => {});
    resolveRawCode(scanResult.data);
  };
  const handleManualResolve = () => resolveRawCode(manualCode);
  const manualEntry = (
    <View>
      <TextInput
        accessibilityLabel="Recipient code"
        value={manualCode}
        onChangeText={setManualCode}
        placeholder="Paste recipient code"
        autoCapitalize="none"
        autoCorrect={false}
        style={{
          borderWidth: 1,
          borderColor: "#D1D5DB",
          borderRadius: 12,
          padding: 14,
          marginTop: 16,
        }}
      />
      <TouchableOpacity
        disabled={resolving || scanLocked || !manualCode.trim()}
        onPress={handleManualResolve}
        style={{ padding: 16 }}
      >
        <Text style={{ color: "#A855F7", textAlign: "center" }}>
          {resolving
            ? "Looking up recipient..."
            : "Continue with recipient code"}
        </Text>
      </TouchableOpacity>
      {error && <Text style={{ color: "#DC2626" }}>{error}</Text>}
    </View>
  );

  if (!permission) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color="#A855F7" />
      </View>
    );
  }

  if (!permission.granted) {
    return (
      <View className="flex-1 bg-white px-10">
        <TouchableOpacity
          onPress={() => router.back()}
          className="mt-14 w-10 h-10 bg-grey-50 rounded-full items-center justify-center border border-grey-100"
        >
          <Ionicons name="close" size={24} color="#1A1A1A" />
        </TouchableOpacity>

        <View className="flex-1 items-center justify-center -mt-20">
          <Ionicons name="camera-outline" size={64} color="#9CA3AF" />
          <Text className="text-[#1A1A1A] font-satoshi-bold text-[20px] mb-2 mt-4">
            Camera access needed
          </Text>
          <Text className="text-[#6B7280] font-satoshi-regular text-[14px] text-center mb-8">
            To scan QR codes, we need camera access.
          </Text>
          <TouchableOpacity
            onPress={
              permission.canAskAgain ? requestPermission : handleOpenSettings
            }
            className="bg-purple-500 rounded-2xl px-8 py-5 w-full items-center"
          >
            <Text className="text-white text-[16px] font-satoshi-bold">
              {permission.canAskAgain ? "Grant Permission" : "Open Settings"}
            </Text>
          </TouchableOpacity>
          {manualEntry}
        </View>
      </View>
    );
  }

  if (!isFocused) return <View style={styles.container} />;

  return (
    <View style={styles.container}>
      <CameraView
        key={isFocused ? "focused" : "blurred"}
        style={StyleSheet.absoluteFillObject}
        facing="back"
        onBarcodeScanned={
          scanLocked || resolving ? undefined : handleBarCodeScanned
        }
        barcodeScannerSettings={scannerSettings}
        active={isFocused}
        {...({ barcodeScannerEnabled: true } as any)}
      />

      <View style={styles.overlay} pointerEvents="none">
        <View style={styles.scanFrame}>
          <View style={[styles.corner, styles.topLeft]} />
          <View style={[styles.corner, styles.topRight]} />
          <View style={[styles.corner, styles.bottomLeft]} />
          <View style={[styles.corner, styles.bottomRight]} />
        </View>
      </View>

      <View style={styles.header}>
        <TouchableOpacity
          onPress={() => router.back()}
          className="w-10 h-10 bg-white/20 rounded-full items-center justify-center"
        >
          <Ionicons name="close" size={24} color="white" />
        </TouchableOpacity>
        <View className="flex-1 items-center mr-10">
          <Text className="text-white font-satoshi-bold text-[18px]">
            Scan their QR code
          </Text>
        </View>
      </View>

      {resolving && (
        <View style={styles.resolvingBanner}>
          <ActivityIndicator size="small" color="#FFFFFF" />
          <Text className="text-white font-satoshi-medium text-[14px] ml-2">
            Looking up user...
          </Text>
        </View>
      )}

      {error && (
        <View style={styles.errorBanner}>
          <Text className="text-white font-satoshi-bold text-[14px] text-center">
            {error}
          </Text>
        </View>
      )}

      <View style={styles.manualInput}>
        <Text className="text-[#6B7280] font-satoshi-medium text-[12px] mb-3 ml-1">
          Enter code manually
        </Text>
        <View className="flex-row items-center bg-[#F3F4F6] rounded-2xl px-4 h-[56px] border border-grey-100">
          <TextInput
            value={manualCode}
            onChangeText={setManualCode}
            placeholder="Paste code or token"
            placeholderTextColor="#9CA3AF"
            className="flex-1 text-[#1A1A1A] font-satoshi-regular text-[15px]"
            autoCapitalize="none"
            autoCorrect={false}
          />
          <TouchableOpacity
            onPress={handleManualResolve}
            disabled={!manualCode.trim() || resolving || scanLocked}
            className="ml-2 bg-purple-500 rounded-xl px-4 py-2"
          >
            {resolving ? (
              <ActivityIndicator size="small" color="#FFFFFF" />
            ) : (
              <Text className="text-white font-satoshi-bold text-[14px]">
                Resolve
              </Text>
            )}
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#000",
  },
  centered: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#fff",
  },
  overlay: {
    ...StyleSheet.absoluteFillObject,
    alignItems: "center",
    justifyContent: "center",
  },
  scanFrame: {
    width: 240,
    height: 240,
    position: "relative",
  },
  corner: {
    position: "absolute",
    width: 24,
    height: 24,
    borderColor: "#fff",
  },
  topLeft: {
    top: 0,
    left: 0,
    borderLeftWidth: 3,
    borderTopWidth: 3,
  },
  topRight: {
    top: 0,
    right: 0,
    borderRightWidth: 3,
    borderTopWidth: 3,
  },
  bottomLeft: {
    bottom: 0,
    left: 0,
    borderLeftWidth: 3,
    borderBottomWidth: 3,
  },
  bottomRight: {
    bottom: 0,
    right: 0,
    borderRightWidth: 3,
    borderBottomWidth: 3,
  },
  header: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    paddingTop: 60,
    paddingBottom: 16,
    paddingHorizontal: 24,
    flexDirection: "row",
    alignItems: "center",
  },
  resolvingBanner: {
    position: "absolute",
    top: 130,
    left: 24,
    right: 24,
    backgroundColor: "#8B5CF6",
    paddingVertical: 16,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
    flexDirection: "row",
  },
  errorBanner: {
    position: "absolute",
    top: 130,
    left: 24,
    right: 24,
    backgroundColor: "#FF6B6B",
    paddingVertical: 16,
    paddingHorizontal: 12,
    borderRadius: 16,
    alignItems: "center",
    elevation: 5,
    shadowColor: "#000",
    shadowOpacity: 0.2,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 4 },
  },
  manualInput: {
    position: "absolute",
    bottom: 40,
    left: 24,
    right: 24,
    backgroundColor: "#fff",
    borderRadius: 24,
    padding: 24,
    elevation: 10,
    shadowColor: "#000",
    shadowOpacity: 0.15,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: -4 },
  },
});
