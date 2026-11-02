import { defaultFontClassName } from "@/config/fonts";
import { forwardRef } from "react";
import {
  TextInput as NativeTextInput,
  type TextInputProps,
} from "react-native";

export type TextInput = NativeTextInput;

/** Keep native input refs while applying the same default typography as labels. */
export const TextInput = forwardRef<NativeTextInput, TextInputProps>(
  function TextInput({ className, ...props }, ref) {
    return (
      <NativeTextInput
        {...props}
        ref={ref}
        className={defaultFontClassName(className)}
      />
    );
  },
);
