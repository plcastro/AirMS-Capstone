import React, { useState, useEffect, useRef } from "react";
import {
  View,
  Text,
  Modal,
  TouchableOpacity,
  ScrollView,
  StatusBar,
  Alert,
  Image,
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
import PostInspectionSignatureModal from "./PostInspectionSignatureModal";
import {
  areAllPostInspectionChecksComplete,
  getDefaultPostInspectionFormData,
} from "./PostInspectionForms";

export default function PostInspectionEditEntry({
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
  const canReleasePostInspection =
    userRole === "mechanic" || userRole === "maintenance manager";
  const tabs = [
    "Basic Information",
    "Station 1",
    "Station 2",
    "Engine",
    "Main Rotor",
    "Cabin Interior",
  ];
  const totalPages = tabs.length;
  const isLastPage = currentPage === totalPages - 1;

  const [formData, setFormData] = useState(
    getDefaultPostInspectionFormData(userRole),
  );

  useEffect(() => {
    if (visible && inspectionData) {
      setFormData({
        ...getDefaultPostInspectionFormData(userRole),
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

  const persistInspection = async (nextFormData) => {
    if (isSubmitting) {
      return;
    }
    setIsSubmitting(true);
    try {
      await onSave(nextFormData);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleRelease = async (signatureData) => {
    if (!areAllPostInspectionChecksComplete(formData)) {
      Alert.alert(
        "Validation Error",
        "All checklist fields must be checked before release.",
      );
      return;
    }

    const nextFormData = {
      ...formData,
      releasedBy: {
        name: signatureData.name,
        id: signatureData.id,
        signature: signatureData.signature,
        timestamp: new Date().toISOString(),
      },
      status: "released",
    };

    await persistInspection(nextFormData);
  };

  const handleAccept = async (signatureData) => {
    if (!areAllPostInspectionChecksComplete(formData)) {
      Alert.alert(
        "Validation Error",
        "All checklist fields must be checked before acceptance.",
      );
      return;
    }

    const nextFormData = {
      ...formData,
      acceptedBy: {
        name: signatureData.name,
        id: signatureData.id,
        signature: signatureData.signature,
        timestamp: new Date().toISOString(),
      },
      status: "completed",
    };

    await persistInspection(nextFormData);
  };

  const handleSave = async () => {
    if (!formData.rpc || formData.rpc.trim() === "") {
      Alert.alert("Validation Error", "Aircraft RPC is required");
      return;
    }
    if (!formData.aircraftType || formData.aircraftType.trim() === "") {
      Alert.alert("Validation Error", "Aircraft Type is required");
      return;
    }
    await persistInspection(formData);
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

  const hasReleaseSignature = Boolean(formData.releasedBy?.name);
  const hasAcceptSignature = Boolean(formData.acceptedBy?.name);
  const isFormEditable =
    !readOnly && !isPilot && !hasReleaseSignature && !hasAcceptSignature;

  const renderPage = () => {
    const currentTab = tabs[currentPage];

    switch (currentTab) {
      case "Basic Information":
        return (
          <PostInspectionModalInfo
            formData={formData}
            updateForm={updateForm}
            isEditable={false}
            rpcOptions={rpcOptions}
          />
        );
      case "Station 1":
        return (
          <PostInspectionModalStation1
            formData={formData}
            updateForm={updateForm}
            isEditable={isFormEditable}
          />
        );
      case "Station 2":
        return (
          <PostInspectionModalStation2
            formData={formData}
            updateForm={updateForm}
            isEditable={isFormEditable}
          />
        );
      case "Engine":
        return (
          <PostInspectionModalEngine
            formData={formData}
            updateForm={updateForm}
            isEditable={isFormEditable}
          />
        );
      case "Main Rotor":
        return (
          <PostInspectionModalMainRotor
            formData={formData}
            updateForm={updateForm}
            isEditable={isFormEditable}
          />
        );
      case "Cabin Interior":
        return (
          <PostInspectionModalCabinInterior
            formData={formData}
            updateForm={updateForm}
            isEditable={isFormEditable}
          />
        );
      default:
        return null;
    }
  };

  const formatDate = (timestamp) => {
    if (!timestamp) return "";
    const date = new Date(timestamp);
    return date.toLocaleString();
  };

  const showReleaseButton =
    canReleasePostInspection &&
    !readOnly &&
    !hasReleaseSignature &&
    formData.status === "pending" &&
    !isSubmitting;
  const showAcceptButton =
    isPilot &&
    !readOnly &&
    hasReleaseSignature &&
    !hasAcceptSignature &&
    formData.status === "released" &&
    !isSubmitting;
  const footerActionLabel =
    readOnly || isPilot || formData.status === "released" || formData.status === "completed"
      ? "Close"
      : "Save";
  const handleFooterAction = () => {
    if (footerActionLabel === "Close") {
      onClose();
      return;
    }
    handleSave();
  };

  return (
    <Modal visible={visible} animationType="fade" onRequestClose={onClose}>
      <SafeAreaView style={{ flex: 1, backgroundColor: "#F9F9F9" }}>
        <StatusBar barStyle="dark-content" backgroundColor="#F9F9F9" />

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

        <ScrollView
          ref={scrollViewRef}
          style={{ flex: 1, paddingHorizontal: 20 }}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
          contentContainerStyle={{ paddingTop: 16, paddingBottom: 20 }}
        >
          {renderPage()}

          {isLastPage && (
            <View style={{ marginTop: 20, marginBottom: 20 }}>
              {showReleaseButton && (
                <TouchableOpacity
                  onPress={() => setShowReleaseModal(true)}
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
                  onPress={() => setShowAcceptModal(true)}
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
                      {userRole === "maintenance manager"
                        ? "MAINTENANCE MANAGER"
                        : "MECHANIC"}
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

        <PostInspectionSignatureModal
          visible={showReleaseModal}
          title="Release Signature"
          onClose={() => setShowReleaseModal(false)}
          onSave={handleRelease}
          aircraftRPC={formData.rpc}
          actionLabel="release"
        />

        <PostInspectionSignatureModal
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
