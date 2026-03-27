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
import FlightLogModalComponentTimes from "./FlightLogModalComponentTimes";
import FlightLogModalFuelServicing from "./FlightLogModalFuelServicing";
import FlightLogModalOilServicing from "./FlightLogModalOilServicing";
import FlightLogDiscrepancyRemarks from "./FlightLogDiscrepancyRemarks";
import FlightLogModalWorkDone from "./FlightLogModalWorkDone";
import { API_BASE } from "../../utilities/API_BASE";

export default function FlightLogEntry({ visible, onClose, onSave, userRole }) {
  const [currentPage, setCurrentPage] = useState(0);
  const [isLoadingAircraftData, setIsLoadingAircraftData] = useState(false);
  const [loadedAircraftData, setLoadedAircraftData] = useState(null);
  const scrollViewRef = useRef(null);
  const isPilot = userRole === "pilot";
  const isMechanic =
    userRole === "engineer" || userRole === "maintenance manager";

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
    status: isPilot ? "pending_release" : "pending_acceptance",
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

  const hasDiscrepancy = () => {
    return formData.remarks && formData.remarks.trim() !== "";
  };

  const getPilotTabs = () => {
    return ["Basic Information", "Destination/s", "Discrepancy/Remarks"];
  };

  const getMechanicTabs = () => {
    let tabs = [
      "Basic Information",
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

  const tabs = isPilot ? getPilotTabs() : getMechanicTabs();
  const totalPages = tabs.length;

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

  useEffect(() => {
    if (!visible) {
      setCurrentPage(0);
      if (scrollViewRef.current) {
        scrollViewRef.current.scrollTo({ y: 0, animated: false });
      }
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
        status: isPilot ? "pending_release" : "pending_acceptance",
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

  const handleSave = () => {
    // 1. Keep the Validation
    if (!formData.rpc || formData.rpc.trim() === "") {
      Alert.alert("Validation Error", "Aircraft RPC is required");
      return;
    }

    // 2. Prepare the data object (No fetch here!)
    const { _id, id, ...cleanFormData } = formData;

    const flightLogData = {
      ...cleanFormData,
      componentData,
      date: formatDateForSave(formData.date),
      dateAdded: formatDateForSave(new Date()),
      status: isPilot ? "pending_release" : "pending_acceptance",
      createdBy: userRole,
    };

    // 3. Just call onSave and let the parent handle the API
    onSave(flightLogData);
    // onClose(); // You can call this here or in the parent
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

      case "Component Times":
        return (
          <FlightLogModalComponentTimes
            currentComponentPage={0}
            componentData={componentData.broughtForwardData}
            onUpdateComponent={(field, value) =>
              updateComponent("broughtForwardData", field, value)
            }
            isEditable={true}
            aircraftData={loadedAircraftData}
            isLocked={formData.broughtForwardLocked}
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
