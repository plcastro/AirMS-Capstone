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
import PostInspectionModalInfo from "./PostInspectionModalInfo";
import PostInspectionModalStation1 from "./PostInspectionModalStation1";
import PostInspectionModalStation2 from "./PostInspectionModalStation2";
import PostInspectionModalEngine from "./PostInspectionModalEngine";
import PostInspectionModalMainRotor from "./PostInspectionModalMainRotor";
import PostInspectionModalCabinInterior from "./PostInspectionModalCabinInterior";

export default function PostInspectionEntry({
  visible,
  onClose,
  onSave,
  userRole,
}) {
  const [currentPage, setCurrentPage] = useState(0);
  const scrollViewRef = useRef(null);
  
  const tabs = ["Basic Information", "Station 1", "Station 2", "Engine", "Main Rotor", "Cabin Interior"];
  const totalPages = tabs.length;
  const isLastPage = currentPage === totalPages - 1;

  const [formData, setFormData] = useState({
    // Basic Info
    aircraftType: "",
    rpc: "",
    date: new Date().toLocaleDateString("en-US"),
    createdBy: userRole,
    // Station 1 items
    station1_transparentPanels_condition: false,
    station1_transparentPanels_clean: false,
    station1_doorsPillars_condition: false,
    station1_sideSlipIndicator_condition: false,
    station1_sideSlipIndicator2_condition: false,
    station1_mgbEngineOilCooler_condition: false,
    // Station 2 items
    station2_frontDoorJettison_condition: false,
    station2_leftCabinAccess_condition: false,
    station2_landingGear_condition: false,
    station2_staticPressure_condition: false,
    station2_oatProbe_condition: false,
    station2_antennas_condition: false,
    station2_lights_condition: false,
    station2_lowerCowlings_condition: false,
    station2_leftCargoDoorOpen_opening: false,
    station2_leftCargoDoorClosed_closed: false,
    station2_fuelTank_condition: false,
    station2_rearCargoDoorOpen_opening: false,
    station2_rearCargoBay_harness: false,
    station2_elt_condition: false,
    station2_rearCargoDoorClosed_closed: false,
    station2_mgbCowlings_opening: false,
    station2_upperCowling_security: false,
    station2_mgb_condition: false,
    station2_transmissionDeck_cleanliness: false,
    station2_mgbSupportBars_condition: false,
    station2_hydraulicSystem_condition: false,
    station2_servos_security: false,
    station2_coolingFan_condition: false,
    station2_gimbalRing_fitting: false,
    station2_electricalHarnesses_condition: false,
    station2_fuelShutoff_condition: false,
    station2_mgbCowlingLH_safety: false,
    // Engine and Engine Bay items
    engine_airInlet_condition: false,
    engine_firewall_condition: false,
    engine_accessories_condition: false,
    engine_transmissionDeck_condition: false,
    engine_case_condition: false,
    engine_oilFilter_condition: false,
    engine_fuelFilter_condition: false,
    engine_oilSystem_condition: false,
    engine_mounts_condition: false,
    engine_deckDrainHoles_condition: false,
    engine_exhaustPipe_condition: false,
    // Station 3 items (in Engine tab)
    station3_scissors_condition: false,
    station3_swashPlate_condition: false,
    station3_pitchChangeRods_condition: false,
    station3_rotorShaft_condition: false,
    // Main Rotor items
    mainRotor_head_condition: false,
    mainRotor_starflex_condition: false,
    mainRotor_starRecesses_condition: false,
    mainRotor_sphericalBearings_condition: false,
    mainRotor_ballJoints_condition: false,
    mainRotor_starArms_condition: false,
    mainRotor_vibrationAbsorber_condition: false,
    mainRotor_blades_condition: false,
    mainRotor_rightCargoDoor_opening: false,
    mainRotor_rightCargoDoor_closed: false,
    mainRotor_gpuPlug_condition: false,
    mainRotor_rhMgbCowling_opening: false,
    mainRotor_transmissionDeck_cleanliness: false,
    mainRotor_mgbSupportBars_condition: false,
    mainRotor_oilCooler_condition: false,
    mainRotor_servos_security: false,
    mainRotor_hydraulicSystem_condition: false,
    mainRotor_hydraulicTank_condition: false,
    mainRotor_engineOilTank_condition: false,
    mainRotor_electricalHarnesses_condition: false,
    mainRotor_gimbalRing_fitting: false,
    mainRotor_rhSideMgbCowling_closed: false,
    mainRotor_landingGear_condition: false,
    mainRotor_lowerFairings_closed: false,
    mainRotor_rhCabinAccess_condition: false,
    mainRotor_frontDoorJettison_condition: false,
    // Cabin Interior items
    cabin_general_cleanliness: false,
    cabin_seats_condition: false,
    cabin_doorJettison_checked: false,
    cabin_fireExtinguisher_condition: false,
    cabin_circuitBreakers_set: false,
    cabin_scu_position: false,
    cabin_batterySwitchOn_on: false,
    cabin_vemd_flightReport: false,
    cabin_vemd_flightTimes: false,
    cabin_vemd_cycles: false,
    cabin_vemd_advisoryMessages: false,
    cabin_vemd_recordData: false,
    cabin_batterySwitchOff_off: false,
  });

  useEffect(() => {
    if (visible) {
      setCurrentPage(0);
      setFormData({
        aircraftType: "",
        rpc: "",
        date: new Date().toLocaleDateString("en-US"),
        createdBy: userRole,
        station1_transparentPanels_condition: false,
        station1_transparentPanels_clean: false,
        station1_doorsPillars_condition: false,
        station1_sideSlipIndicator_condition: false,
        station1_sideSlipIndicator2_condition: false,
        station1_mgbEngineOilCooler_condition: false,
        station2_frontDoorJettison_condition: false,
        station2_leftCabinAccess_condition: false,
        station2_landingGear_condition: false,
        station2_staticPressure_condition: false,
        station2_oatProbe_condition: false,
        station2_antennas_condition: false,
        station2_lights_condition: false,
        station2_lowerCowlings_condition: false,
        station2_leftCargoDoorOpen_opening: false,
        station2_leftCargoDoorClosed_closed: false,
        station2_fuelTank_condition: false,
        station2_rearCargoDoorOpen_opening: false,
        station2_rearCargoBay_harness: false,
        station2_elt_condition: false,
        station2_rearCargoDoorClosed_closed: false,
        station2_mgbCowlings_opening: false,
        station2_upperCowling_security: false,
        station2_mgb_condition: false,
        station2_transmissionDeck_cleanliness: false,
        station2_mgbSupportBars_condition: false,
        station2_hydraulicSystem_condition: false,
        station2_servos_security: false,
        station2_coolingFan_condition: false,
        station2_gimbalRing_fitting: false,
        station2_electricalHarnesses_condition: false,
        station2_fuelShutoff_condition: false,
        station2_mgbCowlingLH_safety: false,
        engine_airInlet_condition: false,
        engine_firewall_condition: false,
        engine_accessories_condition: false,
        engine_transmissionDeck_condition: false,
        engine_case_condition: false,
        engine_oilFilter_condition: false,
        engine_fuelFilter_condition: false,
        engine_oilSystem_condition: false,
        engine_mounts_condition: false,
        engine_deckDrainHoles_condition: false,
        engine_exhaustPipe_condition: false,
        station3_scissors_condition: false,
        station3_swashPlate_condition: false,
        station3_pitchChangeRods_condition: false,
        station3_rotorShaft_condition: false,
        mainRotor_head_condition: false,
        mainRotor_starflex_condition: false,
        mainRotor_starRecesses_condition: false,
        mainRotor_sphericalBearings_condition: false,
        mainRotor_ballJoints_condition: false,
        mainRotor_starArms_condition: false,
        mainRotor_vibrationAbsorber_condition: false,
        mainRotor_blades_condition: false,
        mainRotor_rightCargoDoor_opening: false,
        mainRotor_rightCargoDoor_closed: false,
        mainRotor_gpuPlug_condition: false,
        mainRotor_rhMgbCowling_opening: false,
        mainRotor_transmissionDeck_cleanliness: false,
        mainRotor_mgbSupportBars_condition: false,
        mainRotor_oilCooler_condition: false,
        mainRotor_servos_security: false,
        mainRotor_hydraulicSystem_condition: false,
        mainRotor_hydraulicTank_condition: false,
        mainRotor_engineOilTank_condition: false,
        mainRotor_electricalHarnesses_condition: false,
        mainRotor_gimbalRing_fitting: false,
        mainRotor_rhSideMgbCowling_closed: false,
        mainRotor_landingGear_condition: false,
        mainRotor_lowerFairings_closed: false,
        mainRotor_rhCabinAccess_condition: false,
        mainRotor_frontDoorJettison_condition: false,
        cabin_general_cleanliness: false,
        cabin_seats_condition: false,
        cabin_doorJettison_checked: false,
        cabin_fireExtinguisher_condition: false,
        cabin_circuitBreakers_set: false,
        cabin_scu_position: false,
        cabin_batterySwitchOn_on: false,
        cabin_vemd_flightReport: false,
        cabin_vemd_flightTimes: false,
        cabin_vemd_cycles: false,
        cabin_vemd_advisoryMessages: false,
        cabin_vemd_recordData: false,
        cabin_batterySwitchOff_off: false,
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
          <PostInspectionModalInfo
            formData={formData}
            updateForm={updateForm}
            isEditable={true}
          />
        );
      case "Station 1":
        return (
          <PostInspectionModalStation1
            formData={formData}
            updateForm={updateForm}
            isEditable={true}
          />
        );
      case "Station 2":
        return (
          <PostInspectionModalStation2
            formData={formData}
            updateForm={updateForm}
            isEditable={true}
          />
        );
      case "Engine":
        return (
          <PostInspectionModalEngine
            formData={formData}
            updateForm={updateForm}
            isEditable={true}
          />
        );
      case "Main Rotor":
        return (
          <PostInspectionModalMainRotor
            formData={formData}
            updateForm={updateForm}
            isEditable={true}
          />
        );
      case "Cabin Interior":
        return (
          <PostInspectionModalCabinInterior
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
