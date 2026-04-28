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
import FlightLogModalInfo from "./FlightLogModalInfo";
import FlightLogModalDestinations from "./FlightLogModalDestinations";
import FlightLogModalBroughtForward from "./FlightLogModalBroughtForward";
import FlightLogModalThisFlight from "./FlightLogModalThisFlight";
import FlightLogModalToDate from "./FlightLogModalToDate";
import FlightLogModalFuelServicing from "./FlightLogModalFuelServicing";
import FlightLogModalOilServicing from "./FlightLogModalOilServicing";
import FlightLogDiscrepancyRemarks from "./FlightLogDiscrepancyRemarks";
import FlightLogModalWorkDone from "./FlightLogModalWorkDone";
import FlightLogSignatureModal from "./FlightLogSignatureModal";
import AlertComp from "../AlertComp";
import { API_BASE } from "../../utilities/API_BASE";
import { showToast } from "../../utilities/toast";

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

const isReleasedFlightLogStatus = (status = "") =>
  ["pending_acceptance", "released", "accepted", "completed"].includes(
    String(status || "").trim().toLowerCase(),
  );

const hasDestinationInfo = (log = {}) =>
  Array.isArray(log.legs) &&
  log.legs.some((leg) =>
    Array.isArray(leg?.stations) &&
    leg.stations.some(
      (station) =>
        String(station?.from || "").trim() &&
        String(station?.to || "").trim(),
    ),
  );

const formatSignatureDate = (timestamp) => {
  if (!timestamp) return "";

  const parsed = new Date(timestamp);
  if (Number.isNaN(parsed.getTime())) return "";

  return parsed.toLocaleString();
};

const getSignerLabel = (signatureData = {}) =>
  signatureData.id
    ? `${signatureData.name || "Unknown"} / ${signatureData.id}`
    : signatureData.name || "Unknown";

export default function FlightLogEditEntry({
  visible,
  logData,
  onClose,
  onSave,
  userRole,
  readOnly = false,
}) {
  const [currentPage, setCurrentPage] = useState(0);
  const [showReleaseModal, setShowReleaseModal] = useState(false);
  const [showAcceptModal, setShowAcceptModal] = useState(false);
  const [feedbackAlert, setFeedbackAlert] = useState({
    visible: false,
    title: "",
    message: "",
    closeOnFinish: false,
  });
  const scrollViewRef = useRef(null);
  const normalizedRole = (userRole || "").toLowerCase();
  const isPilot = normalizedRole === "pilot";
  const isMechanic =
    normalizedRole === "mechanic" || normalizedRole === "maintenance manager";

  const [formData, setFormData] = useState({});
  const [componentData, setComponentData] = useState({});
  const [workItems, setWorkItems] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [toDateData, setToDateData] = useState({});

  // Load log data
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

  // Calculate toDateData whenever broughtForwardData or thisFlightData changes
  useEffect(() => {
    const bf = componentData.broughtForwardData || {};
    const tf = componentData.thisFlightData || {};
    const calculated = {
      airframe: (parseFloat(bf.airframe) || 0) + (parseFloat(tf.airframe) || 0),
      gearBoxMain: (parseFloat(bf.gearBoxMain) || 0) + (parseFloat(tf.gearBoxMain) || 0),
      gearBoxTail: (parseFloat(bf.gearBoxTail) || 0) + (parseFloat(tf.gearBoxTail) || 0),
      rotorMain: (parseFloat(bf.rotorMain) || 0) + (parseFloat(tf.rotorMain) || 0),
      rotorTail: (parseFloat(bf.rotorTail) || 0) + (parseFloat(tf.rotorTail) || 0),
      engine: (parseFloat(bf.engine) || 0) + (parseFloat(tf.engine) || 0),
      cycleN1: (parseFloat(bf.cycleN1) || 0) + (parseFloat(tf.cycleN1) || 0),
      cycleN2: (parseFloat(bf.cycleN2) || 0) + (parseFloat(tf.cycleN2) || 0),
      landingCycle: (parseFloat(bf.landingCycle) || 0) + (parseFloat(tf.landingCycle) || 0),
      usage: (parseFloat(bf.usage) || 0) + (parseFloat(tf.usage) || 0),
      airframeNextInsp: tf.airframeNextInsp || bf.airframeNextInsp,
      engineNextInsp: tf.engineNextInsp || bf.engineNextInsp,
    };
    setToDateData(calculated);
    // Also keep componentData.toDateData in sync for saving
    setComponentData(prev => ({ ...prev, toDateData: calculated }));
  }, [componentData.broughtForwardData, componentData.thisFlightData]);

  // Reset page when modal opens
  useEffect(() => {
    if (visible) {
      setCurrentPage(0);
      scrollViewRef.current?.scrollTo({ y: 0, animated: false });
    }
  }, [visible]);

  // Scroll to top on page change
  useEffect(() => {
    scrollViewRef.current?.scrollTo({ y: 0, animated: false });
  }, [currentPage]);

  const hasDiscrepancy = () => {
    return formData.remarks && formData.remarks.trim() !== "";
  };

  const getFlightLogTabs = () => {
    const nextTabs = [
      "Basic Information",
      "Destination/s",
      "Brought Forward",
      "This Flight",
      "To Date",
      "Fuel Servicing",
      "Oil Servicing",
      "Discrepancy/Remarks",
    ];

    if (hasDiscrepancy()) {
      nextTabs.push("Work Done");
    }

    return nextTabs;
  };

  const tabs = getFlightLogTabs();
  const totalPages = tabs.length;
  const isLastPage = currentPage === totalPages - 1;
  const isCompletedLog = formData.status === "completed";

  // Keep edit permissions aligned with FlightLogEntry role rules.
  const isBasicInfoEditable = !readOnly && !isCompletedLog;
  const isRPCEditable = !isReleasedFlightLogStatus(formData.status);
  const isDestinationsEditable = !readOnly && !isCompletedLog && isPilot;
  const isComponentEditable = !readOnly && !isCompletedLog && isMechanic;
  const isBroughtForwardLocked = formData.broughtForwardLocked === true;

  const isFuelOilEditable = !readOnly && !isCompletedLog && isMechanic;
  const isDiscrepancyEditable = !readOnly && !isCompletedLog;
  const isWorkDoneEditable =
    !readOnly && !isCompletedLog && isMechanic && formData.status === "pending_release";

  useEffect(() => {
    if (currentPage > totalPages - 1) {
      setCurrentPage(Math.max(totalPages - 1, 0));
    }
  }, [currentPage, totalPages]);

  // Update functions
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
    setComponentData(prev => ({
      ...prev,
      [section]: { ...prev[section], [field]: value },
    }));
    // toDateData will be recalculated by the useEffect above
  };

  const updateWorkItems = (newWorkItems) => {
    setWorkItems(newWorkItems);
    setFormData((prev) => ({ ...prev, workItems: newWorkItems }));
  };

  const persistLog = async (updatedFormData, closeOnSave = false) => {
    const bf = componentData.broughtForwardData || {};
    const tf = componentData.thisFlightData || {};
    const calculatedToDate = {
      airframe: (parseFloat(bf.airframe) || 0) + (parseFloat(tf.airframe) || 0),
      gearBoxMain: (parseFloat(bf.gearBoxMain) || 0) + (parseFloat(tf.gearBoxMain) || 0),
      gearBoxTail: (parseFloat(bf.gearBoxTail) || 0) + (parseFloat(tf.gearBoxTail) || 0),
      rotorMain: (parseFloat(bf.rotorMain) || 0) + (parseFloat(tf.rotorMain) || 0),
      rotorTail: (parseFloat(bf.rotorTail) || 0) + (parseFloat(tf.rotorTail) || 0),
      engine: (parseFloat(bf.engine) || 0) + (parseFloat(tf.engine) || 0),
      cycleN1: (parseFloat(bf.cycleN1) || 0) + (parseFloat(tf.cycleN1) || 0),
      cycleN2: (parseFloat(bf.cycleN2) || 0) + (parseFloat(tf.cycleN2) || 0),
      landingCycle: (parseFloat(bf.landingCycle) || 0) + (parseFloat(tf.landingCycle) || 0),
      usage: (parseFloat(bf.usage) || 0) + (parseFloat(tf.usage) || 0),
      airframeNextInsp: tf.airframeNextInsp || bf.airframeNextInsp,
      engineNextInsp: tf.engineNextInsp || bf.engineNextInsp,
    };

    const finalComponentData = {
      ...componentData,
      toDateData: calculatedToDate,
    };

    const allFieldsFilled =
      componentData.broughtForwardData &&
      Object.values(componentData.broughtForwardData).every((v) => v !== "");

    const payload = {
      ...updatedFormData,
      componentData: finalComponentData,
      workItems,
      broughtForwardLocked: isMechanic && allFieldsFilled,
    };

    if (onSave) {
      await onSave(payload, { closeOnSave, showToast: closeOnSave });
    }
  };

  const showFeedbackAlert = (message, closeOnFinish = true, title = "Success") => {
    setFeedbackAlert({
      visible: true,
      title,
      message,
      closeOnFinish,
    });
  };

  // Handlers for release/accept/complete
  const handleRelease = async (signature) => {
    const updated = {
      ...formData,
      releasedBy: {
        name: "Mechanic",
        signature,
        timestamp: new Date().toISOString(),
      },
      status: "pending_acceptance",
    };
    setFormData(updated);
    await persistLog(updated, false);
    setShowReleaseModal(false);
    showFeedbackAlert("Flight log has been released");
  };

  const handleAccept = async (signature) => {
    if (!formData.releasedBy?.signature && !formData.releasedBy?.name) {
      showToast("This flight log must be released by a mechanic before acceptance.");
      return;
    }

    const updated = {
      ...formData,
      acceptedBy: {
        name: "Pilot",
        signature,
        timestamp: new Date().toISOString(),
      },
      status: "accepted",
    };
    setFormData(updated);
    await persistLog(updated, false);
    setShowAcceptModal(false);
    showFeedbackAlert("Flight log has been accepted");
  };

  const handleNotifyMechanic = async () => {
    if (!hasDestinationInfo(formData)) {
      showToast(
        "Add at least one complete From-To station in Destination/s before notifying for completion.",
      );
      return;
    }

    const updated = {
      ...formData,
      notifiedForCompletion: true,
    };
    setFormData(updated);
    await persistLog(updated, false);
    showFeedbackAlert("Mechanic has been notified to complete the flight log");
  };

  const handleComplete = async () => {
    try {
      const aircraft = formData.aircraft || formData.rpc;
      if (!aircraft) {
        showToast("Aircraft identifier is missing.");
        return;
      }

      const payload = {
        acftTT: Number(toDateData.airframe) || 0,
        engTT: Number(toDateData.engine) || Number(toDateData.airframe) || 0,
        n1Cycles: Number(toDateData.cycleN1) || 0,
        n2Cycles: Number(toDateData.cycleN2) || 0,
        landings: Number(toDateData.landingCycle) || 0,
        updatedBy: userRole,
      };

      // ✅ Correct URL: add '/api' prefix
      const url = `${API_BASE}/api/parts-monitoring/${encodeURIComponent(aircraft)}/update-totals`;

      console.log('🔗 Complete PUT URL:', url);
      console.log('📦 Payload:', payload);

      const response = await fetch(url, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
        },
        body: JSON.stringify(payload),
      });

      const text = await response.text();
      console.log('📨 Response status:', response.status);
      console.log('📝 Raw response (first 500 chars):', text.substring(0, 500));

      const contentType = response.headers.get('content-type') || '';
      if (!contentType.includes('application/json')) {
        throw new Error(
          `Server returned ${contentType} instead of JSON. ` +
          `Status: ${response.status}. ` +
          `Response preview: ${text.substring(0, 200)}`
        );
      }

      let result;
      try {
        result = JSON.parse(text);
      } catch (e) {
        throw new Error(`Invalid JSON response: ${text.substring(0, 200)}`);
      }

      if (!response.ok || !result.success) {
        throw new Error(result.message || `HTTP ${response.status}: Failed to update aircraft totals.`);
      }

      const updated = { ...formData, status: 'completed' };
      setFormData(updated);
      await persistLog(updated, false);
      showFeedbackAlert("Flight log completed and totals updated.");
    } catch (error) {
      console.error('❌ Complete error:', error);
      showToast(error.message || "Update failed");
    }
  };

  const handleSave = async () => {
    if (isCompletedLog) {
      showToast("Completed flight logs cannot be edited.");
      return;
    }

    await persistLog(formData, true);
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

  const showReleaseButton =
    !readOnly && !isCompletedLog && isMechanic && formData.status === "pending_release";
  const showAcceptButton =
    !readOnly &&
    !isCompletedLog &&
    isPilot &&
    formData.status === "pending_acceptance" &&
    Boolean(formData.releasedBy?.signature || formData.releasedBy?.name);
  const showNotifyButton =
    !readOnly &&
    !isCompletedLog &&
    isPilot &&
    formData.status === "accepted" &&
    !formData.notifiedForCompletion;
  const showCompleteButton =
    !readOnly &&
    !isCompletedLog &&
    isMechanic &&
    formData.status === "accepted" &&
    formData.notifiedForCompletion;
  const showActionButtons =
    showReleaseButton ||
    showAcceptButton ||
    showNotifyButton ||
    showCompleteButton ||
    Boolean(formData.releasedBy?.signature) ||
    Boolean(formData.acceptedBy?.signature);

  const renderPage = () => {
    const currentTab = tabs[currentPage];

    switch (currentTab) {
      case "Basic Information":
        return (
          <FlightLogModalInfo
            formData={formData}
            updateForm={updateForm}
            isEditable={isBasicInfoEditable}
            isRPCEditable={isRPCEditable}
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

      case "Brought Forward":
        return (
          <FlightLogModalBroughtForward
            componentData={componentData.broughtForwardData}
            onUpdateComponent={(field, value) =>
              updateComponent("broughtForwardData", field, value)
            }
            isEditable={isComponentEditable}
            isLocked={isBroughtForwardLocked}
          />
        );

      case "This Flight":
        return (
          <FlightLogModalThisFlight
            componentData={componentData.thisFlightData}
            onUpdateComponent={(field, value) =>
              updateComponent("thisFlightData", field, value)
            }
            isEditable={isComponentEditable}
          />
        );

      case "To Date":
        return (
          <FlightLogModalToDate
            componentData={toDateData}
            onUpdateComponent={(field, value) =>
              updateComponent("toDateData", field, value)
            }
            isEditable={false}
          />
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

              {(formData.releasedBy?.name || formData.releasedBy?.signature) && (
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
                      {getSignerLabel(formData.releasedBy)}
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
                      {formatSignatureDate(formData.releasedBy?.timestamp)}
                    </Text>
                    {!!formData.releasedBy?.signature && (
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

              {(formData.acceptedBy?.name || formData.acceptedBy?.signature) && (
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
                      {getSignerLabel(formData.acceptedBy)}
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
                      {formatSignatureDate(formData.acceptedBy?.timestamp)}
                    </Text>
                    {!!formData.acceptedBy?.signature && (
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
            <Text style={{ color: COLORS.grayDark, fontSize: 14 }}>Previous</Text>
          </TouchableOpacity>

          <View
            style={{
              backgroundColor: COLORS.primaryLight,
              paddingVertical: 8,
              paddingHorizontal: 14,
              borderRadius: 4,
            }}
          >
            <Text style={{ color: COLORS.white, fontWeight: "600", fontSize: 14 }}>
              {currentPage + 1}
            </Text>
          </View>

          <TouchableOpacity
            onPress={
              isLastPage ? (readOnly || isCompletedLog ? onClose : handleSave) : handleNext
            }
            style={{
              paddingVertical: 8,
              paddingHorizontal: 24,
              borderRadius: 4,
              backgroundColor: COLORS.primaryLight,
              opacity: 1,
            }}
          >
            <Text style={{ color: COLORS.white, fontSize: 14, fontWeight: "600" }}>
              {isLastPage ? (readOnly || isCompletedLog ? "Close" : "Save") : "Next"}
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

        <AlertComp
          visible={feedbackAlert.visible}
          title={feedbackAlert.title}
          message={feedbackAlert.message}
          duration={1400}
          onFinish={() => {
            const shouldClose = feedbackAlert.closeOnFinish;
            setFeedbackAlert((prev) => ({ ...prev, visible: false }));
            if (shouldClose) {
              onClose();
            }
          }}
        />
      </SafeAreaView>
    </Modal>
  );
}
