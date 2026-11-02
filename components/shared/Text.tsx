import { defaultFontClassName } from "@/config/fonts";
import { Text as DefaultText, useColorScheme } from "react-native";

type TextProps = DefaultText["props"] & {
  lightColor?: string;
  darkColor?: string;
};

export function Text(props: TextProps) {
  const { style, className, lightColor, darkColor, ...otherProps } = props;
  const theme = useColorScheme() ?? "light";
  const color = theme === "light" ? lightColor : darkColor;

  return (
    <DefaultText
      className={defaultFontClassName(className)}
      style={[color ? { color } : undefined, style]}
      {...otherProps}
    />
  );
}
