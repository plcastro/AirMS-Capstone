import React, { useEffect, useState } from "react";
import AppText from "../common/AppText";
import AppInput from "../common/AppInput";
import {
  ActivityIndicator,
  Modal,
  ScrollView,
  StatusBar,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { COLORS } from "../../stylesheets/colors";
import AlertComp from "../AlertComp";
import IosModalSafeAreaProvider from "../common/IosModalSafeAreaProvider";
import InlineDropdown from "../common/InlineDropdown";

const UNIT_OPTIONS = ["SET", "ST", "UNT", "PC"];

const createEmptyItem = (id) => ({
  id,
  particular: "",
  quantity: "",
  unit: "PC",
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
  alertConfig = {},
}) {
  const [items, setItems] = useState([createEmptyItem(1)]);
  const [submitting, setSubmitting] = useState(false);
  const [aircraftDropdownOpen, setAircraftDropdownOpen] = useState(false);
  const [openUnitItemId, setOpenUnitItemId] = useState(null);

  useEffect(() => {
    if (visible) {
      const nextItems =
        initialItems.length > 0
          ? initialItems.map((item, index) => ({
              id: item.id || item._id || Date.now() + index,
              particular: item.particular || "",
              quantity: item.quantity ? String(item.quantity) : "",
              unit: item.unit || item.unitOfMeasure || "PC",
              purpose: item.purpose || "",
            }))
          : [createEmptyItem(1)];

      setItems(nextItems);
      setAircraftDropdownOpen(false);
      setOpenUnitItemId(null);
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
    setOpenUnitItemId(null);
  };

  const removeItem = (id) => {
    setItems((prev) => prev.filter((item) => item.id !== id));
    setOpenUnitItemId((current) => (current === id ? null : current));
  };

  const renderInput = (label, value, onChangeText, extraInputStyle = {}) => (
    <View style={{ marginBottom: 16 }}>
      <AppText
        style={{
          fontSize: 12,
          color: "#3E3E3E",
          fontWeight: "500",
          marginBottom: 8,
        }}
      >
        {label}
      </AppText>
      <AppInput
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
      onRequestClose={
        alertConfig.visible
          ? alertConfig.onCancel || alertConfig.onConfirm
          : onClose
      }
    >
      <IosModalSafeAreaProvider>
        <SafeAreaView
          style={{
            flex: 1,
            backgroundColor: "rgba(0, 0, 0, 0.35)",
            justifyContent: "center",
            paddingHorizontal: 12,
            paddingVertical: 8,
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
              maxHeight: "96%",
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
              <AppText
                style={{
                  fontSize: 12,
                  fontWeight: "600",
                  color: COLORS.black,
                }}
              >
                {title}
              </AppText>

              <TouchableOpacity
                onPress={onClose}
                disabled={submitting}
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
                  borderWidth: 1,
                  borderColor: "#EEEEEE",
                  position: "relative",
                  zIndex: 10,
                  elevation: 10,
                }}
              >
                <AppText
                  style={{
                    fontSize: 12,
                    fontWeight: "700",
                    color: "#3C3C3C",
                    marginBottom: 14,
                  }}
                >
                  Choose Aircraft *
                </AppText>

                <InlineDropdown
                  value={selectedAircraft}
                  placeholder="Choose Aircraft"
                  open={aircraftDropdownOpen}
                  onToggle={() =>
                    setAircraftDropdownOpen((current) => {
                      setOpenUnitItemId(null);
                      return !current;
                    })
                  }
                  onChange={(value) => {
                    onChangeAircraft?.(value);
                    setAircraftDropdownOpen(false);
                  }}
                  options={aircraftOptions.map((aircraft) => ({
                    label: aircraft.name,
                    value: aircraft.id,
                  }))}
                  menuPosition="relative"
                />
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
                    borderWidth: 1,
                    borderColor: "#EEEEEE",
                    position: "relative",
                    zIndex: 1,
                    elevation: 1,
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
                    <AppText
                      style={{
                        fontSize: 12,
                        fontWeight: "700",
                        color: "#3C3C3C",
                      }}
                    >
                      Item {index + 1}
                    </AppText>

                    {items.length > 1 && (
                      <TouchableOpacity
                        activeOpacity={0.7}
                        onPress={() => removeItem(item.id)}
                        disabled={submitting}
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
                    <AppText
                      style={{
                        fontSize: 12,
                        color: "#3E3E3E",
                        fontWeight: "500",
                        marginBottom: 8,
                      }}
                    >
                      Quantity: *
                    </AppText>
                    <View style={{ flexDirection: "row", gap: 8 }}>
                      <AppInput
                        value={item.quantity}
                        onChangeText={(value) =>
                          updateItem(item.id, "quantity", value)
                        }
                        placeholder="-"
                        placeholderTextColor="#7C7C7C"
                        style={{
                          flex: 1,
                          height: 44,
                          backgroundColor: "#F1F1F1",
                          borderRadius: 6,
                          paddingHorizontal: 12,
                          fontSize: 12,
                          color: COLORS.black,
                        }}
                        keyboardType="number-pad"
                      />
                      <View style={{ width: 108 }}>
                        <InlineDropdown
                          value={item.unit}
                          placeholder="Unit"
                          open={openUnitItemId === item.id}
                          onToggle={() => {
                            setAircraftDropdownOpen(false);
                            setOpenUnitItemId((current) =>
                              current === item.id ? null : item.id,
                            );
                          }}
                          onChange={(unit) => {
                            updateItem(item.id, "unit", unit);
                            setOpenUnitItemId(null);
                          }}
                          options={UNIT_OPTIONS.map((unit) => ({
                            label: unit,
                            value: unit,
                          }))}
                          menuMaxHeight={180}
                          menuPosition="relative"
                        />
                      </View>
                    </View>
                  </View>

                  {renderInput("Purpose:", item.purpose, (value) =>
                    updateItem(item.id, "purpose", value),
                  )}

                  <View
                    style={{ flexDirection: "row", justifyContent: "flex-end" }}
                  >
                    <TouchableOpacity
                      activeOpacity={0.8}
                      onPress={addAnotherItem}
                      disabled={submitting}
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
                      <AppText
                        style={{
                          color: COLORS.white,
                          fontSize: 12,
                          fontWeight: "500",
                          marginLeft: 6,
                        }}
                      >
                        Add Another Item
                      </AppText>
                    </TouchableOpacity>
                  </View>
                </View>
              ))}

              <View
                style={{ flexDirection: "row", justifyContent: "flex-end" }}
              >
                <TouchableOpacity
                  activeOpacity={0.8}
                  onPress={async () => {
                    if (submitting) return;
                    setSubmitting(true);
                    try {
                      await Promise.resolve(
                        onSubmit?.({ aircraft: selectedAircraft, items }),
                      );
                    } finally {
                      setSubmitting(false);
                    }
                  }}
                  disabled={submitting}
                  style={{
                    backgroundColor: COLORS.primaryLight,
                    paddingHorizontal: 22,
                    paddingVertical: 14,
                    borderRadius: 4,
                    opacity: submitting ? 0.7 : 1,
                    flexDirection: "row",
                    alignItems: "center",
                  }}
                >
                  {submitting ? (
                    <ActivityIndicator
                      size="small"
                      color={COLORS.white}
                      style={{ marginRight: 6 }}
                    />
                  ) : null}
                  <AppText
                    style={{
                      color: COLORS.white,
                      fontSize: 12,
                      fontWeight: "600",
                    }}
                  >
                    {submitting ? "Submitting..." : submitLabel}
                  </AppText>
                </TouchableOpacity>
              </View>
            </ScrollView>
          </View>
          <AlertComp
            embedded
            visible={Boolean(alertConfig.visible)}
            title={alertConfig.title}
            message={alertConfig.message}
            confirmText={alertConfig.confirmText}
            cancelText={alertConfig.cancelText}
            onConfirm={alertConfig.onConfirm}
            onCancel={alertConfig.onCancel}
          />
        </SafeAreaView>
      </IosModalSafeAreaProvider>
    </Modal>
  );
}
