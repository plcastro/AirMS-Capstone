import React, { useCallback, useContext, useEffect, useState } from "react";
import { TouchableOpacity, View } from "react-native";
import { useFocusEffect, useNavigation } from "@react-navigation/native";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { AuthContext } from "../Context/AuthContext";
import { COLORS } from "../stylesheets/colors";

export default function Dashboard({ children, currentRouteName }) {
  const { user } = useContext(AuthContext);
  const navigation = useNavigation();
  const insets = useSafeAreaInsets();
  const [showFabMenu, setShowFabMenu] = useState(false);
  if (!user) return null;

  const normalizedRole = String(user?.jobTitle || "").toLowerCase();
  const canAccessMessages = [
    "admin",
    "maintenance manager",
    "mechanic",
    "pilot",
    "officer-in-charge",
    "warehouse department",
  ].includes(normalizedRole);
  const showChatFab = canAccessMessages && currentRouteName !== "Messages";
  const isManageUsers = currentRouteName === "Manage Users";
  const baseFabBottom = Math.max(16, insets.bottom + 12);
  const contentBottomInset = Math.max(90, insets.bottom + 74);
  const childFabGap = 60;
  const chatFabBottomOffset = isManageUsers
    ? baseFabBottom + 80
    : baseFabBottom;

  useEffect(() => {
    setShowFabMenu(false);
  }, [currentRouteName]);

  useFocusEffect(
    useCallback(() => {
      return () => {
        setShowFabMenu(false);
      };
    }, []),
  );

  return (
    <View style={{ flex: 1 }}>
      <View style={{ flex: 1, paddingBottom: contentBottomInset }}>{children}</View>
      {showChatFab &&
        (isManageUsers ? (
          <>
            {showFabMenu && (
              <>
                <TouchableOpacity
                  style={{
                    position: "absolute",
                    right: 24,
                    bottom: baseFabBottom + childFabGap * 2,
                    backgroundColor: "#1F5FBF",
                    borderRadius: 28,
                    width: 56,
                    height: 56,
                    alignItems: "center",
                    justifyContent: "center",
                    shadowColor: "#000",
                    shadowOffset: { width: 0, height: 2 },
                    shadowOpacity: 0.2,
                    shadowRadius: 3,
                    elevation: 4,
                    zIndex: 1000,
                  }}
                  activeOpacity={0.85}
                  onPress={() => {
                    setShowFabMenu(false);
                    navigation.navigate("Messages");
                  }}
                >
                  <MaterialCommunityIcons
                    name="message-text-outline"
                    size={20}
                    color={COLORS.white}
                  />
                </TouchableOpacity>
                <TouchableOpacity
                  style={{
                    position: "absolute",
                    right: 24,
                    bottom: baseFabBottom + childFabGap,
                    backgroundColor: "#00ad37",
                    borderRadius: 28,
                    width: 56,
                    height: 56,
                    alignItems: "center",
                    justifyContent: "center",
                    shadowColor: "#000",
                    shadowOffset: { width: 0, height: 2 },
                    shadowOpacity: 0.2,
                    shadowRadius: 3,
                    elevation: 4,
                    zIndex: 1000,
                  }}
                  activeOpacity={0.85}
                  onPress={() => {
                    setShowFabMenu(false);
                    navigation.navigate("Manage Users", {
                      fabAction: "addUser",
                      at: Date.now(),
                    });
                  }}
                >
                  <MaterialCommunityIcons
                    name="account-plus-outline"
                    size={20}
                    color={COLORS.white}
                  />
                </TouchableOpacity>
              </>
            )}
            <TouchableOpacity
              style={{
                position: "absolute",
                right: 18,
                bottom: baseFabBottom,
                backgroundColor: COLORS.primaryLight,
                borderRadius: 28,
                width: 56,
                height: 56,
                alignItems: "center",
                justifyContent: "center",
                shadowColor: "#000",
                shadowOffset: { width: 0, height: 3 },
                shadowOpacity: 0.28,
                shadowRadius: 4,
                elevation: 6,
                zIndex: 999,
              }}
              activeOpacity={0.85}
              onPress={() => setShowFabMenu((open) => !open)}
            >
              <MaterialCommunityIcons
                name={showFabMenu ? "close" : "dots-grid"}
                size={24}
                color={COLORS.white}
              />
            </TouchableOpacity>
          </>
        ) : (
          <TouchableOpacity
            style={{
              position: "absolute",
              right: 18,
              bottom: chatFabBottomOffset,
              backgroundColor: COLORS.primaryLight,
              borderRadius: 28,
              width: 56,
              height: 56,
              alignItems: "center",
              justifyContent: "center",
              shadowColor: "#000",
              shadowOffset: { width: 0, height: 3 },
              shadowOpacity: 0.28,
              shadowRadius: 4,
              elevation: 6,
              zIndex: 999,
            }}
            activeOpacity={0.85}
            onPress={() => navigation.navigate("Messages")}
          >
            <MaterialCommunityIcons
              name="message-text-outline"
              size={24}
              color={COLORS.white}
            />
          </TouchableOpacity>
        ))}
    </View>
  );
}
