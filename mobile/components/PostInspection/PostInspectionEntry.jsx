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
import PostInspectionModalInfo from "./PostInspectionModalInfo";
import PostInspectionModalStation1 from "./PostInspectionModalStation1";
import PostInspectionModalStation2 from "./PostInspectionModalStation2";
import PostInspectionModalEngine from "./PostInspectionModalEngine";
import PostInspectionModalMainRotor from "./PostInspectionModalMainRotor";
import PostInspectionModalCabinInterior from "./PostInspectionModalCabinInterior";
import PostInspectionModalNotes from "./PostInspectionModalNotes";
import { getDefaultPostInspectionFormData } from "./PostInspectionForms";
import { showToast } from "../../utilities/toast";

export default function PostInspectionEntry({
  visible,
  onClose,
  onSave,
  userRole,
  rpcOptions = [],
}) {
  const [currentPage, setCurrentPage] = useState(0);
  const scrollViewRef = useRef(null);

  const tabs = [
    "Basic Information",
    "Station 1",
    "Station 2",
    "Engine",
    "Main Rotor",
    "Cabin Interior",
    "Notes",
  ];
  const totalPages = tabs.length;
  const isLastPage = currentPage === totalPages - 1;

  const [formData, setFormData] = useState(
    getDefaultPostInspectionFormData(userRole),
  );

  useEffect(() => {
    if (visible) {
      setCurrentPage(0);
      setFormData(getDefaultPostInspectionFormData(userRole));
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
      showToast("Aircraft RPC is required");
      return;
    }
    if (!formData.aircraftType || formData.aircraftType.trim() === "") {
      showToast("Aircraft Type is required");
      return;
    }
    onSave(formData);
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
            rpcOptions={rpcOptions}
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
      case "Notes":
        return (
          <PostInspectionModalNotes
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
