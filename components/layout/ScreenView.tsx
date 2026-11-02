import React from "react";
import { View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

interface ScreenViewProps {
  children: React.ReactNode;
  className?: string;
  hasSafeArea?: boolean;
}

const ScreenView = ({
  children,
  className,
  hasSafeArea = true,
}: ScreenViewProps) => {
  const inset = useSafeAreaInsets();
  return (
    <View
      className={`flex-1 bg-white ${className}`}
      style={{ paddingTop: hasSafeArea ? inset.top : 0 }}
    >
      {children}
    </View>
  );
};

export default ScreenView;
