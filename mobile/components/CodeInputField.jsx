import {
  View,
  Pressable
} from "react-native";
import AppText from "./common/AppText";
import AppInput from "./common/AppInput";
import React, { useState, useRef, useEffect } from "react";
import { styles } from "../stylesheets/styles";

export default function CodeInputField({
  setPinReady,
  code,
  setCode,
  maxLength,
  secure = false,
  containerStyle,
  inputContainerStyle,
  fluid = false,
  autoFocus = false,
}) {
  const codeDigitsArray = new Array(maxLength).fill(0);
  const textInputRef = useRef(null);

  const [inputContainerIsFocused, setInputContainerIsFocused] = useState(false);
  const handleOnPress = () => {
    setInputContainerIsFocused(true);
    textInputRef?.current?.focus();
  };
  const handleOnBlur = () => {
    setInputContainerIsFocused(false);
  };

  useEffect(() => {
    if (!autoFocus) return;
    // Wait a frame so the input is attached before requesting focus.
    const timer = setTimeout(handleOnPress, 100);
    return () => clearTimeout(timer);
  }, [autoFocus]);

  useEffect(() => {
    setPinReady?.(code.length === maxLength);
    return () => setPinReady?.(false);
  }, [code, maxLength, setPinReady]);

  const handleCodeChange = (value) => {
    setCode(value.replace(/\D/g, "").slice(0, maxLength));
  };

  const toCodeDigitInput = (value, index) => {
    const emptyInputChar = " ";
    const digit = code[index] ? (secure ? "•" : code[index]) : emptyInputChar;
    const isCurrentDigit = index === code.length;
    const isLastDigit = index === maxLength - 1;
    const isCodeFull = code.length === maxLength;

    const isDigitFocused = isCurrentDigit || (isLastDigit && isCodeFull);

    const StyledCodeInput =
      inputContainerIsFocused && isDigitFocused
        ? styles.codeInputFocused
        : styles.codeInput;

    return (
      <View style={[StyledCodeInput, fluid && fluidDigitStyle]} key={index}>
        <AppText style={styles.codeInputText}>{digit}</AppText>
      </View>
    );
  };
  return (
    <View style={[styles.codeInputSection, containerStyle]}>
      <Pressable
        onPress={handleOnPress}
        style={[
          styles.codeInputContainer,
          fluid && { gap: 6, justifyContent: "center" },
          inputContainerStyle,
        ]}
      >
        {codeDigitsArray.map(toCodeDigitInput)}
      </Pressable>
      <AppInput
        style={styles.hiddenTextInput}
        ref={textInputRef}
        value={code}
        onChangeText={handleCodeChange}
        onSubmitEditing={handleOnBlur}
        onBlur={handleOnBlur}
        keyboardType="number-pad"
        returnKeyType="done"
        textContentType="oneTimeCode"
        maxLength={maxLength}
      />
    </View>
  );
}

// Lets the digit boxes share the available width so six fit on narrow screens.
const fluidDigitStyle = {
  flex: 1,
  width: undefined,
  minWidth: 0,
  maxWidth: 52,
  height: 48,
  padding: 0,
  alignItems: "center",
  justifyContent: "center",
};
