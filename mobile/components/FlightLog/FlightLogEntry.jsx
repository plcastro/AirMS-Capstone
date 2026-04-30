import React, { useState, useEffect, useRef } from "react";
import {
  View,
  Text,
  Modal,
  TouchableOpacity,
  ScrollView,
  StatusBar,
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

export default function FlightLogEntry({ visible, onClose, onSave, userRole }) {
  const [currentPage, setCurrentPage] = useState(0);
  const [loadedAircraftData, setLoadedAircraftData] = useState(null);
  const [showReleaseModal, setShowReleaseModal] = useState(false);
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

  const handleAircraftDataLoaded = (data) => {
    setLoadedAircraftData(data);
  };

  // Start with 1 leg only
  const [formData, setFormData] = useState({
    aircraftType: "",
    rpc: "",
    date: new Date(),
    controlNo: "",
    legs: [
      {
        stations: [{ from: "", to: "" }],
        blockTimeOn: "",
        blockTimeOff: "",
        flightTimeOn: "",
        flightTimeOff: "",
        totalTimeOn: "",
        totalTimeOff: "",
        date: "",
        passengers: "",
      },
    ],
    remarks: "",
    sling: "",
    fuelServicing: [],
    oilServicing: [],
    workItems: [],
    createdBy: userRole,
    status: "pending_release",
    notifiedForCompletion: false,
    broughtForwardLocked: false,
    releasedBy: { name: "", signature: "", timestamp: "" },
    acceptedBy: { name: "", signature: "", timestamp: "" },
  });

  const [componentData, setComponentData] = useState({
    broughtForwardData: {
      airframe: "",
      gearBoxMain: "",
      gearBoxTail: "",
      rotorMain: "",
      rotorTail: "",
      airframeNextInsp: "",
      engine: "",
      cycleN1: "",
      cycleN2: "",
      usage: "",
      landingCycle: "",
      engineNextInsp: "",
    },
    thisFlightData: {
      airframe: "",
      gearBoxMain: "",
      gearBoxTail: "",
      rotorMain: "",
      rotorTail: "",
      airframeNextInsp: "",
      engine: "",
      cycleN1: "",
      cycleN2: "",
      usage: "",
      landingCycle: "",
      engineNextInsp: "",
    },
    toDateData: {
      airframe: "",
      gearBoxMain: "",
      gearBoxTail: "",
      rotorMain: "",
      rotorTail: "",
      airframeNextInsp: "",
      engine: "",
      cycleN1: "",
      cycleN2: "",
      usage: "",
      landingCycle: "",
      engineNextInsp: "",
    },
  });

  const [toDateData, setToDateData] = useState({});

  const getEmptyComponentValues = () => ({
    airframe: "",
    gearBoxMain: "",
    gearBoxTail: "",
    rotorMain: "",
    rotorTail: "",
    airframeNextInsp: "",
    engine: "",
    cycleN1: "",
    cycleN2: "",
    usage: "",
    landingCycle: "",
    engineNextInsp: "",
  });

  const hasComponentValues = (values = {}) =>
    Object.values(values).some((value) => String(value ?? "").trim() !== "");

  const getReferenceBroughtForwardData = (aircraftData) => {
    const referenceData = aircraftData?.referenceData || {};

    return {
      ...getEmptyComponentValues(),
      airframe: referenceData.acftTT || "",
      gearBoxMain: referenceData.gbmTT || referenceData.acftTT || "",
      gearBoxTail: referenceData.gbtTT || referenceData.acftTT || "",
      rotorMain: referenceData.mrbTT || referenceData.acftTT || "",
      rotorTail: referenceData.trbTT || referenceData.acftTT || "",
      airframeNextInsp: referenceData.acrfNextInsp || "",
      engine: referenceData.engTT || referenceData.acftTT || "",
      cycleN1: referenceData.n1Cycles || "",
      cycleN2: referenceData.n2Cycles || "",
      usage: referenceData.usage || "",
      landingCycle: referenceData.landings || "",
      engineNextInsp: referenceData.engNextInsp || "",
    };
  };

  const fetchPreviousToDateData = async (rpc) => {
    if (!rpc) return null;

    try {
      const params = new URLSearchParams({
        page: "1",
        limit: "10",
        aircraftRPC: rpc,
        sortBy: "createdAt",
        sortOrder: "desc",
      });
      const response = await fetch(
        `${API_BASE}/api/flightlogs?${params.toString()}`,
      );
      const data = await response.json();

      if (!response.ok) {
        return null;
      }

      const previousLog = (data.data || []).find((log) =>
        hasComponentValues(log?.componentData?.toDateData),
      );

      return previousLog?.componentData?.toDateData || null;
    } catch (error) {
      console.error("Error fetching previous flight log To Date:", error);
      return null;
    }
  };

  // Auto-calculate toDateData whenever broughtForwardData or thisFlightData changes
  useEffect(() => {
    const bf = componentData.broughtForwardData || {};
    const tf = componentData.thisFlightData || {};
    const calculated = {
      airframe: (parseFloat(bf.airframe) || 0) + (parseFloat(tf.airframe) || 0),
      gearBoxMain:
        (parseFloat(bf.gearBoxMain) || 0) + (parseFloat(tf.gearBoxMain) || 0),
      gearBoxTail:
        (parseFloat(bf.gearBoxTail) || 0) + (parseFloat(tf.gearBoxTail) || 0),
      rotorMain:
        (parseFloat(bf.rotorMain) || 0) + (parseFloat(tf.rotorMain) || 0),
      rotorTail:
        (parseFloat(bf.rotorTail) || 0) + (parseFloat(tf.rotorTail) || 0),
      engine: (parseFloat(bf.engine) || 0) + (parseFloat(tf.engine) || 0),
      cycleN1: (parseFloat(bf.cycleN1) || 0) + (parseFloat(tf.cycleN1) || 0),
      cycleN2: (parseFloat(bf.cycleN2) || 0) + (parseFloat(tf.cycleN2) || 0),
      landingCycle:
        (parseFloat(bf.landingCycle) || 0) + (parseFloat(tf.landingCycle) || 0),
      usage: (parseFloat(bf.usage) || 0) + (parseFloat(tf.usage) || 0),
      airframeNextInsp: tf.airframeNextInsp || bf.airframeNextInsp,
      engineNextInsp: tf.engineNextInsp || bf.engineNextInsp,
    };
    setToDateData(calculated);
    // Also sync to componentData.toDateData for saving
    setComponentData((prev) => ({ ...prev, toDateData: calculated }));
  }, [componentData.broughtForwardData, componentData.thisFlightData]);

  // Populate Brought Forward from previous To Date, falling back to aircraft reference totals.
  useEffect(() => {
    if (!loadedAircraftData || !formData.rpc) {
      return;
    }

    let isActive = true;

    const populateBroughtForward = async () => {
      const previousToDate = await fetchPreviousToDateData(formData.rpc);
      const nextBroughtForward = hasComponentValues(previousToDate)
        ? { ...getEmptyComponentValues(), ...previousToDate }
        : getReferenceBroughtForwardData(loadedAircraftData);

      if (!isActive) {
        return;
      }

      setComponentData((prev) => ({
        ...prev,
        broughtForwardData: {
          ...prev.broughtForwardData,
          ...nextBroughtForward,
          usage:
            prev.broughtForwardData?.usage || nextBroughtForward.usage || "",
        },
      }));
    };

    populateBroughtForward();

    return () => {
      isActive = false;
    };
  }, [loadedAircraftData, formData.rpc]);

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
  const isBasicInfoEditable = true;
  const isDestinationsEditable = isPilot;
  const isMechanicSectionEditable = isMechanic;
  const isWorkDoneEditable =
    isMechanic && formData.status === "pending_release";
  const isDiscrepancyEditable = true;

  useEffect(() => {
    if (currentPage > totalPages - 1) {
      setCurrentPage(Math.max(totalPages - 1, 0));
    }
  }, [currentPage, totalPages]);

  // Synchronise fuel/oil servicing arrays with legs count
  useEffect(() => {
    const legCount = formData.legs.length;
    if (formData.fuelServicing.length !== legCount) {
      const newFuelServicing = [];
      for (let i = 0; i < legCount; i++) {
        newFuelServicing.push(
          formData.fuelServicing[i] || {
            date: "",
            contCheck: "",
            mainRemG: "",
            mainAdd: "",
            mainTotal: "",
            fuelType: "drum",
            refuelerName: "",
            signature: "",
          },
        );
      }
      setFormData((prev) => ({ ...prev, fuelServicing: newFuelServicing }));
    }

    if (formData.oilServicing.length !== legCount) {
      const newOilServicing = [];
      for (let i = 0; i < legCount; i++) {
        newOilServicing.push(
          formData.oilServicing[i] || {
            date: "",
            engineRem: "",
            engineAdd: "",
            engineTot: "",
            mrGboxRem: "",
            mrGboxAdd: "",
            mrGboxTot: "",
            trGboxRem: "",
            trGboxAdd: "",
            trGboxTot: "",
            remarks: "",
            signature: "",
          },
        );
      }
      setFormData((prev) => ({ ...prev, oilServicing: newOilServicing }));
    }
  }, [formData.legs.length]);

  // Reset form when modal closes
  useEffect(() => {
    if (!visible) {
      setCurrentPage(0);
      scrollViewRef.current?.scrollTo({ y: 0, animated: false });
      setFormData({
        aircraftType: "",
        rpc: "",
        date: new Date(),
        controlNo: "",
        legs: [
          {
            stations: [{ from: "", to: "" }],
            blockTimeOn: "",
            blockTimeOff: "",
            flightTimeOn: "",
            flightTimeOff: "",
            totalTimeOn: "",
            totalTimeOff: "",
            date: "",
            passengers: "",
          },
        ],
        remarks: "",
        sling: "",
        fuelServicing: [],
        oilServicing: [],
        workItems: [],
        createdBy: userRole,
        status: "pending_release",
        notifiedForCompletion: false,
        broughtForwardLocked: false,
        releasedBy: { name: "", signature: "", timestamp: "" },
        acceptedBy: { name: "", signature: "", timestamp: "" },
      });
      setComponentData({
        broughtForwardData: {
          airframe: "",
          gearBoxMain: "",
          gearBoxTail: "",
          rotorMain: "",
          rotorTail: "",
          airframeNextInsp: "",
          engine: "",
          cycleN1: "",
          cycleN2: "",
          usage: "",
          landingCycle: "",
          engineNextInsp: "",
        },
        thisFlightData: {
          airframe: "",
          gearBoxMain: "",
          gearBoxTail: "",
          rotorMain: "",
          rotorTail: "",
          airframeNextInsp: "",
          engine: "",
          cycleN1: "",
          cycleN2: "",
          usage: "",
          landingCycle: "",
          engineNextInsp: "",
        },
        toDateData: {
          airframe: "",
          gearBoxMain: "",
          gearBoxTail: "",
          rotorMain: "",
          rotorTail: "",
          airframeNextInsp: "",
          engine: "",
          cycleN1: "",
          cycleN2: "",
          usage: "",
          landingCycle: "",
          engineNextInsp: "",
        },
      });
      setLoadedAircraftData(null);
    }
  }, [visible]);

  // Scroll to top on page change
  useEffect(() => {
    scrollViewRef.current?.scrollTo({ y: 0, animated: false });
  }, [currentPage]);

  const updateForm = (field, value) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const updateLeg = (updatedLegData) => {
    setFormData(updatedLegData);
  };

  const updateFuelServicing = (legIndex, data) => {
    const newFuelServicing = [...formData.fuelServicing];
    newFuelServicing[legIndex] = data;
    setFormData((prev) => ({ ...prev, fuelServicing: newFuelServicing }));
  };

  const updateOilServicing = (legIndex, data) => {
    const newOilServicing = [...formData.oilServicing];
    newOilServicing[legIndex] = data;
    setFormData((prev) => ({ ...prev, oilServicing: newOilServicing }));
  };

  const updateComponent = (section, field, value) => {
    setComponentData((prev) => ({
      ...prev,
      [section]: { ...prev[section], [field]: value },
    }));
  };

  const updateWorkItems = (workItems) => {
    setFormData((prev) => ({ ...prev, workItems }));
  };

  const formatDateForSave = (date) => {
    return date.toLocaleDateString("en-US", {
      month: "2-digit",
      day: "2-digit",
      year: "numeric",
    });
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

  const buildFlightLogPayload = (nextFormData) => {
    // Ensure toDateData is up‑to‑date before saving
    const bf = componentData.broughtForwardData || {};
    const tf = componentData.thisFlightData || {};
    const finalToDateData = {
      airframe: (parseFloat(bf.airframe) || 0) + (parseFloat(tf.airframe) || 0),
      gearBoxMain:
        (parseFloat(bf.gearBoxMain) || 0) + (parseFloat(tf.gearBoxMain) || 0),
      gearBoxTail:
        (parseFloat(bf.gearBoxTail) || 0) + (parseFloat(tf.gearBoxTail) || 0),
      rotorMain:
        (parseFloat(bf.rotorMain) || 0) + (parseFloat(tf.rotorMain) || 0),
      rotorTail:
        (parseFloat(bf.rotorTail) || 0) + (parseFloat(tf.rotorTail) || 0),
      engine: (parseFloat(bf.engine) || 0) + (parseFloat(tf.engine) || 0),
      cycleN1: (parseFloat(bf.cycleN1) || 0) + (parseFloat(tf.cycleN1) || 0),
      cycleN2: (parseFloat(bf.cycleN2) || 0) + (parseFloat(tf.cycleN2) || 0),
      landingCycle:
        (parseFloat(bf.landingCycle) || 0) + (parseFloat(tf.landingCycle) || 0),
      usage: (parseFloat(bf.usage) || 0) + (parseFloat(tf.usage) || 0),
      airframeNextInsp: tf.airframeNextInsp || bf.airframeNextInsp,
      engineNextInsp: tf.engineNextInsp || bf.engineNextInsp,
    };

    const finalComponentData = {
      ...componentData,
      toDateData: finalToDateData,
    };

    const { _id, id, ...cleanFormData } = nextFormData;
    return {
      ...cleanFormData,
      componentData: finalComponentData,
      date: formatDateForSave(nextFormData.date),
      dateAdded: formatDateForSave(new Date()),
      status: nextFormData.status || "pending_release",
      createdBy: userRole,
    };
  };

  const handleRelease = async (signature) => {
    if (!formData.rpc || formData.rpc.trim() === "") {
      showToast("Aircraft RPC is required");
      return;
    }

    const updatedFormData = {
      ...formData,
      releasedBy: {
        name: "Mechanic",
        signature,
        timestamp: new Date().toISOString(),
      },
      status: "pending_acceptance",
    };

    setFormData(updatedFormData);
    setShowReleaseModal(false);
    await onSave(buildFlightLogPayload(updatedFormData), {
      closeOnSave: false,
      showToast: false,
    });
    setFeedbackAlert({
      visible: true,
      title: "Success",
      message: "Flight log has been released",
      closeOnFinish: true,
    });
  };

  const handleSave = () => {
    if (!formData.rpc || formData.rpc.trim() === "") {
      showToast("Aircraft RPC is required");
      return;
    }

    onSave(buildFlightLogPayload(formData));
  };

  const renderPage = () => {
    const currentTab = tabs[currentPage];

    switch (currentTab) {
      case "Basic Information":
        return (
          <FlightLogModalInfo
            formData={formData}
            updateForm={updateForm}
            isEditable={isBasicInfoEditable}
            onAircraftDataLoaded={handleAircraftDataLoaded}
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
            isEditable={isMechanicSectionEditable}
            isLocked={formData.broughtForwardLocked}
          />
        );

      case "This Flight":
        return (
          <FlightLogModalThisFlight
            componentData={componentData.thisFlightData}
            onUpdateComponent={(field, value) =>
              updateComponent("thisFlightData", field, value)
            }
            isEditable={isMechanicSectionEditable}
          />
        );

      case "To Date":
        return <FlightLogModalToDate componentData={toDateData} />;

      case "Fuel Servicing":
        return (
          <FlightLogModalFuelServicing
            legs={formData.legs}
            fuelServicingData={formData.fuelServicing}
            onUpdateFuelServicing={updateFuelServicing}
            isEditable={isMechanicSectionEditable}
          />
        );
      case "Oil Servicing":
        return (
          <FlightLogModalOilServicing
            legs={formData.legs}
            oilServicingData={formData.oilServicing}
            onUpdateOilServicing={updateOilServicing}
            isEditable={isMechanicSectionEditable}
          />
        );
      case "Discrepancy/Remarks":
        return (
          <FlightLogDiscrepancyRemarks
            remarks={formData.remarks}
            sling={formData.sling}
            onUpdateRemarks={(text) => updateForm("remarks", text)}
            onUpdateSling={(text) => updateForm("sling", text)}
            isEditable={isDiscrepancyEditable}
          />
        );
      case "Work Done":
        return (
          <FlightLogModalWorkDone
            workItems={formData.workItems}
            onUpdateWorkItems={updateWorkItems}
            isEditable={isWorkDoneEditable}
          />
        );
      default:
        return null;
    }
  };

  const showReleaseButton = isMechanic && formData.status === "pending_release";

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
                    fontSize: 12,
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
          contentContainerStyle={{ paddingTop: 16 }}
        >
          {renderPage()}

          {showReleaseButton && (
            <View style={{ marginTop: 20, marginBottom: 12 }}>
              <TouchableOpacity
                onPress={() => setShowReleaseModal(true)}
                style={{
                  backgroundColor: COLORS.primaryLight,
                  paddingVertical: 12,
                  borderRadius: 8,
                  alignItems: "center",
                }}
              >
                <Text
                  style={{
                    color: COLORS.white,
                    fontWeight: "600",
                    fontSize: 12,
                  }}
                >
                  Release
                </Text>
              </TouchableOpacity>
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
            <Text style={{ color: COLORS.grayDark, fontSize: 12 }}>
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
            onPress={currentPage === totalPages - 1 ? handleSave : handleNext}
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
              {currentPage === totalPages - 1 ? "Add" : "Next"}
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
