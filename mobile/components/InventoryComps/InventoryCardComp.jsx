import { View, Text } from "react-native";
import React from "react";
import Button from "../Button";

export default function InventoryCardComp({ data }) {
  return (
    <View>
      <Text>InventoryCardComp</Text>
      <Button iconName="delete" buttonStyle={styles.primaryBtn} />
      <Button iconName="edit" buttonStyle={styles.primaryBtn} />
    </View>
  );
}
