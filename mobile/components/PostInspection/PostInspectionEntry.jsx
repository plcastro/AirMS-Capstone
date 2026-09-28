import Modal from "../common/AppModal";
import React, { useState, useEffect, useRef } from "react";
import AppText from "../common/AppText";
import {
  View,
  TouchableOpacity,
  ScrollView,
  StatusBar
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { COLORS } from "../../stylesheets/colors";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import PostInspectionModalInfo from "./PostInspectionModalInfo";
import PostInspectionModalStation1 from "./PostInspectionModalStation1";
import PostInspectionModalStation2 from "./PostInspectionModalStation2";
import PostInspectionModalEngine from "./PostInspectionModalEngine";
import PostInspectionModalMainRotor from "./PostInspectionModalMainRotor";
import PostInspectionModalCabinInterior from "./PostInspectionModalCabinInterior";
import PostInspectionModalNotes from "./PostInspectionModalNotes";
import PostInspectionB412Checklist from "./PostInspectionB412Checklist";
import { getDefaultPostInspectionFormData } from "./PostInspectionForms";
import {
  B412_POST_INSPECTION_SECTIONS,
  createEmptyB412PostInspectionData,
  isAS350Aircraft,
  isB412Aircraft,
} from "./b412PostInspectionData";
import { showToast } from "../../utilities/toast";
import IosModalSafeAreaProvider from "../common/IosModalSafeAreaProvider";

const BASIC_INFORMATION_TAB = {
  key: "basic",
  label: "Basic Information",
};

const NOTES_TAB = { key: "notes", label: "Notes" };

const LEGACY_POST_INSPECTION_TABS = [
  BASIC_INFORMATION_TAB,
  { key: "station1", label: "Station 1" },
  { key: "station2", label: "Station 2" },
  { key: "engine", label: "Engine" },
  { key: "main-rotor", label: "Main Rotor" },
  { key: "cabin-interior", label: "Cabin Interior" },
  NOTES_TAB,
];

export default function PostInspectionEntry({
  visible,
  onClose,
  onSave,
  userRole,
  rpcOptions = [],
}) {
  const [currentPage, setCurrentPage] = useState(0);
  const scrollViewRef = useRef(null);

  const [formData, setFormData] = useState(
    getDefaultPostInspectionFormData(userRole),
  );
  const hasAircraftType = Boolean(String(formData.aircraftType || "").trim());
  const isB412 = hasAircraftType && isB412Aircraft(formData.aircraftType);
  const isAS350 = hasAircraftType && isAS350Aircraft(formData.aircraftType);
  const tabs = isB412
    ? [
        BASIC_INFORMATION_TAB,
        ...B412_POST_INSPECTION_SECTIONS.map((section) => ({
          key: `b412:${section.key}`,
          label: section.title,
          b412SectionKey: section.key,
        })),
        NOTES_TAB,
      ]
    : isAS350
      ? LEGACY_POST_INSPECTION_TABS
      : [BASIC_INFORMATION_TAB];
  const totalPages = tabs.length;
  const isLastPage = currentPage === totalPages - 1;

  useEffect(() => {
    if (visible) {
      setCurrentPage(0);
      setFormData(getDefaultPostInspectionFormData(userRole));
      if (scrollViewRef.current) {
        scrollViewRef.current.scrollTo({ y: 0, animated: false });
      }
    }
  }, [visible, userRole]);

  useEffect(() => {
    if (scrollViewRef.current) {
      scrollViewRef.current.scrollTo({ y: 0, animated: false });
    }
  }, [currentPage]);

  useEffect(() => {
    if (currentPage >= totalPages) {
      setCurrentPage(0);
    }
  }, [currentPage, totalPages]);

  const updateForm = (field, value) => {
    setFormData((prev) => {
      if (field === "rpc" && value !== prev.rpc) {
        const defaults = getDefaultPostInspectionFormData(userRole);
        const clearedLegacyChecks = Object.fromEntries(
          Object.entries(defaults).filter(
            ([, defaultValue]) => typeof defaultValue === "boolean",
          ),
        );

        return {
          ...prev,
          ...clearedLegacyChecks,
          rpc: value,
          aircraftType: "",
          b412Data: undefined,
        };
      }

      if (field === "aircraftType") {
        return {
          ...prev,
          aircraftType: value,
          b412Data: isB412Aircraft(value)
            ? createEmptyB412PostInspectionData(prev.b412Data)
            : undefined,
        };
      }

      return { ...prev, [field]: value };
    });
  };

  const handleSave = () => {
    if (!formData.rpc || formData.rpc.trim() === "") {
      showToast("Aircraft RPC is required");
      return;
    }
    if (!formData.aircraftType || formData.aircraftType.trim() === "") {
      showToast("Aircraft Type is required");
      return;
    }
    onSave(
      isB412Aircraft(formData.aircraftType)
        ? {
            ...formData,
            b412Data: createEmptyB412PostInspectionData(formData.b412Data),
          }
        : { ...formData, b412Data: undefined },
    );
  };

  const handleNext = () => {
    if (currentPage < totalPages - 1) {
      setCurrentPage(currentPage + 1);
    }
  };

  const handlePrevious = () => {
    if (currentPage > 0) {
      setCurrentPage(currentPage - 1);
    }
  };

  const renderPage = () => {
    const currentTab = tabs[currentPage];

    if (currentTab?.b412SectionKey) {
      return (
        <PostInspectionB412Checklist
          value={formData.b412Data}
          onChange={(b412Data) => updateForm("b412Data", b412Data)}
          isEditable
          sectionKey={currentTab.b412SectionKey}
        />
      );
    }

    switch (currentTab?.key) {
      case "basic":
        return (
          <PostInspectionModalInfo
            formData={formData}
            updateForm={updateForm}
            isEditable={true}
            rpcOptions={rpcOptions}
          />
        );
      case "station1":
        return (
          <PostInspectionModalStation1
            formData={formData}
            updateForm={updateForm}
            isEditable={true}
          />
        );
      case "station2":
        return (
          <PostInspectionModalStation2
            formData={formData}
            updateForm={updateForm}
            isEditable={true}
          />
        );
      case "engine":
        return (
          <PostInspectionModalEngine
            formData={formData}
            updateForm={updateForm}
            isEditable={true}
          />
        );
      case "main-rotor":
        return (
          <PostInspectionModalMainRotor
            formData={formData}
            updateForm={updateForm}
            isEditable={true}
          />
        );
      case "cabin-interior":
        return (
          <PostInspectionModalCabinInterior
            formData={formData}
            updateForm={updateForm}
            isEditable={true}
          />
        );
      case "notes":
        return (
          <PostInspectionModalNotes
            formData={formData}
            updateForm={updateForm}
            isEditable={true}
          />
        );
      default:
        return null;
    }
  };

  return (
    <Modal visible={visible} animationType="fade" onRequestClose={onClose}>
      <IosModalSafeAreaProvider>
        <SafeAreaView style={{ flex: 1, backgroundColor: "#F9F9F9" }}>
        <StatusBar barStyle="dark-content" backgroundColor="#F9F9F9" />

        <View style={{ paddingTop: 16, backgroundColor: "#F9F9F9" }}>
          <View
            style={{
              flexDirection: "row",
              alignItems: "center",
              justifyContent: "space-between",
              paddingHorizontal: 16,
              marginBottom: 12,
            }}
          >
            <View>
              <AppText style={{ fontSize: 16, fontWeight: "700", color: COLORS.black }}>
                New Entry - Post-Inspection
              </AppText>
              <AppText style={{ fontSize: 12, fontWeight: "600", color: COLORS.grayDark }}>
                Select Section
              </AppText>
            </View>

            <TouchableOpacity
              onPress={onClose}
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
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={{
              paddingHorizontal: 16,
              gap: 12,
              paddingBottom: 12,
            }}
          >
            {tabs.map((tab, index) => (
              <TouchableOpacity
                key={tab.key}
                onPress={() => setCurrentPage(index)}
                style={{
                  paddingVertical: 8,
                  paddingHorizontal: 16,
                  borderRadius: 20,
                  borderWidth: 1,
                  borderColor:
                    currentPage === index
                      ? COLORS.primaryLight
                      : COLORS.grayMedium,
                  backgroundColor:
                    currentPage === index ? COLORS.primaryLight : "transparent",
                }}
              >
                <AppText
                  style={{
                    fontSize: 12,
                    fontWeight: "500",
                    color:
                      currentPage === index ? COLORS.white : COLORS.grayDark,
                  }}
                >
                  {tab.label}
                </AppText>
              </TouchableOpacity>
            ))}
          </ScrollView>

          <View
            style={{
              height: 1,
              backgroundColor: COLORS.grayMedium,
              marginTop: 12,
            }}
          />

        </View>

        <ScrollView
          ref={scrollViewRef}
          style={{ flex: 1, paddingHorizontal: 20 }}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
          contentContainerStyle={{ paddingTop: 16, paddingBottom: 20 }}
        >
          {renderPage()}
        </ScrollView>

        <View
          style={{
            flexDirection: "row",
            justifyContent: "flex-end",
            alignItems: "center",
            padding: 20,
            backgroundColor: "#F9F9F9",
            gap: 10,
            borderTopWidth: 1,
            borderTopColor: COLORS.grayMedium,
          }}
        >
          <TouchableOpacity
            onPress={handlePrevious}
            disabled={currentPage === 0}
            style={{
              paddingVertical: 8,
              paddingHorizontal: 16,
              borderRadius: 4,
              backgroundColor: COLORS.white,
              borderWidth: 1,
              borderColor: COLORS.grayMedium,
              opacity: currentPage === 0 ? 0.5 : 1,
            }}
          >
            <AppText style={{ color: COLORS.grayDark, fontSize: 12 }}>
              Previous
            </AppText>
          </TouchableOpacity>

          <View
            style={{
              backgroundColor: COLORS.primaryLight,
              paddingVertical: 8,
              paddingHorizontal: 14,
              borderRadius: 4,
            }}
          >
            <AppText
              style={{ color: COLORS.white, fontWeight: "600", fontSize: 14 }}
            >
              {currentPage + 1}
            </AppText>
          </View>

          <TouchableOpacity
            onPress={isLastPage ? handleSave : handleNext}
            style={{
              paddingVertical: 8,
              paddingHorizontal: 24,
              borderRadius: 4,
              backgroundColor: COLORS.primaryLight,
              opacity: 1,
            }}
          >
            <AppText
              style={{ color: COLORS.white, fontSize: 14, fontWeight: "600" }}
            >
              {isLastPage ? "Add" : "Next"}
            </AppText>
          </TouchableOpacity>
        </View>
        </SafeAreaView>
      </IosModalSafeAreaProvider>
    </Modal>
  );
}
