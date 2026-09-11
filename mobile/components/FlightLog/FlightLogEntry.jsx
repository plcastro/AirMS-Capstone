import React, { useState, useEffect, useRef } from "react";
import AppText from "../common/AppText";
import {
  View,
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
import IosModalSafeAreaProvider from "../common/IosModalSafeAreaProvider";
import { showToast } from "../../utilities/toast";
import {
  calculateB412ToDate,
  createEmptyB412Data,
  createEmptyB412Leg,
  isB412Aircraft,
  mapAircraftReferenceToB412,
  mapAircraftReferenceToBroughtForward,
  mapB412CarriedToStandardBroughtForward,
  syncB412DataFromStandardFlightLog,
} from "./b412FlightLogData";

const toTitleCase = (value = "") =>
  String(value || "")
    .replace(/[_-]+/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .replace(/\b\w/g, (char) => char.toUpperCase());

const getUserFullName = (user = {}) =>
  `${user?.firstName || ""} ${user?.lastName || ""}`.trim() ||
  user?.name ||
  user?.username ||
  "";

const buildSignatureUser = (user = {}, signature, fallbackTitle = "") => {
  const title =
    user?.jobTitle || user?.access || toTitleCase(fallbackTitle) || "User";
  const licenseNo =
    user?.licenseNo ||
    user?.licenseNumber ||
    user?.license ||
    user?.certificateNo ||
    "";

  return {
    name: getUserFullName(user) || title,
    title,
    id: licenseNo,
    licenseNo,
    userId: user?.id || user?._id || "",
    signature,
    timestamp: new Date().toISOString(),
  };
};

export default function FlightLogEntry({
  visible,
  onClose,
  onSave,
  userRole,
  currentUser,
}) {
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
  const tabScrollViewRef = useRef(null);
  const normalizedRole = String(userRole || "")
    .trim()
    .toLowerCase()
    .replace(/[\s-]+/g, " ");
  const isPilot = normalizedRole === "pilot";
  const isMechanic =
    [
      "mechanic",
      "engineer",
      "maintenance manager",
      "head of maintenance",
      "admin",
      "superadmin",
    ].includes(normalizedRole);

  const handleAircraftDataLoaded = (data) => {
    setLoadedAircraftData(data);

    if (!data) {
      setCurrentPage(0);
      setFormData((prev) => {
        const { b412Data, ...commonData } = prev;
        return {
          ...commonData,
          legs: [createEmptyB412Leg()],
          remarks: "",
          sling: "",
          fuelServicing: [],
          oilServicing: [],
          workItems: [],
          serialNumber: "",
        };
      });
      setComponentData({
        broughtForwardData: getEmptyComponentValues(),
        thisFlightData: getEmptyComponentValues(),
        toDateData: getEmptyComponentValues(),
      });
      return;
    }

    const serialNumber =
      data.serialNumber ||
      data.serialNo ||
      data.serial ||
      data.aircraftSerialNumber ||
      data.referenceData?.serialNumber ||
      "";
    const isB412 = isB412Aircraft(data.aircraftType);
    const carriedB412 = isB412 ? mapAircraftReferenceToB412(data) : null;

    setFormData((prev) => {
      const { b412Data, ...commonData } = prev;
      return {
        ...commonData,
        serialNumber,
        ...(isB412
          ? {
              b412Data: createEmptyB412Data({
                ...b412Data,
                serialNumber: serialNumber || b412Data?.serialNumber,
                componentData: {
                  ...(b412Data?.componentData || {}),
                  broughtForwardData: carriedB412.broughtForwardData,
                  airframeNextInspectionDueAt:
                    carriedB412.airframeNextInspectionDueAt,
                  engineNextInspectionDueAt:
                    carriedB412.engineNextInspectionDueAt,
                },
              }),
            }
          : {}),
      };
    });
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
    serialNumber: "",
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

  const isAircraftSelected = Boolean(
    String(formData.rpc || "").trim() &&
      String(formData.aircraftType || "").trim(),
  );
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

  // Parts Lifespan Monitoring is the source of truth for a new log's totals.
  useEffect(() => {
    if (!loadedAircraftData || !formData.rpc) {
      return;
    }

    const broughtForwardData = isB412Aircraft(
      loadedAircraftData.aircraftType || formData.aircraftType,
    )
      ? mapB412CarriedToStandardBroughtForward(
          mapAircraftReferenceToB412(loadedAircraftData),
        )
      : mapAircraftReferenceToBroughtForward(loadedAircraftData);

    setComponentData((prev) => ({
      ...prev,
      broughtForwardData: {
        ...getEmptyComponentValues(),
        ...broughtForwardData,
      },
    }));
  }, [loadedAircraftData, formData.aircraftType, formData.rpc]);

  const hasDiscrepancy = Boolean(String(formData.remarks || "").trim());
  const hasWorkItems =
    Array.isArray(formData.workItems) && formData.workItems.length > 0;
  const shouldShowWorkDone =
    hasWorkItems || (hasDiscrepancy && isMechanic);

  const getFlightLogTabs = () => {
    if (!isAircraftSelected) {
      return ["Basic Information"];
    }

    if (isPilot) {
      return [
        "Basic Information",
        "Destination/s",
        "Discrepancy/Remarks",
      ];
    }

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

    if (shouldShowWorkDone) {
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

  useEffect(() => {
    if (shouldShowWorkDone) {
      tabScrollViewRef.current?.scrollToEnd({ animated: true });
    }
  }, [shouldShowWorkDone]);

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
        serialNumber: "",
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

    const { _id, id, b412Data: sourceB412Data, ...cleanFormData } = nextFormData;
    const shouldIncludeB412Data = isB412Aircraft(nextFormData.aircraftType);
    const normalizedB412Data = shouldIncludeB412Data
      ? syncB412DataFromStandardFlightLog(
          { ...nextFormData, componentData: finalComponentData },
          sourceB412Data,
        )
      : null;

    if (normalizedB412Data) {
      normalizedB412Data.componentData.toDateData = calculateB412ToDate(
        normalizedB412Data.componentData.broughtForwardData,
        normalizedB412Data.componentData.thisFlightData,
      );
    }

    return {
      ...cleanFormData,
      ...(normalizedB412Data ? { b412Data: normalizedB412Data } : {}),
      componentData: finalComponentData,
      date: formatDateForSave(nextFormData.date),
      dateAdded: formatDateForSave(new Date()),
      status: nextFormData.status || "pending_release",
      createdBy: userRole,
    };
  };

  const handleRelease = async (signature) => {
    if (!isAircraftSelected) {
      showToast("Select an aircraft and wait for its type to load");
      return false;
    }

    const updatedFormData = {
      ...formData,
      releasedBy: buildSignatureUser(currentUser, signature, userRole),
      status: "pending_acceptance",
      broughtForwardLocked: formData.broughtForwardLocked,
    };

    const saved = onSave
      ? await onSave(buildFlightLogPayload(updatedFormData), {
          closeOnSave: false,
          showToast: false,
        })
      : false;

    if (!saved) {
      return false;
    }

    setShowReleaseModal(false);
    setFormData(updatedFormData);
    setFeedbackAlert({
      visible: true,
      title: "Success",
      message: "Flight log has been released",
      closeOnFinish: true,
    });
    return true;
  };

  const handleSave = () => {
    if (!isAircraftSelected) {
      showToast("Select an aircraft and wait for its type to load");
      return;
    }

    const isLegComplete = (leg) => {
      const date = leg?.date;
      const hasValidDate =
        Boolean(date) && !Number.isNaN(new Date(date).getTime());
      const hasCompleteRoute =
        Array.isArray(leg?.stations) &&
        leg.stations.length > 0 &&
        leg.stations.every(
          (station) =>
            String(station?.from || "").trim() &&
            String(station?.to || "").trim(),
        );
      return hasValidDate && hasCompleteRoute;
    };

    const pilotLegs = Array.isArray(formData.legs) ? formData.legs : [];

    if (
      isPilot &&
      (pilotLegs.length === 0 || !pilotLegs.every(isLegComplete))
    ) {
      showToast("Each leg must include complete station route and date");
      setCurrentPage(tabs.indexOf("Destination/s"));
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
            isActive={visible}
            onAircraftDataLoaded={handleAircraftDataLoaded}
            isB412={isB412Aircraft(formData.aircraftType)}
          />
        );

      case "Destination/s":
        return (
          <FlightLogModalDestinations
            legData={formData}
            onUpdateLeg={updateLeg}
            isEditable={isDestinationsEditable}
            userRole={userRole}
            maxLegs={isB412Aircraft(formData.aircraftType) ? 6 : undefined}
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

  const showReleaseButton =
    isAircraftSelected &&
    isMechanic &&
    formData.status === "pending_release";

  return (
    <Modal visible={visible} animationType="fade" onRequestClose={onClose}>
      <IosModalSafeAreaProvider>
        <SafeAreaView style={{ flex: 1, backgroundColor: "#F9F9F9" }}>
        <StatusBar barStyle="dark-content" backgroundColor="#F9F9F9" />
        <View style={{ backgroundColor: "#F9F9F9", paddingTop: 16 }}>
          {/* HEADER ROW */}
          <View
            style={{
              flexDirection: "row",
              alignItems: "center",
              justifyContent: "space-between",
              paddingHorizontal: 16,
              marginBottom: 12,
            }}
          >
            <View>
              <AppText style={{ fontSize: 16, fontWeight: "700", color: COLORS.black }}>
                New Entry - Flight Log
              </AppText>
              <AppText style={{ fontSize: 12, fontWeight: "600", color: COLORS.grayDark }}>
                Select Section
              </AppText>
            </View>

            <TouchableOpacity
              onPress={onClose}
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            >
              <MaterialCommunityIcons
                name="close"
                size={24}
                color={COLORS.grayDark}
              />
            </TouchableOpacity>
          </View>

          {/* TABS */}
          <ScrollView
            ref={tabScrollViewRef}
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={{
              paddingHorizontal: 16,
              gap: 12,
              paddingBottom: 12,
            }}
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
                <AppText
                  style={{
                    fontSize: 12,
                    fontWeight: "500",
                    color:
                      currentPage === index ? COLORS.white : COLORS.grayDark,
                  }}
                >
                  {tab}
                </AppText>
              </TouchableOpacity>
            ))}
          </ScrollView>

          {/* DIVIDER */}
          <View
            style={{
              height: 1,
              backgroundColor: COLORS.grayMedium,
            }}
          />
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
                <AppText
                  style={{
                    color: COLORS.white,
                    fontWeight: "600",
                    fontSize: 12,
                  }}
                >
                  Release
                </AppText>
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
            <AppText style={{ color: COLORS.grayDark, fontSize: 12 }}>
              Previous
            </AppText>
          </TouchableOpacity>

          <View
            style={{
              backgroundColor: COLORS.primaryLight,
              paddingVertical: 8,
              paddingHorizontal: 14,
              borderRadius: 4,
            }}
          >
            <AppText
              style={{ color: COLORS.white, fontWeight: "600", fontSize: 14 }}
            >
              {currentPage + 1}
            </AppText>
          </View>

          <TouchableOpacity
            onPress={
              !isAircraftSelected
                ? undefined
                : currentPage === totalPages - 1
                  ? handleSave
                  : handleNext
            }
            disabled={!isAircraftSelected}
            style={{
              paddingVertical: 8,
              paddingHorizontal: 24,
              borderRadius: 4,
              backgroundColor: COLORS.primaryLight,
              opacity: isAircraftSelected ? 1 : 0.5,
            }}
          >
            <AppText
              style={{ color: COLORS.white, fontSize: 14, fontWeight: "600" }}
            >
              {!isAircraftSelected
                ? "Select Aircraft"
                : currentPage === totalPages - 1
                  ? "Add"
                  : "Next"}
            </AppText>
          </TouchableOpacity>
        </View>

        <FlightLogSignatureModal
          visible={showReleaseModal}
          title="Release Signature"
          onClose={() => setShowReleaseModal(false)}
          onSave={handleRelease}
          aircraftRPC={formData.rpc}
          useNativeModal={false}
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
      </IosModalSafeAreaProvider>
    </Modal>
  );
}
