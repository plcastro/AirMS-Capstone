import React, { useState, useEffect, useRef } from "react";
import {
  View,
  Text,
  Modal,
  TouchableOpacity,
  ScrollView,
  StatusBar,
  Image,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { COLORS } from "../../stylesheets/colors";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import PreInspectionModalInfo from "./PreInspectionModalInfo";
import PreInspectionModalStations from "./PreInspectionModalStations";
import PreInspectionModalSling from "./PreInspectionModalSling";
import PreInspectionModalFloatsOnboard from "./PreInspectionModalFloatsOnboard";
import PreInspectionSignatureModal from "./PreInspectionSignatureModal";
import {
  areAllInspectionChecksComplete,
  getDefaultPreInspectionFormData,
} from "./PreInspectionForms";
import { showToast } from "../../utilities/toast";

export default function PreInspectionEditEntry({
  visible,
  inspectionData,
  onClose,
  onSave,
  userRole,
  rpcOptions = [],
  readOnly = false,
}) {
  const [currentPage, setCurrentPage] = useState(0);
  const scrollViewRef = useRef(null);
  const [showReleaseModal, setShowReleaseModal] = useState(false);
  const [showAcceptModal, setShowAcceptModal] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const isPilot = userRole === "pilot";
  const isMechanic =
    userRole === "mechanic" || userRole === "maintenance manager";

  const tabs = [
    "Basic Information",
    "Station 1 and 2",
    "Station 3 and Sling",
    "Floats and Onboard",
  ];
  const totalPages = tabs.length;
  const isLastPage = currentPage === totalPages - 1;

  const [formData, setFormData] = useState(
    getDefaultPreInspectionFormData(userRole),
  );

  useEffect(() => {
    if (visible && inspectionData) {
      setFormData({
        ...getDefaultPreInspectionFormData(userRole),
        ...inspectionData,
      });
    }
  }, [visible, inspectionData, userRole]);

  useEffect(() => {
    if (visible) {
      setCurrentPage(0);
      if (scrollViewRef.current) {
        scrollViewRef.current.scrollTo({ y: 0, animated: false });
      }
    }
  }, [visible]);

  useEffect(() => {
    if (scrollViewRef.current) {
      scrollViewRef.current.scrollTo({ y: 0, animated: false });
    }
  }, [currentPage]);

  const updateForm = (field, value) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const hasAnySignature = Boolean(
    formData.releasedBy?.name || formData.acceptedBy?.name,
  );
  const isFormEditable = !readOnly && !isPilot && !hasAnySignature;

  const validateBeforeSigning = (actionLabel) => {
    if (!String(formData.fob || "").trim()) {
      showToast(`FOB must be filled in before ${actionLabel}.`);
      return false;
    }

    if (!areAllInspectionChecksComplete(formData)) {
      showToast(`All checklist fields must be checked before ${actionLabel}.`);
      return false;
    }

    return true;
  };

  const persistInspection = async (nextFormData) => {
    setIsSubmitting(true);
    try {
      await onSave(nextFormData);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleAccept = async (signatureData) => {
    if (!validateBeforeSigning("acceptance")) {
      return;
    }

    const updatedFormData = {
      ...formData,
      acceptedBy: {
        name: signatureData.name,
        id: signatureData.id,
        signature: signatureData.signature,
        timestamp: new Date().toISOString(),
      },
      status: "completed",
    };

    setFormData(updatedFormData);

    try {
      await persistInspection(updatedFormData);
      showToast("Pre-inspection has been completed");
    } catch (error) {
      console.error("Error completing pre-inspection:", error);
      showToast("Failed to complete pre-inspection");
      throw error;
    }
  };

  const handleRelease = async (signatureData) => {
    if (!validateBeforeSigning("release")) {
      return;
    }

    const updatedFormData = {
      ...formData,
      releasedBy: {
        name: signatureData.name,
        id: signatureData.id,
        signature: signatureData.signature,
        timestamp: new Date().toISOString(),
      },
      status: "released",
    };

    setFormData(updatedFormData);

    try {
      await persistInspection(updatedFormData);
      showToast("Pre-inspection has been released");
    } catch (error) {
      console.error("Error releasing pre-inspection:", error);
      showToast("Failed to release pre-inspection");
      throw error;
    }
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

    try {
      await persistInspection(formData);
    } catch (error) {
      console.error("Error saving pre-inspection:", error);
      showToast("Failed to save pre-inspection");
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

  const renderPage = () => {
    const currentTab = tabs[currentPage];

    switch (currentTab) {
      case "Basic Information":
        return (
          <PreInspectionModalInfo
            formData={formData}
            updateForm={updateForm}
            isEditable={false}
            rpcOptions={rpcOptions}
          />
        );
      case "Station 1 and 2":
        return (
          <PreInspectionModalStations
            formData={formData}
            updateForm={updateForm}
            isEditable={isFormEditable}
          />
        );
      case "Station 3 and Sling":
        return (
          <PreInspectionModalSling
            formData={formData}
            updateForm={updateForm}
            isEditable={isFormEditable}
          />
        );
      case "Floats and Onboard":
        return (
          <PreInspectionModalFloatsOnboard
            formData={formData}
            updateForm={updateForm}
            isEditable={isFormEditable}
          />
        );
      default:
        return null;
    }
  };

  // Determine which action button to show on last page
  const showReleaseButton =
    isMechanic &&
    !readOnly &&
    formData.status === "pending" &&
    !formData.releasedBy?.name &&
    !isSubmitting;
  const showAcceptButton =
    isPilot &&
    !readOnly &&
    formData.status === "released" &&
    !formData.acceptedBy?.name &&
    !isSubmitting;

  const footerActionLabel =
    readOnly ||
    isPilot ||
    formData.status === "completed" ||
    (!isFormEditable && !showAcceptButton && !showReleaseButton)
      ? "Close"
      : "Save";

  const handleFooterAction = () => {
    if (footerActionLabel === "Close") {
      onClose();
      return;
    }

    handleSave();
  };

  // Format timestamp
  const formatDate = (timestamp) => {
    if (!timestamp) return "";
    const date = new Date(timestamp);
    return date.toLocaleString();
  };

  return (
    <Modal visible={visible} animationType="fade" onRequestClose={onClose}>
      <SafeAreaView style={{ flex: 1, backgroundColor: "#F9F9F9" }}>
        <StatusBar barStyle="dark-content" backgroundColor="#F9F9F9" />

        {/* Tab Bar */}
        <View style={{ paddingTop: 16, backgroundColor: "#F9F9F9" }}>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={{ paddingHorizontal: 16, gap: 12 }}
          >
            {tabs.map((tab, index) => (
              <TouchableOpacity
                key={index}
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
                <Text
                  style={{
                    fontSize: 14,
                    fontWeight: "500",
                    color:
                      currentPage === index ? COLORS.white : COLORS.grayDark,
                  }}
                >
                  {tab}
                </Text>
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

          <TouchableOpacity
            onPress={onClose}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            style={{ position: "absolute", top: 16, right: 16, zIndex: 10 }}
          >
            <MaterialCommunityIcons
              name="close"
              size={24}
              color={COLORS.grayDark}
            />
          </TouchableOpacity>
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

          {/* Action Buttons and Signatures - Only on Last Page */}
          {isLastPage && (
            <View style={{ marginTop: 20, marginBottom: 20 }}>
              {showReleaseButton && (
                <TouchableOpacity
                  onPress={() => {
                    if (validateBeforeSigning("release")) {
                      setShowReleaseModal(true);
                    }
                  }}
                  style={{
                    backgroundColor: COLORS.primaryLight,
                    paddingVertical: 12,
                    borderRadius: 8,
                    alignItems: "center",
                    marginBottom: 20,
                  }}
                >
                  <Text
                    style={{
                      color: COLORS.white,
                      fontWeight: "600",
                      fontSize: 16,
                    }}
                  >
                    Release
                  </Text>
                </TouchableOpacity>
              )}

              {showAcceptButton && (
                <TouchableOpacity
                  onPress={() => {
                    if (validateBeforeSigning("acceptance")) {
                      setShowAcceptModal(true);
                    }
                  }}
                  style={{
                    backgroundColor: COLORS.primaryLight,
                    paddingVertical: 12,
                    borderRadius: 8,
                    alignItems: "center",
                    marginBottom: 20,
                  }}
                >
                  <Text
                    style={{
                      color: COLORS.white,
                      fontWeight: "600",
                      fontSize: 16,
                    }}
                  >
                    Accept
                  </Text>
                </TouchableOpacity>
              )}

              {/* Released By Card */}
              {formData.releasedBy?.name && (
                <View
                  style={{
                    backgroundColor: COLORS.white,
                    borderRadius: 12,
                    borderWidth: 1,
                    borderColor: COLORS.grayMedium,
                    marginBottom: 20,
                    overflow: "hidden",
                  }}
                >
                  <View
                    style={{
                      backgroundColor: COLORS.primaryLight,
                      paddingVertical: 14,
                      paddingHorizontal: 16,
                    }}
                  >
                    <Text
                      style={{
                        fontSize: 16,
                        color: COLORS.white,
                        fontWeight: "600",
                      }}
                    >
                      RELEASED BY:
                    </Text>
                  </View>
                  <View style={{ padding: 20 }}>
                    <Text
                      style={{
                        fontSize: 14,
                        color: COLORS.black,
                        marginBottom: 4,
                        fontWeight: "500",
                      }}
                    >
                      {formData.releasedBy.name} / {formData.releasedBy.id}
                    </Text>
                    <Text
                      style={{
                        fontSize: 12,
                        color: COLORS.grayDark,
                        textTransform: "uppercase",
                      }}
                    >
                      MECHANIC
                    </Text>
                    <Text
                      style={{
                        fontSize: 12,
                        color: COLORS.grayDark,
                        marginTop: 8,
                      }}
                    >
                      {formatDate(formData.releasedBy.timestamp)}
                    </Text>
                    {!!formData.releasedBy.signature && (
                      <Image
                        source={{ uri: formData.releasedBy.signature }}
                        style={{
                          width: "100%",
                          height: 80,
                          resizeMode: "contain",
                          marginTop: 12,
                          backgroundColor: COLORS.white,
                        }}
                      />
                    )}
                  </View>
                </View>
              )}

              {/* Accepted By Card */}
              {formData.acceptedBy?.name && (
                <View
                  style={{
                    backgroundColor: COLORS.white,
                    borderRadius: 12,
                    borderWidth: 1,
                    borderColor: COLORS.grayMedium,
                    marginBottom: 20,
                    overflow: "hidden",
                  }}
                >
                  <View
                    style={{
                      backgroundColor: COLORS.primaryLight,
                      paddingVertical: 14,
                      paddingHorizontal: 16,
                    }}
                  >
                    <Text
                      style={{
                        fontSize: 16,
                        color: COLORS.white,
                        fontWeight: "600",
                      }}
                    >
                      ACCEPTED BY:
                    </Text>
                  </View>
                  <View style={{ padding: 20 }}>
                    <Text
                      style={{
                        fontSize: 14,
                        color: COLORS.black,
                        marginBottom: 4,
                        fontWeight: "500",
                      }}
                    >
                      {formData.acceptedBy.name} / {formData.acceptedBy.id}
                    </Text>
                    <Text
                      style={{
                        fontSize: 12,
                        color: COLORS.grayDark,
                        textTransform: "uppercase",
                      }}
                    >
                      PILOT
                    </Text>
                    <Text
                      style={{
                        fontSize: 12,
                        color: COLORS.grayDark,
                        marginTop: 8,
                      }}
                    >
                      {formatDate(formData.acceptedBy.timestamp)}
                    </Text>
                    {!!formData.acceptedBy.signature && (
                      <Image
                        source={{ uri: formData.acceptedBy.signature }}
                        style={{
                          width: "100%",
                          height: 80,
                          resizeMode: "contain",
                          marginTop: 12,
                          backgroundColor: COLORS.white,
                        }}
                      />
                    )}
                  </View>
                </View>
              )}
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
            disabled={currentPage === 0 || isSubmitting}
            style={{
              paddingVertical: 8,
              paddingHorizontal: 16,
              borderRadius: 4,
              backgroundColor: COLORS.white,
              borderWidth: 1,
              borderColor: COLORS.grayMedium,
              opacity: currentPage === 0 || isSubmitting ? 0.5 : 1,
            }}
          >
            <Text style={{ color: COLORS.grayDark, fontSize: 14 }}>
              Previous
            </Text>
          </TouchableOpacity>

          <View
            style={{
              backgroundColor: COLORS.primaryLight,
              paddingVertical: 8,
              paddingHorizontal: 14,
              borderRadius: 4,
            }}
          >
            <Text
              style={{ color: COLORS.white, fontWeight: "600", fontSize: 14 }}
            >
              {currentPage + 1}
            </Text>
          </View>

          <TouchableOpacity
            onPress={isLastPage ? handleFooterAction : handleNext}
            disabled={isSubmitting}
            style={{
              paddingVertical: 8,
              paddingHorizontal: 24,
              borderRadius: 4,
              backgroundColor: COLORS.primaryLight,
              opacity: isSubmitting ? 0.6 : 1,
            }}
          >
            <Text
              style={{ color: COLORS.white, fontSize: 14, fontWeight: "600" }}
            >
              {isLastPage ? footerActionLabel : "Next"}
            </Text>
          </TouchableOpacity>
        </View>

        <PreInspectionSignatureModal
          visible={showReleaseModal}
          title="Release Signature"
          onClose={() => setShowReleaseModal(false)}
          onSave={handleRelease}
          aircraftRPC={formData.rpc}
          actionLabel="release"
        />

        <PreInspectionSignatureModal
          visible={showAcceptModal}
          title="Accept Signature"
          onClose={() => setShowAcceptModal(false)}
          onSave={handleAccept}
          aircraftRPC={formData.rpc}
          actionLabel="accept"
        />
      </SafeAreaView>
    </Modal>
  );
}
