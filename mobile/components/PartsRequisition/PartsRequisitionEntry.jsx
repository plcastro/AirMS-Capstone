import React, { useEffect, useState } from "react";
import {
  Modal,
  Platform,
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
  particular: "",
  quantity: "",
  unit: "pcs",
  purpose: "",
});

export default function PartsRequisitionEntry({
  visible,
  onClose,
  onSubmit,
  title = "New Entry",
  submitLabel = "Submit",
  selectedAircraft,
  onChangeAircraft,
  aircraftOptions = [],
  initialAircraft = "",
  initialItems = [],
}) {
  const [items, setItems] = useState([createEmptyItem(1)]);

  useEffect(() => {
    if (visible) {
      const nextItems =
        initialItems.length > 0
          ? initialItems.map((item, index) => ({
              id: item.id || item._id || Date.now() + index,
              particular: item.particular || "",
              quantity: item.quantity ? String(item.quantity) : "",
              unit: item.unit || item.unitOfMeasure || "pcs",
              purpose: item.purpose || "",
            }))
          : [createEmptyItem(1)];

      setItems(nextItems);
      onChangeAircraft?.(initialAircraft || "");
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
          fontSize: 12,
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
            fontSize: 12,
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
                fontSize: 12,
                fontWeight: "600",
                color: COLORS.black,
              }}
            >
              {title}
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
            <View
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
              <Text
                style={{
                  fontSize: 12,
                  fontWeight: "700",
                  color: "#3C3C3C",
                  marginBottom: 14,
                }}
              >
                Choose Aircraft *
              </Text>

              <View
                style={{
                  backgroundColor: "#F1F1F1",
                  borderRadius: 6,
                  overflow: "hidden",
                  minHeight: 48,
                  justifyContent: "center",
                }}
              >
                <Picker
                  selectedValue={selectedAircraft}
                  onValueChange={onChangeAircraft}
                  mode="dropdown"
                  style={{
                    height: Platform.OS === "android" ? 52 : 48,
                    width: "100%",
                    color: selectedAircraft ? COLORS.black : COLORS.grayDark,
                    marginLeft: Platform.OS === "android" ? 2 : -6,
                    marginTop: Platform.OS === "android" ? -1 : 0,
                  }}
                  dropdownIconColor={COLORS.grayDark}
                >
                  <Picker.Item label="Choose Aircraft" value="" />
                  {aircraftOptions.map((aircraft) => (
                    <Picker.Item
                      key={aircraft.id || aircraft.name}
                      label={aircraft.name}
                      value={aircraft.id}
                    />
                  ))}
                </Picker>
              </View>
            </View>

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
                      fontSize: 12,
                      fontWeight: "700",
                      color: "#3C3C3C",
                    }}
                  >
                    Item {index + 1}
                  </Text>

                  {items.length > 1 && (
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


                {renderInput("Particular: *", item.particular, (value) =>
                  updateItem(item.id, "particular", value),
                )}

                <View style={{ marginBottom: 16 }}>
                  <Text
                    style={{
                      fontSize: 12,
                      color: "#3E3E3E",
                      fontWeight: "500",
                      marginBottom: 8,
                    }}
                  >
                    Quantity: *
                  </Text>
                  <View
                    style={{
                      flexDirection: "row",
                      alignItems: "center",
                      backgroundColor: "#F1F1F1",
                      borderRadius: 6,
                      overflow: "hidden",
                      minHeight: 44,
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
                        height: 44,
                        paddingHorizontal: 12,
                        fontSize: 12,
                        color: COLORS.black,
                      }}
                      keyboardType="number-pad"
                    />
                    <View
                      style={{
                        width: 92,
                        height: 44,
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
                        mode="dropdown"
                        style={{
                          height: Platform.OS === "android" ? 52 : 44,
                          width: 92,
                          color: item.unit ? COLORS.black : COLORS.grayDark,
                          marginLeft: Platform.OS === "android" ? 2 : -6,
                          marginTop: Platform.OS === "android" ? -1 : 0,
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
                        fontSize: 12,
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
                onPress={() => onSubmit?.({ aircraft: selectedAircraft, items })}
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
                    fontSize: 12,
                    fontWeight: "600",
                  }}
                >
                  {submitLabel}
                </Text>
              </TouchableOpacity>
            </View>
          </ScrollView>
        </View>
      </SafeAreaView>
    </Modal>
  );
}
