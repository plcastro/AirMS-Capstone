import React, { useMemo } from "react";
import {
  TextInput as RNTextInput
} from "react-native";
import { useFontScale } from "../../Context/FontScaleContext";

const scaleStyleFontSize = (style, scale) => {
  if (!style) return style;

  if (Array.isArray(style)) {
    return style.map((item) => scaleStyleFontSize(item, scale));
  }

  if (typeof style !== "object") {
    return style;
  }

  const next = { ...style };
  if (typeof next.fontSize === "number") {
    next.fontSize = scale(next.fontSize);
  }
  return next;
};

export default function AppInput({ style, allowFontScaling = true, ...rest }) {
  const { scale } = useFontScale();
  const scaledStyle = useMemo(
    () => scaleStyleFontSize(style, scale),
    [style, scale],
  );

  return (
    <RNTextInput
      {...rest}
      allowFontScaling={allowFontScaling}
      style={scaledStyle}
    />
  );
}
