import ScreenView from "@/components/layout/ScreenView";
import { Text } from "@/components/shared";
import { COLORS } from "@/config/colors";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { useRef, useState } from "react";
import {
  Dimensions,
  FlatList,
  Image,
  StyleSheet,
  TouchableOpacity,
  View,
} from "react-native";

const { width } = Dimensions.get("window");

const slides = [
  {
    id: "1",
    title: "Send money safely",
    subtitle: "Fast and secure transfers to anyone, anywhere.",
    icon: "shield-checkmark-outline",
  },
  {
    id: "2",
    title: "Trust nearby vendors",
    subtitle: "Find and pay trusted local vendors with ease.",
    icon: "location-outline",
  },
  {
    id: "3",
    title: "Pay people, not numbers",
    subtitle: "Say goodbye to long account numbers. Pay directly.",
    icon: "people-outline",
  },
];

import { useAppState } from "@/store/appState";

export default function OnboardingScreen() {
  const router = useRouter();
  const [currentIndex, setCurrentIndex] = useState(0);
  const flatListRef = useRef<FlatList>(null);
  const { setHasSeenIntro } = useAppState();

  const handleStartAuth = () => {
    setHasSeenIntro(true);
    router.replace("/(auth)/login");
  };

  const handleNext = () => {
    if (currentIndex < slides.length - 1) {
      flatListRef.current?.scrollToIndex({ index: currentIndex + 1 });
    } else {
      handleStartAuth();
    }
  };

  const renderItem = ({ item }: { item: (typeof slides)[0] }) => (
    <View style={{ width }} className="flex-1 items-center justify-center px-8">
      <View className="w-72 h-72 bg-purple-100 rounded-3xl items-center justify-center mb-12 overflow-hidden">
        <View className="absolute inset-0 opacity-20">
          <Image
            source={require("@/assets/images/bg-mesh.png")}
            className="w-full h-full"
            resizeMode="cover"
          />
        </View>
        <Ionicons
          name={item.icon as any}
          size={120}
          color={COLORS.purple[500]}
        />
      </View>
      <Text className="text-3xl font-satoshi-bold text-black text-center mb-4">
        {item.title}
      </Text>
      <Text className="text-base font-satoshi-regular text-grey-500 text-center leading-6 px-4">
        {item.subtitle}
      </Text>
    </View>
  );

  return (
    <ScreenView>
      <View className="flex-1 bg-white">
        {/* Background Mesh Overlay */}
        <View className="absolute inset-0 opacity-5">
          <Image
            source={require("../../assets/images/bg-mesh.png")}
            className="w-full h-full"
          />
        </View>

        <View className="flex-row justify-end pt-4 px-6 h-24">
          {currentIndex < slides.length - 1 ? (
            <TouchableOpacity onPress={handleStartAuth} className="py-2 px-4">
              <Text className="text-base font-satoshi-bold text-purple-500">
                Skip
              </Text>
            </TouchableOpacity>
          ) : (
            <View className="w-12" />
          )}
        </View>

        <FlatList
          ref={flatListRef}
          data={slides}
          renderItem={renderItem}
          horizontal
          showsHorizontalScrollIndicator={false}
          pagingEnabled
          bounces={false}
          onMomentumScrollEnd={(event) => {
            const index = Math.round(event.nativeEvent.contentOffset.x / width);
            setCurrentIndex(index);
          }}
          keyExtractor={(item) => item.id}
        />

        <View className="h-44 justify-between px-8 pb-12">
          <View className="flex-row justify-center items-center mb-8">
            {slides.map((_, index) => (
              <View
                key={index}
                className={`h-2 rounded-full mx-1 ${
                  currentIndex === index
                    ? "w-8 bg-purple-500"
                    : "w-2 bg-grey-300"
                }`}
              />
            ))}
          </View>

          {currentIndex === slides.length - 1 ? (
            <TouchableOpacity
              className="bg-purple-500 h-16 rounded-2xl justify-center items-center"
              onPress={handleStartAuth}
            >
              <Text className="text-white font-satoshi-bold text-lg">
                Get Started
              </Text>
            </TouchableOpacity>
          ) : (
            <TouchableOpacity
              className="bg-purple-500 h-16 rounded-2xl justify-center items-center"
              onPress={handleNext}
            >
              <Text className="text-white font-satoshi-bold text-lg">
                Continue
              </Text>
            </TouchableOpacity>
          )}
        </View>
      </View>
    </ScreenView>
  );
}

const styles = StyleSheet.create({});
