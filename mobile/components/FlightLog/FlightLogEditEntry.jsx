import React, { useState, useEffect, useRef } from "react";
import {
  View,
  Text,
  Modal,
  TouchableOpacity,
  ScrollView,
  StatusBar,
  TextInput,
  Alert,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { COLORS } from "../../stylesheets/colors";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import FlightLogModalInfo from "./FlightLogModalInfo";
import FlightLogModalDestinations from "./FlightLogModalDestinations";
import FlightLogModalComponentTimes from "./FlightLogModalComponentTimes";
import FlightLogModalFuelServicing from "./FlightLogModalFuelServicing";
import FlightLogModalOilServicing from "./FlightLogModalOilServicing";
import FlightLogDiscrepancyRemarks from "./FlightLogDiscrepancyRemarks";
import FlightLogModalWorkDone from "./FlightLogModalWorkDone";
import FlightLogSignatureModal from "./FlightLogSignatureModal";

const parseDate = (dateValue) => {
  if (!dateValue) return new Date();
  if (dateValue instanceof Date) return dateValue;
  if (typeof dateValue === "string") {
    const parts = dateValue.split("/");
    if (parts.length === 3) {
      const month = parseInt(parts[0], 10) - 1;
      const day = parseInt(parts[1], 10);
      const year = parseInt(parts[2], 10);
      return new Date(year, month, day);
    }
    return new Date(dateValue);
  }
  if (typeof dateValue === "number") {
    return new Date(dateValue);
  }
  return new Date();
};

export default function FlightLogEditEntry({
  visible,
  logData,
  onClose,
  onSave,
  userRole,
}) {
  const [currentPage, setCurrentPage] = useState(0);
  const [showReleaseModal, setShowReleaseModal] = useState(false);
  const [showAcceptModal, setShowAcceptModal] = useState(false);
  const scrollViewRef = useRef(null);
  const isPilot = userRole === "pilot";
  const isMechanic =
    userRole.toLowerCase() === "mechanic" || userRole === "maintenance";

  const [formData, setFormData] = useState({});
  const [componentData, setComponentData] = useState({});
  const [workItems, setWorkItems] = useState([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (logData) {
      setFormData({
        ...logData,
        date: parseDate(logData.date),
      });
      setComponentData(
        logData.componentData || {
          broughtForwardData: {},
          thisFlightData: {},
          toDateData: {},
        },
      );
      setWorkItems(logData.workItems || []);
      setIsLoading(false);
    }
  }, [logData]);

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

  const hasDiscrepancy = () => {
    return (
      (formData.remarks && formData.remarks.trim() !== "") ||
      (formData.sling && formData.sling.trim() !== "")
    );
  };

  const showThisFlightToDate = formData.notifiedForCompletion === true;

  const getTabs = () => {
    const tabs = [
      "Basic Information",
      "Destination/s",
      "Component Times",
      "Fuel Servicing",
      "Oil Servicing",
      "Discrepancy/Remarks",
    ];
    if (hasDiscrepancy()) {
      tabs.push("Work Done");
    }
    return tabs;
  };

  const tabs = getTabs();
  const totalPages = tabs.length;
  const isLastPage = currentPage === totalPages - 1;

  const isBasicInfoEditable =
    (isPilot && formData.createdBy === "pilot") ||
    (isMechanic && formData.createdBy === "mechanic");

  const isDestinationsEditable =
    (isPilot && formData.createdBy === "pilot") ||
    (isPilot && formData.createdBy === "mechanic");

  const isComponentEditable = isMechanic && !formData.broughtForwardLocked;
  const isBroughtForwardLocked = formData.broughtForwardLocked === true;

  const isFuelOilEditable = isMechanic;
  const isDiscrepancyEditable = true;
  const isWorkDoneEditable = isMechanic;

  const updateForm = (field, value) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const updateLeg = (updatedLegData) => {
    setFormData(updatedLegData);
  };

  const updateFuelServicing = (legIndex, data) => {
    const newFuelServicing = [...(formData.fuelServicing || [])];
    newFuelServicing[legIndex] = data;
    setFormData((prev) => ({ ...prev, fuelServicing: newFuelServicing }));
  };

  const updateOilServicing = (legIndex, data) => {
    const newOilServicing = [...(formData.oilServicing || [])];
    newOilServicing[legIndex] = data;
    setFormData((prev) => ({ ...prev, oilServicing: newOilServicing }));
  };

  const updateComponent = (section, field, value) => {
    setComponentData((prev) => ({
      ...prev,
      [section]: { ...prev[section], [field]: value },
    }));
  };

  const updateWorkItems = (newWorkItems) => {
    setWorkItems(newWorkItems);
    setFormData((prev) => ({ ...prev, workItems: newWorkItems }));
  };

  const handleRelease = (signature) => {
    setFormData((prev) => ({
      ...prev,
      releasedBy: {
        name: "Mechanic",
        signature,
        timestamp: new Date().toISOString(),
      },
      status: "ongoing",
    }));
    Alert.alert("Success", "Flight log has been released");
  };

  const handleAccept = (signature) => {
    setFormData((prev) => ({
      ...prev,
      acceptedBy: {
        name: "Pilot",
        signature,
        timestamp: new Date().toISOString(),
      },
      status: "ongoing",
    }));
    Alert.alert("Success", "Flight log has been accepted");
  };

  const handleNotifyMechanic = () => {
    setFormData((prev) => ({
      ...prev,
      notifiedForCompletion: true,
    }));
    Alert.alert(
      "Success",
      "Mechanic has been notified to complete the flight log",
    );
  };

  const handleComplete = () => {
    setFormData((prev) => ({
      ...prev,
      status: "completed",
    }));
    Alert.alert("Success", "Flight log has been marked as completed");
  };

  const handleSave = () => {
    const allFieldsFilled =
      componentData.broughtForwardData &&
      Object.values(componentData.broughtForwardData).every((v) => v !== "");

    onSave({
      ...formData,
      componentData,
      workItems,
      broughtForwardLocked: isMechanic && allFieldsFilled,
    });
    onClose();
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

  const showActionButtons = isLastPage;

  const showReleaseButton = isMechanic && formData.status === "pending_release";
  const showAcceptButton = isPilot && formData.status === "pending_acceptance";
  const showNotifyButton =
    isPilot && formData.status === "ongoing" && !formData.notifiedForCompletion;
  const showCompleteButton =
    isMechanic &&
    formData.status === "ongoing" &&
    formData.notifiedForCompletion;

  const renderPage = () => {
    const currentTab = tabs[currentPage];

    switch (currentTab) {
      case "Basic Information":
        return (
          <FlightLogModalInfo
            formData={formData}
            updateForm={updateForm}
            isEditable={isBasicInfoEditable}
          />
        );

      case "Destination/s":
        return (
          <FlightLogModalDestinations
            legData={formData}
            onUpdateLeg={updateLeg}
            isEditable={isDestinationsEditable}
            userRole={userRole}
          />
        );

      case "Component Times":
        return (
          <>
            <FlightLogModalComponentTimes
              currentComponentPage={0}
              componentData={componentData.broughtForwardData}
              onUpdateComponent={(field, value) =>
                updateComponent("broughtForwardData", field, value)
              }
              isEditable={isComponentEditable}
              isLocked={isBroughtForwardLocked}
            />
            {showThisFlightToDate && (
              <>
                <View style={{ marginTop: 20 }}>
                  <FlightLogModalComponentTimes
                    currentComponentPage={1}
                    componentData={componentData.thisFlightData}
                    onUpdateComponent={(field, value) =>
                      updateComponent("thisFlightData", field, value)
                    }
                    isEditable={isComponentEditable}
                    isLocked={false}
                  />
                </View>
                <View style={{ marginTop: 20 }}>
                  <FlightLogModalComponentTimes
                    currentComponentPage={2}
                    componentData={componentData.toDateData}
                    onUpdateComponent={(field, value) =>
                      updateComponent("toDateData", field, value)
                    }
                    isEditable={isComponentEditable}
                    isLocked={false}
                  />
                </View>
              </>
            )}
          </>
        );

      case "Fuel Servicing":
        return (
          <FlightLogModalFuelServicing
            legs={formData.legs || []}
            fuelServicingData={formData.fuelServicing || []}
            onUpdateFuelServicing={updateFuelServicing}
            isEditable={isFuelOilEditable}
          />
        );

      case "Oil Servicing":
        return (
          <FlightLogModalOilServicing
            legs={formData.legs || []}
            oilServicingData={formData.oilServicing || []}
            onUpdateOilServicing={updateOilServicing}
            isEditable={isFuelOilEditable}
          />
        );

      case "Discrepancy/Remarks":
        return (
          <FlightLogDiscrepancyRemarks
            remarks={formData.remarks || ""}
            sling={formData.sling || ""}
            onUpdateRemarks={(text) => updateForm("remarks", text)}
            onUpdateSling={(text) => updateForm("sling", text)}
            isEditable={isDiscrepancyEditable}
          />
        );

      case "Work Done":
        return (
          <FlightLogModalWorkDone
            workItems={workItems}
            onUpdateWorkItems={updateWorkItems}
            isEditable={isWorkDoneEditable}
          />
        );

      default:
        return null;
    }
  };

  if (isLoading || !formData) {
    return null;
  }

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

          {showActionButtons && (
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

              {showNotifyButton && (
                <TouchableOpacity
                  onPress={handleNotifyMechanic}
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
                    Notify Mechanic for Completing Flights
                  </Text>
                </TouchableOpacity>
              )}

              {showCompleteButton && (
                <TouchableOpacity
                  onPress={handleComplete}
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
                    Complete
                  </Text>
                </TouchableOpacity>
              )}

              {formData.releasedBy?.signature && (
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
                        marginBottom: 8,
                      }}
                    >
                      {formData.releasedBy?.name || "Unknown"}
                    </Text>
                    <Text style={{ fontSize: 12, color: COLORS.grayDark }}>
                      {formData.releasedBy?.timestamp
                        ? new Date(
                            formData.releasedBy.timestamp,
                          ).toLocaleString()
                        : ""}
                    </Text>
                  </View>
                </View>
              )}

              {formData.acceptedBy?.signature && (
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
                        marginBottom: 8,
                      }}
                    >
                      {formData.acceptedBy?.name || "Unknown"}
                    </Text>
                    <Text style={{ fontSize: 12, color: COLORS.grayDark }}>
                      {formData.acceptedBy?.timestamp
                        ? new Date(
                            formData.acceptedBy.timestamp,
                          ).toLocaleString()
                        : ""}
                    </Text>
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
            onPress={isLastPage ? handleSave : handleNext}
            style={{
              paddingVertical: 8,
              paddingHorizontal: 24,
              borderRadius: 4,
              backgroundColor: COLORS.primaryLight,
              opacity: 1,
            }}
          >
            <Text
              style={{ color: COLORS.white, fontSize: 14, fontWeight: "600" }}
            >
              {isLastPage ? "Save" : "Next"}
            </Text>
          </TouchableOpacity>
        </View>

        <FlightLogSignatureModal
          visible={showReleaseModal}
          title="Release Signature"
          onClose={() => setShowReleaseModal(false)}
          onSave={handleRelease}
          aircraftRPC={formData.rpc}
        />

        <FlightLogSignatureModal
          visible={showAcceptModal}
          title="Accept Signature"
          onClose={() => setShowAcceptModal(false)}
          onSave={handleAccept}
          aircraftRPC={formData.rpc}
        />
      </SafeAreaView>
    </Modal>
  );
}
