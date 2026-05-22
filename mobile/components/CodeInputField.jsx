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
      <View style={StyledCodeInput} key={index}>
        <AppText style={styles.codeInputText}>{digit}</AppText>
      </View>
    );
  };
  return (
    <View style={[styles.codeInputSection, containerStyle]}>
      <Pressable onPress={handleOnPress} style={[styles.codeInputContainer, inputContainerStyle]}>
        {codeDigitsArray.map(toCodeDigitInput)}
      </Pressable>
      <AppInput
        style={styles.hiddenTextInput}
        ref={textInputRef}
        value={code}
        onChangeText={handleCodeChange}
        onSubmitEditing={handleOnBlur}
        keyboardType="number-pad"
        returnKeyType="done"
        textContentType="oneTimeCode"
        maxLength={maxLength}
      />
    </View>
  );
}
