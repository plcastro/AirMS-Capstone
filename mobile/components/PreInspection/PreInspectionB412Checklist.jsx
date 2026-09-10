import React from "react";
import { TouchableOpacity, View } from "react-native";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import AppText from "../common/AppText";
import AppInput from "../common/AppInput";
import { COLORS } from "../../stylesheets/colors";
import {
  B412_PRE_INSPECTION_SECTION_BY_KEY,
  B412_PRE_INSPECTION_SECTIONS,
  createEmptyB412PreInspectionData,
} from "./b412PreInspectionData";

const ChecklistBox = ({ checked, partiallyChecked = false }) => (
  <View
    style={{
      width: 20,
      height: 20,
      borderRadius: 4,
      borderWidth: 2,
      borderColor: COLORS.primaryLight,
      backgroundColor:
        checked || partiallyChecked ? COLORS.primaryLight : "transparent",
      justifyContent: "center",
      alignItems: "center",
      marginRight: 12,
    }}
  >
    {(checked || partiallyChecked) && (
      <MaterialCommunityIcons
        name={checked ? "check" : "minus"}
        size={14}
        color={COLORS.white}
      />
    )}
  </View>
);

const ChecklistCaution = ({ text }) => (
  <View
    accessibilityRole="summary"
    style={{
      borderWidth: 1,
      borderColor: "#D46B08",
      borderRadius: 6,
      backgroundColor: "#FFF7E6",
      paddingVertical: 10,
      paddingHorizontal: 12,
      marginBottom: 14,
    }}
  >
    <AppText
      style={{
        color: "#873800",
        fontSize: 12,
        fontWeight: "600",
        lineHeight: 18,
        textAlign: "center",
      }}
    >
      {text}
    </AppText>
  </View>
);

const FuelOnBoardCard = ({ value, onChange, isEditable }) => (
  <View
    style={{
      backgroundColor: COLORS.white,
      borderRadius: 8,
      marginBottom: 24,
      elevation: 4,
      shadowColor: COLORS.black,
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.1,
      shadowRadius: 8,
      overflow: "hidden",
    }}
  >
    <View
      style={{
        backgroundColor: COLORS.primaryLight,
        paddingVertical: 12,
        paddingHorizontal: 16,
      }}
    >
      <AppText
        style={{ fontSize: 14, fontWeight: "600", color: COLORS.white }}
      >
        Fuel On Board
      </AppText>
    </View>

    <View style={{ padding: 16 }}>
      <AppText
        style={{
          fontSize: 12,
          color: COLORS.black,
          marginBottom: 8,
          fontWeight: "bold",
        }}
      >
        Fuel On Board: <AppText style={{ color: "red" }}>*</AppText>
      </AppText>
      <View
        style={{
          flexDirection: "row",
          alignItems: "center",
          backgroundColor: "#F3F4F6",
          borderRadius: 6,
          height: 38,
          paddingHorizontal: 12,
        }}
      >
        <AppInput
          accessibilityLabel="Fuel on board percentage"
          style={{
            flex: 1,
            fontSize: 12,
            color: COLORS.black,
            padding: 0,
          }}
          value={String(value ?? "")}
          onChangeText={onChange}
          editable={isEditable}
          keyboardType="numeric"
          placeholder="Enter FOB"
          placeholderTextColor={COLORS.grayDark}
        />
        <AppText style={{ fontSize: 12, color: COLORS.black, marginLeft: 4 }}>
          %
        </AppText>
      </View>
    </View>
  </View>
);

export default function PreInspectionB412Checklist({
  value = {},
  onChange,
  fob = "",
  onFobChange,
  isEditable = true,
  sectionKey,
}) {
  const normalizedData = createEmptyB412PreInspectionData(value);
  const checks = normalizedData.checks;
  const sections = sectionKey
    ? [B412_PRE_INSPECTION_SECTION_BY_KEY[sectionKey]].filter(Boolean)
    : B412_PRE_INSPECTION_SECTIONS;

  const emitChecks = (nextChecks) => {
    if (!isEditable) return;

    const sourceData =
      value && typeof value === "object" && !Array.isArray(value) ? value : {};

    onChange?.({
      ...sourceData,
      checks: {
        ...checks,
        ...nextChecks,
      },
    });
  };

  return (
    <View>
      {sections.map((section) => {
        const checkedCount = section.items.reduce(
          (count, item) => count + (checks[item.key] ? 1 : 0),
          0,
        );
        const allChecked = checkedCount === section.items.length;
        const partiallyChecked = checkedCount > 0 && !allChecked;

        return (
          <View
            key={section.key}
            style={{
              backgroundColor: COLORS.white,
              borderRadius: 8,
              marginBottom: 24,
              elevation: 4,
              shadowColor: COLORS.black,
              shadowOffset: { width: 0, height: 4 },
              shadowOpacity: 0.1,
              shadowRadius: 8,
              overflow: "hidden",
            }}
          >
            <View
              style={{
                backgroundColor: COLORS.primaryLight,
                paddingVertical: 12,
                paddingHorizontal: 16,
              }}
            >
              <AppText
                style={{
                  fontSize: 14,
                  fontWeight: "600",
                  color: COLORS.white,
                }}
              >
                {section.title}
              </AppText>
              <AppText
                style={{ fontSize: 11, color: COLORS.white, marginTop: 2 }}
              >
                {checkedCount} of {section.items.length} checked
              </AppText>
            </View>

            {isEditable && (
              <TouchableOpacity
                accessibilityRole="checkbox"
                accessibilityState={{
                  checked: allChecked ? true : partiallyChecked ? "mixed" : false,
                }}
                accessibilityLabel={`Select all ${section.title} checks`}
                onPress={() =>
                  emitChecks(
                    Object.fromEntries(
                      section.items.map((item) => [item.key, !allChecked]),
                    ),
                  )
                }
                activeOpacity={0.7}
                style={{
                  flexDirection: "row",
                  alignItems: "center",
                  borderBottomWidth: 1,
                  borderBottomColor: COLORS.grayMedium,
                  paddingVertical: 14,
                  paddingHorizontal: 16,
                }}
              >
                <ChecklistBox
                  checked={allChecked}
                  partiallyChecked={partiallyChecked}
                />
                <AppText
                  style={{
                    color: COLORS.black,
                    fontSize: 12,
                    fontWeight: "500",
                  }}
                >
                  Select All
                </AppText>
              </TouchableOpacity>
            )}

            <View
              style={{ paddingHorizontal: 16, paddingTop: 16, paddingBottom: 4 }}
            >
              {section.items.map((item, index) => (
                <React.Fragment key={item.key}>
                  {!!item.cautionBefore && (
                    <ChecklistCaution text={item.cautionBefore} />
                  )}

                  <View style={{ marginBottom: 18 }}>
                    <AppText
                      style={{
                        fontSize: 12,
                        fontWeight: "bold",
                        color: COLORS.black,
                        marginBottom: 8,
                      }}
                    >
                      {index + 1}. {item.title}
                    </AppText>

                    <TouchableOpacity
                      accessibilityRole="checkbox"
                      accessibilityState={{ checked: checks[item.key] }}
                      accessibilityLabel={`${item.title}: ${item.description}`}
                      disabled={!isEditable}
                      onPress={() =>
                        emitChecks({ [item.key]: !checks[item.key] })
                      }
                      activeOpacity={0.7}
                      style={{
                        flexDirection: "row",
                        alignItems: "flex-start",
                        marginLeft: 14,
                        paddingRight: 8,
                      }}
                    >
                      <ChecklistBox checked={checks[item.key]} />
                      <AppText
                        style={{
                          fontSize: 12,
                          lineHeight: 18,
                          color: COLORS.grayDark,
                          flex: 1,
                          flexWrap: "wrap",
                        }}
                      >
                        {item.description}
                      </AppText>
                    </TouchableOpacity>
                  </View>

                  {!!item.cautionAfter && (
                    <ChecklistCaution text={item.cautionAfter} />
                  )}
                </React.Fragment>
              ))}
            </View>
          </View>
        );
      })}

      {sections.some((section) => section.key === "cabinTop") && (
        <FuelOnBoardCard
          value={fob}
          onChange={onFobChange}
          isEditable={isEditable}
        />
      )}
    </View>
  );
}
