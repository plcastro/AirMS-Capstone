import React from "react";
import { TouchableOpacity, View } from "react-native";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import AppText from "../common/AppText";
import { COLORS } from "../../stylesheets/colors";
import {
  B412_POST_INSPECTION_SECTION_BY_KEY,
  B412_POST_INSPECTION_SECTIONS,
  createEmptyB412PostInspectionData,
} from "./b412PostInspectionData";

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

export default function PostInspectionB412Checklist({
  value = {},
  onChange,
  isEditable = true,
  sectionKey,
}) {
  const normalizedData = createEmptyB412PostInspectionData(value);
  const checks = normalizedData.checks;
  const sections = sectionKey
    ? [B412_POST_INSPECTION_SECTION_BY_KEY[sectionKey]].filter(Boolean)
    : B412_POST_INSPECTION_SECTIONS;

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
        const sectionNumber =
          B412_POST_INSPECTION_SECTIONS.findIndex(
            (candidate) => candidate.key === section.key,
          ) + 1;
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
                {sectionNumber}. {section.title}
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
                  checked: allChecked
                    ? true
                    : partiallyChecked
                      ? "mixed"
                      : false,
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
              {section.items.map((item) => (
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
                      {item.title}
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
    </View>
  );
}
