import React, { useState, useEffect, useRef } from "react";
import "../../App.css";
import { Input } from "antd";
export default function CodeInputField({
  setPinReady,
  code,
  setCode,
  maxLength,
}) {
  const codeDigitsArray = new Array(maxLength).fill(0);
  const inputRef = useRef(null);

  const [inputContainerIsFocused, setInputContainerIsFocused] = useState(false);

  const handleOnClick = () => {
    setInputContainerIsFocused(true);
    inputRef?.current?.focus({ preventScroll: true });
  };

  const handleOnBlur = () => {
    setInputContainerIsFocused(false);
  };

  useEffect(() => {
    setPinReady(code.length === maxLength);
    return () => setPinReady(false);
  }, [code, maxLength, setPinReady]);

  const toCodeDigitInput = (value, index) => {
    const emptyInputChar = "\u00A0"; // non-breaking space
    const digit = code[index] || emptyInputChar;
    const isCurrentDigit = index === code.length;
    const isLastDigit = index === maxLength - 1;
    const isCodeFull = code.length === maxLength;

    const isDigitFocused = isCurrentDigit || (isLastDigit && isCodeFull);

    const digitClass =
      inputContainerIsFocused && isDigitFocused
        ? "code-input-focused"
        : "code-input";

    return (
      <div className={digitClass} key={index}>
        <span className="code-input-text">{digit}</span>
      </div>
    );
  };

  return (
    <div className="code-input-section">
      <div className="code-input-container" onClick={handleOnClick}>
        {codeDigitsArray.map(toCodeDigitInput)}
      </div>
      <Input
        ref={inputRef}
        type="text"
        value={code}
        onChange={(e) => setCode(e.target.value)}
        onBlur={handleOnBlur}
        maxLength={maxLength}
        inputMode="numeric"
        pattern="\d*"
        className="hidden-text-input"
        autoFocus={false}
      />
    </div>
  );
}
