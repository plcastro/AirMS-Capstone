import React, { useEffect, useState } from "react";
import {
  Modal,
  ScrollView,
  StatusBar,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Picker } from "@react-native-picker/picker";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { COLORS } from "../../stylesheets/colors";

const UNIT_OPTIONS = ["pcs", "kg", "ft", "L"];

const createEmptyItem = (id) => ({
  id,
  materialCodeNumber: "",
  particular: "",
  quantity: "",
  unit: "pcs",
  purpose: "",
});

export default function PartsRequisitionEntry({
  visible,
  onClose,
  onSubmit,
}) {
  const [items, setItems] = useState([createEmptyItem(1)]);

  useEffect(() => {
    if (visible) {
      setItems([createEmptyItem(1)]);
    }
  }, [visible]);

  const updateItem = (id, field, value) => {
    setItems((prev) =>
      prev.map((item) => (item.id === id ? { ...item, [field]: value } : item)),
    );
  };

  const addAnotherItem = () => {
    setItems((prev) => [...prev, createEmptyItem(Date.now())]);
  };

  const removeItem = (id) => {
    setItems((prev) => prev.filter((item) => item.id !== id));
  };

  const renderInput = (label, value, onChangeText, extraInputStyle = {}) => (
    <View style={{ marginBottom: 16 }}>
      <Text
        style={{
          fontSize: 15,
          color: "#3E3E3E",
          fontWeight: "500",
          marginBottom: 8,
        }}
      >
        {label}
      </Text>
      <TextInput
        value={value}
        onChangeText={onChangeText}
        placeholder="-"
        placeholderTextColor="#7C7C7C"
        style={[
          {
            backgroundColor: "#F1F1F1",
            borderRadius: 6,
            height: 40,
            paddingHorizontal: 12,
            fontSize: 15,
            color: COLORS.black,
          },
          extraInputStyle,
        ]}
      />
    </View>
  );

  return (
    <Modal
      visible={visible}
      animationType="fade"
      transparent
      onRequestClose={onClose}
    >
      <SafeAreaView
        style={{
          flex: 1,
          backgroundColor: "rgba(0, 0, 0, 0.35)",
          justifyContent: "center",
          paddingHorizontal: 12,
          paddingVertical: 16,
        }}
      >
        <StatusBar
          barStyle="dark-content"
          backgroundColor="rgba(0, 0, 0, 0.35)"
        />

        <View
          style={{
            backgroundColor: COLORS.white,
            borderRadius: 20,
            overflow: "hidden",
            elevation: 8,
            shadowColor: COLORS.black,
            shadowOffset: { width: 0, height: 4 },
            shadowOpacity: 0.18,
            shadowRadius: 10,
            maxHeight: "92%",
          }}
        >
          <View
            style={{
              flexDirection: "row",
              justifyContent: "space-between",
              alignItems: "center",
              paddingHorizontal: 16,
              paddingVertical: 16,
              borderBottomWidth: 1,
              borderBottomColor: "#E8E8E8",
            }}
          >
            <Text
              style={{
                fontSize: 22,
                fontWeight: "600",
                color: COLORS.black,
              }}
            >
              New Entry
            </Text>

            <TouchableOpacity
              onPress={onClose}
              activeOpacity={0.7}
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            >
              <MaterialCommunityIcons
                name="close"
                size={24}
                color={COLORS.grayDark}
              />
            </TouchableOpacity>
          </View>

          <ScrollView
            showsVerticalScrollIndicator={false}
            contentContainerStyle={{
              paddingHorizontal: 14,
              paddingTop: 14,
              paddingBottom: 20,
            }}
          >
            {items.map((item, index) => (
              <View
                key={item.id}
                style={{
                  backgroundColor: COLORS.white,
                  borderRadius: 20,
                  paddingHorizontal: 18,
                  paddingTop: 22,
                  paddingBottom: 16,
                  marginBottom: 18,
                  elevation: 4,
                  shadowColor: COLORS.black,
                  shadowOffset: { width: 0, height: 2 },
                  shadowOpacity: 0.12,
                  shadowRadius: 6,
                  borderWidth: 1,
                  borderColor: "#EEEEEE",
                }}
              >
                <View
                  style={{
                    flexDirection: "row",
                    justifyContent: "space-between",
                    alignItems: "center",
                    marginBottom: 18,
                  }}
                >
                  <Text
                    style={{
                      fontSize: 17,
                      fontWeight: "700",
                      color: "#3C3C3C",
                    }}
                  >
                    Item {index + 1}
                  </Text>

                  {index > 0 && (
                    <TouchableOpacity
                      activeOpacity={0.7}
                      onPress={() => removeItem(item.id)}
                    >
                      <MaterialCommunityIcons
                        name="delete"
                        size={22}
                        color="#FF5A5A"
                      />
                    </TouchableOpacity>
                  )}
                </View>

                {renderInput(
                  "Material code number:",
                  item.materialCodeNumber,
                  (value) => updateItem(item.id, "materialCodeNumber", value),
                )}

                {renderInput("Particular:", item.particular, (value) =>
                  updateItem(item.id, "particular", value),
                )}

                <View style={{ marginBottom: 16 }}>
                  <Text
                    style={{
                      fontSize: 15,
                      color: "#3E3E3E",
                      fontWeight: "500",
                      marginBottom: 8,
                    }}
                  >
                    Quantity:
                  </Text>
                  <View
                    style={{
                      flexDirection: "row",
                      alignItems: "center",
                      backgroundColor: "#F1F1F1",
                      borderRadius: 6,
                      overflow: "hidden",
                      height: 40,
                    }}
                  >
                    <TextInput
                      value={item.quantity}
                      onChangeText={(value) =>
                        updateItem(item.id, "quantity", value)
                      }
                      placeholder="-"
                      placeholderTextColor="#7C7C7C"
                      style={{
                        flex: 1,
                        height: 40,
                        paddingHorizontal: 12,
                        fontSize: 15,
                        color: COLORS.black,
                      }}
                    />
                    <View
                      style={{
                        width: 72,
                        height: 40,
                        justifyContent: "center",
                        borderLeftWidth: 1,
                        borderLeftColor: "#DEDEDE",
                      }}
                    >
                      <Picker
                        selectedValue={item.unit}
                        onValueChange={(value) =>
                          updateItem(item.id, "unit", value)
                        }
                        style={{
                          height: 40,
                          width: 72,
                          color: COLORS.grayDark,
                          marginTop: -2,
                        }}
                        dropdownIconColor={COLORS.grayDark}
                      >
                        {UNIT_OPTIONS.map((unit) => (
                          <Picker.Item key={unit} label={unit} value={unit} />
                        ))}
                      </Picker>
                    </View>
                  </View>
                </View>

                {renderInput("Purpose:", item.purpose, (value) =>
                  updateItem(item.id, "purpose", value),
                )}

                <View style={{ flexDirection: "row", justifyContent: "flex-end" }}>
                  <TouchableOpacity
                    activeOpacity={0.8}
                    onPress={addAnotherItem}
                    style={{
                      backgroundColor: "#62C982",
                      paddingHorizontal: 14,
                      paddingVertical: 9,
                      borderRadius: 4,
                      flexDirection: "row",
                      alignItems: "center",
                    }}
                  >
                    <MaterialCommunityIcons
                      name="plus"
                      size={16}
                      color={COLORS.white}
                    />
                    <Text
                      style={{
                        color: COLORS.white,
                        fontSize: 14,
                        fontWeight: "500",
                        marginLeft: 6,
                      }}
                    >
                      Add Another Item
                    </Text>
                  </TouchableOpacity>
                </View>
              </View>
            ))}

            <View style={{ flexDirection: "row", justifyContent: "flex-end" }}>
              <TouchableOpacity
                activeOpacity={0.8}
                onPress={() => onSubmit?.(items)}
                style={{
                  backgroundColor: COLORS.primaryLight,
                  paddingHorizontal: 22,
                  paddingVertical: 14,
                  borderRadius: 4,
                }}
              >
                <Text
                  style={{
                    color: COLORS.white,
                    fontSize: 15,
                    fontWeight: "600",
                  }}
                >
                  Submit
                </Text>
              </TouchableOpacity>
            </View>
          </ScrollView>
        </View>
      </SafeAreaView>
    </Modal>
  );
}
