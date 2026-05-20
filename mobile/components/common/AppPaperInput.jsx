import React, { useMemo } from "react";
import { TextInput } from "react-native-paper";

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

export default function AppPaperInput({
  contentStyle,
  labelStyle,
  allowFontScaling = true,
  ...rest
}) {
  const { scale } = useFontScale();
  const nextContentStyle = useMemo(
    () => scaleStyleFontSize(contentStyle, scale),
    [contentStyle, scale],
  );
  const nextLabelStyle = useMemo(
    () => scaleStyleFontSize(labelStyle, scale),
    [labelStyle, scale],
  );

  return (
    <TextInput
      {...rest}
      allowFontScaling={allowFontScaling}
      contentStyle={nextContentStyle}
      labelStyle={nextLabelStyle}
    />
  );
}
