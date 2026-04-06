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
import PreInspectionModalInfo from "./PreInspectionModalInfo";
import PreInspectionModalStations from "./PreInspectionModalStations";
import PreInspectionModalSling from "./PreInspectionModalSling";
import PreInspectionModalFloatsOnboard from "./PreInspectionModalFloatsOnboard";

export default function PreInspectionEntry({
  visible,
  onClose,
  onSave,
  userRole,
}) {
  const [currentPage, setCurrentPage] = useState(0);
  const scrollViewRef = useRef(null);
  
  const tabs = ["Basic Information", "Station 1 and 2", "Station 3 and Sling", "Floats and Onboard"];
  const totalPages = tabs.length;
  const isLastPage = currentPage === totalPages - 1;

  const [formData, setFormData] = useState({
    aircraftType: "",
    rpc: "",
    date: new Date().toLocaleDateString("en-US"),
    createdBy: userRole,
    station1_transparentPanels: false,
    station1_engineOilCooler: false,
    station1_sideSlipIndicator: false,
    station1_pitotTube: false,
    station1_landingLights: false,
    station1_mgbCowl: false,
    station1_lowerFairings: false,
    station1_landingGear: false,
    station1_staticPorts: false,
    station1_oatSensor: false,
    station1_mainRotor: false,
    station1_engineAirIntake: false,
    station1_engineCowl: false,
    station1_exhaustCover: false,
    station1_rearCargoDoorOpen: false,
    station1_loadsObjects: false,
    station1_elt: false,
    station1_rearCargoDoorClosed: false,
    station1_oilDrain: false,
    station2_frontDoor: false,
    station2_rearDoor: false,
    station2_leftCargoDoorOpen: false,
    station2_loadsObjects: false,
    station2_leftCargoDoorClosed: false,
    station2_fuelTank: false,
    station3_heatShield: false,
    station3_tailBoom: false,
    station3_stabilizer: false,
    station3_tailRotorGuard: false,
    station3_tgbFairing: false,
    station3_tgbOilLevel: false,
    station3_tailSkid: false,
    station3_flexibleCoupling: false,
    sling_sling: false,
    sling_cablePins: false,
    floats_lhRh: false,
    floats_cylinder: false,
    floats_hoses: false,
    onboard_firstAid: false,
    onboard_lifeVest: false,
    onboard_lifeRaft: false,
    onboard_axl: false,
    onboard_fireExt: false,
    onboard_certAirworthiness: false,
    onboard_certRegistration: false,
    onboard_radioLicense: false,
    onboard_flightLogbook: false,
    fob: "",
  });

  useEffect(() => {
    if (visible) {
      setCurrentPage(0);
      setFormData({
        aircraftType: "",
        rpc: "",
        date: new Date().toLocaleDateString("en-US"),
        createdBy: userRole,
        station1_transparentPanels: false,
        station1_engineOilCooler: false,
        station1_sideSlipIndicator: false,
        station1_pitotTube: false,
        station1_landingLights: false,
        station1_mgbCowl: false,
        station1_lowerFairings: false,
        station1_landingGear: false,
        station1_staticPorts: false,
        station1_oatSensor: false,
        station1_mainRotor: false,
        station1_engineAirIntake: false,
        station1_engineCowl: false,
        station1_exhaustCover: false,
        station1_rearCargoDoorOpen: false,
        station1_loadsObjects: false,
        station1_elt: false,
        station1_rearCargoDoorClosed: false,
        station1_oilDrain: false,
        station2_frontDoor: false,
        station2_rearDoor: false,
        station2_leftCargoDoorOpen: false,
        station2_loadsObjects: false,
        station2_leftCargoDoorClosed: false,
        station2_fuelTank: false,
        station3_heatShield: false,
        station3_tailBoom: false,
        station3_stabilizer: false,
        station3_tailRotorGuard: false,
        station3_tgbFairing: false,
        station3_tgbOilLevel: false,
        station3_tailSkid: false,
        station3_flexibleCoupling: false,
        sling_sling: false,
        sling_cablePins: false,
        floats_lhRh: false,
        floats_cylinder: false,
        floats_hoses: false,
        onboard_firstAid: false,
        onboard_lifeVest: false,
        onboard_lifeRaft: false,
        onboard_axl: false,
        onboard_fireExt: false,
        onboard_certAirworthiness: false,
        onboard_certRegistration: false,
        onboard_radioLicense: false,
        onboard_flightLogbook: false,
        fob: "",
      });
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

  const updateForm = (field, value) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const handleSave = () => {
    if (!formData.rpc || formData.rpc.trim() === "") {
      Alert.alert("Validation Error", "Aircraft RPC is required");
      return;
    }
    if (!formData.aircraftType || formData.aircraftType.trim() === "") {
      Alert.alert("Validation Error", "Aircraft Type is required");
      return;
    }
    onSave(formData);
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

  const renderPage = () => {
    const currentTab = tabs[currentPage];

    switch (currentTab) {
      case "Basic Information":
        return (
          <PreInspectionModalInfo
            formData={formData}
            updateForm={updateForm}
            isEditable={true}
          />
        );
      case "Station 1 and 2":
        return (
          <PreInspectionModalStations
            formData={formData}
            updateForm={updateForm}
            isEditable={true}
          />
        );
      case "Station 3 and Sling":
        return (
          <PreInspectionModalSling
            formData={formData}
            updateForm={updateForm}
            isEditable={true}
          />
        );
      case "Floats and Onboard":
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
              {isLastPage ? "Add" : "Next"}
            </Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    </Modal>
  );
}