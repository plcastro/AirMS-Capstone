import React, { useState, useEffect, useRef } from "react";
import AppText from "../common/AppText";
import {
  View,
  Modal,
  TouchableOpacity,
  ScrollView,
  StatusBar,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { COLORS } from "../../stylesheets/colors";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import PreInspectionModalInfo from "./PreInspectionModalInfo";
import PreInspectionModalStations from "./PreInspectionModalStations";
import PreInspectionModalSling from "./PreInspectionModalSling";
import PreInspectionModalFloatsOnboard from "./PreInspectionModalFloatsOnboard";
import PreInspectionB412Checklist from "./PreInspectionB412Checklist";
import PreInspectionSignatureModal from "./PreInspectionSignatureModal";
import IosModalSafeAreaProvider from "../common/IosModalSafeAreaProvider";
import {
  areAllInspectionChecksComplete,
  getDefaultPreInspectionFormData,
} from "./PreInspectionForms";
import {
  B412_PRE_INSPECTION_SECTIONS,
  createEmptyB412PreInspectionData,
  isAS350Aircraft,
  isB412Aircraft,
} from "./b412PreInspectionData";
import { showToast } from "../../utilities/toast";

const BASIC_INFORMATION_TAB = {
  key: "basic",
  label: "Basic Information",
};

const LEGACY_PRE_INSPECTION_TABS = [
  BASIC_INFORMATION_TAB,
  { key: "stations", label: "Station 1 and 2" },
  { key: "station3-sling", label: "Station 3 and Sling" },
  { key: "floats-onboard", label: "Floats and Onboard" },
];

export default function PreInspectionEntry({
  visible,
  onClose,
  onSave,
  userRole,
  rpcOptions = [],
}) {
  const [currentPage, setCurrentPage] = useState(0);
  const scrollViewRef = useRef(null);

  const [formData, setFormData] = useState(
    getDefaultPreInspectionFormData(userRole),
  );
  const [showReleaseModal, setShowReleaseModal] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const normalizedRole = String(userRole || "").trim().toLowerCase();
  const isMechanic = ["mechanic", "maintenance manager", "superadmin"].includes(
    normalizedRole,
  );
  const hasAircraftType = Boolean(String(formData.aircraftType || "").trim());
  const isB412 = hasAircraftType && isB412Aircraft(formData.aircraftType);
  const isAS350 = hasAircraftType && isAS350Aircraft(formData.aircraftType);
  const tabs = isB412
    ? [
        BASIC_INFORMATION_TAB,
        ...B412_PRE_INSPECTION_SECTIONS.map((section) => ({
          key: `b412:${section.key}`,
          label: section.title,
          b412SectionKey: section.key,
        })),
      ]
    : isAS350
      ? LEGACY_PRE_INSPECTION_TABS
      : [BASIC_INFORMATION_TAB];
  const totalPages = tabs.length;
  const isLastPage = currentPage === totalPages - 1;

  useEffect(() => {
    if (visible) {
      setCurrentPage(0);
      setFormData(getDefaultPreInspectionFormData(userRole));
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
        const defaults = getDefaultPreInspectionFormData(userRole);
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
          fob: "",
          b412Data: undefined,
        };
      }

      if (field === "aircraftType") {
        return {
          ...prev,
          aircraftType: value,
          b412Data: isB412Aircraft(value)
            ? createEmptyB412PreInspectionData(prev.b412Data)
            : undefined,
        };
      }

      return { ...prev, [field]: value };
    });
  };

  const handleSave = async () => {
    if (!formData.rpc || formData.rpc.trim() === "") {
      showToast("Aircraft RPC is required");
      return;
    }
    if (!formData.aircraftType || formData.aircraftType.trim() === "") {
      showToast("Aircraft Type is required");
      return;
    }
    if (!formData.base || formData.base.trim() === "") {
      showToast("Base is required");
      return;
    }
    try {
      await persistInspection(formData);
    } catch (error) {
      console.error("Error saving pre-flight inspection:", error);
      showToast(error.message || "Failed to save pre-flight inspection");
    }
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

  const validateBeforeSigning = (actionLabel) => {
    if (!formData.rpc || formData.rpc.trim() === "") {
      showToast("Aircraft RPC is required");
      return false;
    }

    if (!formData.aircraftType || formData.aircraftType.trim() === "") {
      showToast("Aircraft Type is required");
      return false;
    }

    if (!formData.base || formData.base.trim() === "") {
      showToast("Base is required");
      return false;
    }

    if (!String(formData.date || "").trim()) {
      showToast("Date is required");
      return false;
    }

    const fobValue = String(formData.fob || "").trim();
    const numericFob = Number(fobValue);
    if (!fobValue || !Number.isFinite(numericFob) || numericFob < 0) {
      showToast(`FOB must be filled in before ${actionLabel}.`);
      return false;
    }

    if (!areAllInspectionChecksComplete(formData)) {
      showToast(`All checklist fields must be checked before ${actionLabel}.`);
      return false;
    }

    return true;
  };

  const fobValue = String(formData.fob ?? "").trim();
  const numericFob = Number(fobValue);
  const hasDate = Boolean(String(formData.date || "").trim());
  const isDraftValid =
    Boolean(String(formData.rpc || "").trim()) &&
    Boolean(String(formData.aircraftType || "").trim()) &&
    Boolean(String(formData.base || "").trim()) &&
    hasDate &&
    Boolean(fobValue) &&
    Number.isFinite(numericFob) &&
    numericFob >= 0 &&
    areAllInspectionChecksComplete(formData);

  const persistInspection = async (nextFormData) => {
    setIsSubmitting(true);
    try {
      await onSave(
        isB412Aircraft(nextFormData.aircraftType)
          ? {
              ...nextFormData,
              b412Data: createEmptyB412PreInspectionData(
                nextFormData.b412Data,
              ),
            }
          : { ...nextFormData, b412Data: undefined },
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleRelease = async (signatureData) => {
    if (!validateBeforeSigning("release")) {
      return;
    }

    const updatedFormData = {
      ...formData,
      releasedBy: {
        ...signatureData,
        timestamp: new Date().toISOString(),
      },
      status: "released",
    };

    try {
      await persistInspection(updatedFormData);
      setFormData(updatedFormData);
      showToast("Pre-inspection has been released");
    } catch (error) {
      console.error("Error releasing pre-flight inspection:", error);
      throw error;
    }
  };

  const renderPage = () => {
    const currentTab = tabs[currentPage];

    if (currentTab?.b412SectionKey) {
      return (
        <PreInspectionB412Checklist
          value={formData.b412Data}
          onChange={(b412Data) => updateForm("b412Data", b412Data)}
          fob={formData.fob}
          onFobChange={(fob) => updateForm("fob", fob)}
          isEditable
          sectionKey={currentTab.b412SectionKey}
        />
      );
    }

    switch (currentTab?.key) {
      case "basic":
        return (
          <PreInspectionModalInfo
            formData={formData}
            updateForm={updateForm}
            isEditable={true}
            rpcOptions={rpcOptions}
          />
        );
      case "stations":
        return (
          <PreInspectionModalStations
            formData={formData}
            updateForm={updateForm}
            isEditable={true}
          />
        );
      case "station3-sling":
        return (
          <PreInspectionModalSling
            formData={formData}
            updateForm={updateForm}
            isEditable={true}
          />
        );
      case "floats-onboard":
        return (
          <PreInspectionModalFloatsOnboard
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

        {/* Tab Bar */}
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
              <AppText
                style={{ fontSize: 16, fontWeight: "700", color: COLORS.black }}
              >
                New Entry - Pre-Inspection
              </AppText>
              <AppText
                style={{
                  fontSize: 12,
                  fontWeight: "600",
                  color: COLORS.grayDark,
                }}
              >
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

        {/* Page Content */}
        <ScrollView
          ref={scrollViewRef}
          style={{ flex: 1, paddingHorizontal: 20 }}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
          contentContainerStyle={{ paddingTop: 16, paddingBottom: 20 }}
        >
          {renderPage()}

          {isLastPage && isMechanic && formData.status === "pending" && (
            <View style={{ marginTop: 20, marginBottom: 20 }}>
              <TouchableOpacity
                onPress={() => {
                  if (validateBeforeSigning("release")) {
                    setShowReleaseModal(true);
                  }
                }}
                disabled={isSubmitting || !isDraftValid}
                style={{
                  backgroundColor: COLORS.primaryLight,
                  paddingVertical: 12,
                  borderRadius: 8,
                  alignItems: "center",
                  opacity: isSubmitting || !isDraftValid ? 0.6 : 1,
                }}
              >
                <AppText
                  style={{
                    color: COLORS.white,
                    fontWeight: "600",
                    fontSize: 12,
                  }}
                >
                  Release
                </AppText>
              </TouchableOpacity>
            </View>
          )}
        </ScrollView>

        {/* Navigation Buttons */}
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

          {!isLastPage && (
            <TouchableOpacity
              onPress={handleNext}
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
                Next
              </AppText>
            </TouchableOpacity>
          )}
        </View>

        <PreInspectionSignatureModal
          visible={showReleaseModal}
          title="Release Signature"
          onClose={() => setShowReleaseModal(false)}
          onSave={handleRelease}
          aircraftRPC={formData.rpc}
          actionLabel="release"
        />
        </SafeAreaView>
      </IosModalSafeAreaProvider>
    </Modal>
  );
}
