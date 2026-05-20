import {
  useContext,
  useEffect } from "react";
import AppText from "./common/AppText";
import { View
} from "react-native";
import { AuthContext } from "../Context/AuthContext";
import { useNavigation } from "@react-navigation/native";

export default function ProtectedScreen({ children }) {
  const { user } = useContext(AuthContext);
  const navigation = useNavigation();

  useEffect(() => {
    if (!user) {
      navigation.navigate("Login"); // redirect to Login if not authenticated
    }
  }, [user]);

  if (!user) {
    return (
      <View style={{ flex: 1, justifyContent: "center", alignItems: "center" }}>
        <AppText>You must log in first!</AppText>
      </View>
    );
  }

  return children;
}
