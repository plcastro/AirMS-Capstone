import React, { useState, useEffect, useRef } from "react";
import {
  View,
  Text,
  Modal,
  TouchableOpacity,
  ScrollView,
  StatusBar,
  Alert,
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
import { API_BASE } from "../../utilities/API_BASE";

export default function FlightLogEntry({ visible, onClose, onSave, userRole }) {
  const [currentPage, setCurrentPage] = useState(0);
  const [loadedAircraftData, setLoadedAircraftData] = useState(null);
  const [showReleaseModal, setShowReleaseModal] = useState(false);
  const scrollViewRef = useRef(null);
  const isPilot = userRole === "pilot";
  const isMechanic = userRole === "mechanic" || userRole === "maintenance manager";

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

  // Auto-calculate toDateData whenever broughtForwardData or thisFlightData changes
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
    // Also sync to componentData.toDateData for saving
    setComponentData(prev => ({ ...prev, toDateData: calculated }));
  }, [componentData.broughtForwardData, componentData.thisFlightData]);

  // Populate broughtForwardData when aircraft data is loaded from the API
  useEffect(() => {
    console.log("loadedAircraftData changed:", loadedAircraftData);
    if (loadedAircraftData && loadedAircraftData.referenceData) {
      const { acftTT, n1Cycles, n2Cycles, landings } = loadedAircraftData.referenceData;
      setComponentData(prev => ({
        ...prev,
        broughtForwardData: {
          ...prev.broughtForwardData,
          airframe: acftTT || "",
          gearBoxMain: acftTT || "",
          gearBoxTail: acftTT || "",
          rotorMain: acftTT || "",
          rotorTail: acftTT || "",
          engine: acftTT || "",
          cycleN1: n1Cycles || "",
          cycleN2: n2Cycles || "",
          landingCycle: landings || "",
        },
      }));
    }
  }, [loadedAircraftData]);

  const hasDiscrepancy = () => {
    return formData.remarks && formData.remarks.trim() !== "";
  };

  const getPilotTabs = () => {
    return ["Basic Information", "Destination/s", "Discrepancy/Remarks"];
  };

  const getMechanicTabs = () => {
    let tabs = [
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
      tabs.push("Work Done");
    }
    return tabs;
  };

  const tabs = isPilot ? getPilotTabs() : getMechanicTabs();
  const totalPages = tabs.length;

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

  const handleRelease = (signature) => {
    setFormData((prev) => ({
      ...prev,
      releasedBy: {
        name: "Mechanic",
        signature,
        timestamp: new Date().toISOString(),
      },
      status: "pending_acceptance",
    }));
    Alert.alert("Success", "Flight log has been released");
    setShowReleaseModal(false);
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

  const handleSave = () => {
    if (!formData.rpc || formData.rpc.trim() === "") {
      Alert.alert("Validation Error", "Aircraft RPC is required");
      return;
    }

    // Ensure toDateData is up‑to‑date before saving
    const bf = componentData.broughtForwardData || {};
    const tf = componentData.thisFlightData || {};
    const finalToDateData = {
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
      toDateData: finalToDateData,
    };

    const { _id, id, ...cleanFormData } = formData;
    const flightLogData = {
      ...cleanFormData,
      componentData: finalComponentData,
      date: formatDateForSave(formData.date),
      dateAdded: formatDateForSave(new Date()),
      status: formData.status || "pending_release",
      createdBy: userRole,
    };

    onSave(flightLogData);
  };

  const renderPage = () => {
    const currentTab = tabs[currentPage];

    switch (currentTab) {
      case "Basic Information":
        return (
          <FlightLogModalInfo
            formData={formData}
            updateForm={updateForm}
            isEditable={true}
            onAircraftDataLoaded={handleAircraftDataLoaded}
          />
        );

      case "Destination/s":
        return (
          <FlightLogModalDestinations
            legData={formData}
            onUpdateLeg={updateLeg}
            isEditable={true}
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
            isEditable={true}
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
            isEditable={true}
          />
        );

      case "To Date":
        return (
          <FlightLogModalToDate
            componentData={toDateData}
          />
        );

      case "Fuel Servicing":
        return (
          <FlightLogModalFuelServicing
            legs={formData.legs}
            fuelServicingData={formData.fuelServicing}
            onUpdateFuelServicing={updateFuelServicing}
            isEditable={true}
          />
        );
      case "Oil Servicing":
        return (
          <FlightLogModalOilServicing
            legs={formData.legs}
            oilServicingData={formData.oilServicing}
            onUpdateOilServicing={updateOilServicing}
            isEditable={true}
          />
        );
      case "Discrepancy/Remarks":
        return (
          <FlightLogDiscrepancyRemarks
            remarks={formData.remarks}
            sling={formData.sling}
            onUpdateRemarks={(text) => updateForm("remarks", text)}
            onUpdateSling={(text) => updateForm("sling", text)}
            isEditable={true}
          />
        );
      case "Work Done":
        return (
          <FlightLogModalWorkDone
            workItems={formData.workItems}
            onUpdateWorkItems={updateWorkItems}
            isEditable={true}
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
                    fontSize: 16,
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
      </SafeAreaView>
    </Modal>
  );
}