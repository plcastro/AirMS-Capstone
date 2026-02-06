import { useState, useEffect } from "react";
import { Dimensions } from "react-native";

export default function useResponsiveWeb(breakpoint = 768) {
  const [isWide, setIsWide] = useState(
    Dimensions.get("window").width >= breakpoint,
  );

  useEffect(() => {
    const handleResize = ({ window }) => {
      setIsWide(window.width >= breakpoint);
    };
    const subscription = Dimensions.addEventListener("change", handleResize);
    return () => subscription?.remove?.();
  }, [breakpoint]);

  return isWide;
}
