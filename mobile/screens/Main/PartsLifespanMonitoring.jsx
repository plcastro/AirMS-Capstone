import React, { useCallback, useContext, useEffect, useMemo, useState } from "react";
import { Text, TextInput, TouchableOpacity, View } from "react-native";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { Picker } from "@react-native-picker/picker";
import { API_BASE } from "../../utilities/API_BASE";
import { AuthContext } from "../../Context/AuthContext";
import { showToast } from "../../utilities/toast";
import {
  EmptyState,
  FieldRow,
  InfoCard,
  LoadingState,
  ModuleContainer,
  SearchBar,
  SectionTitle,
  StatusChip,
  moduleStyles,
} from "../../components/common/MobileModule";
import { COLORS } from "../../stylesheets/colors";

const referenceFields = [
  ["engTT", "Engine Cycle"],
  ["today", "Date"],
  ["n1Cycles", "N1"],
  ["n2Cycles", "N2"],
  ["acftTT", "Acft. TT"],
  ["landings", "Landings"],
];

const COMPONENT_DISPLAY_LIMIT = 10;

const normalizeRef = (referenceData = {}) => ({
  today: referenceData.today
    ? new Date(referenceData.today).toISOString().slice(0, 10)
    : new Date().toISOString().slice(0, 10),
  acftTT: referenceData.acftTT ?? 0,
  engTT: referenceData.engTT ?? referenceData.acftTT ?? 0,
  n1Cycles: referenceData.n1Cycles ?? 0,
  n2Cycles: referenceData.n2Cycles ?? 0,
  landings: referenceData.landings ?? 0,
  referenceCells: referenceData.referenceCells || {},
});

const normalizeDateText = (value) => {
  if (!value) return "";
  const date = value instanceof Date ? value : new Date(value);
  if (!Number.isNaN(date.getTime())) {
    return date.toISOString().slice(0, 10);
  }
  return String(value);
};

const getPartStatus = (part = {}) => {
  const dueText = String(part.due || "").toLowerCase();
  const days = Number(part.daysRemaining);
  const hours = Number(part.timeRemaining);
  if (dueText.includes("due") || days <= 0 || hours <= 0) {
    return { label: "Due", color: "#cf1322" };
  }
  if (
    (Number.isFinite(days) && days <= 30) ||
    (Number.isFinite(hours) && hours <= 30)
  ) {
    return { label: "Due Soon", color: "#d46b08" };
  }
  return { label: "OK", color: COLORS.primaryLight };
};

export default function PartsLifespanMonitoring() {
  const { user } = useContext(AuthContext);
  const isOfficerInCharge =
    user?.jobTitle?.toLowerCase() === "officer-in-charge";
  const [aircraftOptions, setAircraftOptions] = useState([]);
  const [selectedAircraft, setSelectedAircraft] = useState("");
  const [search, setSearch] = useState("");
  const [loadingAircraft, setLoadingAircraft] = useState(false);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [parts, setParts] = useState([]);
  const [refs, setRefs] = useState(normalizeRef());
  const [aircraftDetails, setAircraftDetails] = useState({});
  const [componentPage, setComponentPage] = useState(0);

  const fetchAircraftList = useCallback(async () => {
    try {
      setLoadingAircraft(true);
      const response = await fetch(`${API_BASE}/api/parts-monitoring/aircraft-list`);
      const result = await response.json();
      setAircraftOptions(response.ok && result.success ? result.data || [] : []);
    } catch (error) {
      console.error("Aircraft list load failed:", error);
      setAircraftOptions([]);
    } finally {
      setLoadingAircraft(false);
    }
  }, []);

  useEffect(() => {
    fetchAircraftList();
  }, [fetchAircraftList]);

  const loadAircraftData = useCallback(async (aircraft) => {
    if (!aircraft) {
      setParts([]);
      setAircraftDetails({});
      return;
    }

    try {
      setLoading(true);
      const response = await fetch(
        `${API_BASE}/api/parts-monitoring/${encodeURIComponent(aircraft)}`,
      );
      const result = await response.json();

      if (!response.ok || !result.success || !result.data) {
        throw new Error(result.message || "No saved data found for this aircraft");
      }

      const data = result.data;
      setRefs(normalizeRef(data.referenceData));
      setParts(Array.isArray(data.parts) ? data.parts : []);
      setAircraftDetails({
        dateManufactured: data.dateManufactured,
        aircraftType: data.aircraftType,
        creepDamage: data.creepDamage,
        serialNumber: data.serialNumber,
      });
    } catch (error) {
      console.error("Parts lifespan load failed:", error);
      setParts([]);
      setAircraftDetails({});
      showToast(error.message || "Failed to load aircraft data.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadAircraftData(selectedAircraft);
  }, [loadAircraftData, selectedAircraft]);

  const filteredParts = useMemo(() => {
    const needle = search.trim().toLowerCase();
    const cleanParts = parts.filter((part) => part.rowType !== "header");
    if (!needle) return cleanParts;
    return cleanParts.filter((part) =>
      [
        part.componentName,
        part.due,
        part.hd,
        part.dateDue,
        part.timeRemaining,
        part.daysRemaining,
      ]
        .filter(Boolean)
        .some((value) => String(value).toLowerCase().includes(needle)),
    );
  }, [parts, search]);

  const summary = useMemo(
    () =>
      filteredParts.reduce(
        (totals, part) => {
          const status = getPartStatus(part).label;
          totals.total += 1;
          if (status === "Due") totals.due += 1;
          if (status === "Due Soon") totals.dueSoon += 1;
          return totals;
        },
        { total: 0, due: 0, dueSoon: 0 },
      ),
    [filteredParts],
  );
  const visibleParts = useMemo(
    () =>
      filteredParts.slice(
        componentPage * COMPONENT_DISPLAY_LIMIT,
        (componentPage + 1) * COMPONENT_DISPLAY_LIMIT,
      ),
    [componentPage, filteredParts],
  );
  const totalComponentPages = Math.max(
    1,
    Math.ceil(filteredParts.length / COMPONENT_DISPLAY_LIMIT),
  );

  useEffect(() => {
    setComponentPage(0);
  }, [search, selectedAircraft]);

  const saveToDatabase = async () => {
    if (!selectedAircraft) {
      showToast("Select an aircraft before saving.");
      return;
    }

    try {
      setSaving(true);
      const response = await fetch(`${API_BASE}/api/parts-monitoring/save`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          aircraft: selectedAircraft,
          dateManufactured: aircraftDetails.dateManufactured || null,
          aircraftType: aircraftDetails.aircraftType || "",
          creepDamage: aircraftDetails.creepDamage || "",
          referenceData: {
            ...refs,
            today: new Date(refs.today),
          },
          parts,
          updatedBy: user
            ? `${user.firstName || ""} ${user.lastName || ""}`.trim()
            : "mobile user",
        }),
      });
      const result = await response.json();
      if (!response.ok || !result.success) {
        throw new Error(result.message || "Failed to save data");
      }
      showToast("Parts lifespan data saved.");
    } catch (error) {
      console.error("Parts lifespan save failed:", error);
      showToast(error.message || "Failed to save data.");
    } finally {
      setSaving(false);
    }
  };

  const updateAircraftDetail = (field, value) => {
    setAircraftDetails((current) => ({ ...current, [field]: value }));
  };

  const updatePartField = (partIndex, field, value) => {
    setParts((currentParts) =>
      currentParts.map((part) =>
        part.rowType !== "header" && part._id === partIndex
          ? { ...part, [field]: value }
          : part,
      ),
    );
  };

  const renderEditableDate = ({ label, value, onChangeText }) => (
    <View style={{ width: "48%", marginBottom: 8 }}>
      <Text style={moduleStyles.label}>{label}</Text>
      <TextInput
        value={value || ""}
        editable={!isOfficerInCharge}
        placeholder="YYYY-MM-DD"
        placeholderTextColor={COLORS.grayDark}
        onChangeText={onChangeText}
        style={{
          borderWidth: 1,
          borderColor: COLORS.grayMedium,
          borderRadius: 8,
          paddingHorizontal: 10,
          paddingVertical: 8,
          marginTop: 5,
          backgroundColor: isOfficerInCharge ? COLORS.grayLight : COLORS.white,
          color: COLORS.black,
        }}
      />
    </View>
  );

  return (
    <ModuleContainer>
      <InfoCard title="Parts Lifespan Monitoring" subtitle="Aircraft component status">
        <View
          style={{
            borderWidth: 1,
            borderColor: COLORS.grayMedium,
            borderRadius: 8,
            marginTop: 10,
            overflow: "hidden",
          }}
        >
          <Picker
            selectedValue={selectedAircraft}
            onValueChange={setSelectedAircraft}
            enabled={!loadingAircraft}
          >
            <Picker.Item label="Select aircraft" value="" />
            {aircraftOptions.map((aircraft) => (
              <Picker.Item label={aircraft} value={aircraft} key={aircraft} />
            ))}
          </Picker>
        </View>
      </InfoCard>

      <SearchBar value={search} onChangeText={setSearch} placeholder="Search components" />

      {!!selectedAircraft && (
        <InfoCard title={selectedAircraft} subtitle={aircraftDetails.aircraftType || "Aircraft details"}>
          <View style={{ flexDirection: "row", flexWrap: "wrap" }}>
            {renderEditableDate({
              label: "Date Manufactured",
              value: normalizeDateText(aircraftDetails.dateManufactured),
              onChangeText: (value) =>
                updateAircraftDetail("dateManufactured", value),
            })}
            <FieldRow label="Serial Number" value={aircraftDetails.serialNumber} />
            <FieldRow label="Creep Damage" value={aircraftDetails.creepDamage ? `${aircraftDetails.creepDamage}%` : "N/A"} />
            <FieldRow label="Tracked Components" value={summary.total} />
            <FieldRow label="Due" value={summary.due} />
            <FieldRow label="Due Soon" value={summary.dueSoon} />
          </View>
        </InfoCard>
      )}

      {!!selectedAircraft && (
        <InfoCard title="Reference Values" subtitle="Used by web formulas and saved workbook data">
          <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
            {referenceFields.map(([key, label]) => (
              <View key={key} style={{ width: "48%" }}>
                <Text style={moduleStyles.label}>{label}</Text>
                <TextInput
                  value={String(refs[key] ?? "")}
                  editable={!isOfficerInCharge}
                  keyboardType={key === "today" ? "default" : "numeric"}
                  onChangeText={(value) =>
                    setRefs((current) => ({ ...current, [key]: value }))
                  }
                  style={{
                    borderWidth: 1,
                    borderColor: COLORS.grayMedium,
                    borderRadius: 8,
                    paddingHorizontal: 10,
                    paddingVertical: 8,
                    marginTop: 5,
                    backgroundColor: isOfficerInCharge ? COLORS.grayLight : COLORS.white,
                  }}
                />
              </View>
            ))}
          </View>
          {!isOfficerInCharge && (
            <TouchableOpacity
              style={[moduleStyles.button, { marginTop: 12 }]}
              onPress={saveToDatabase}
              disabled={saving}
            >
              <MaterialCommunityIcons name="content-save" size={18} color={COLORS.white} />
              <Text style={[moduleStyles.buttonText, { marginLeft: 6 }]}>
                {saving ? "Saving..." : "Save to Database"}
              </Text>
            </TouchableOpacity>
          )}
        </InfoCard>
      )}

      <SectionTitle
        title="Components"
        subtitle={
          selectedAircraft
            ? `Showing ${
                filteredParts.length === 0
                  ? 0
                  : componentPage * COMPONENT_DISPLAY_LIMIT + 1
              }-${Math.min(
                (componentPage + 1) * COMPONENT_DISPLAY_LIMIT,
                filteredParts.length,
              )} of ${filteredParts.length} component row(s)`
            : ""
        }
      />
      {loading && <LoadingState />}
      {!loading && !selectedAircraft && <EmptyState text="Select an aircraft to view components." />}
      {!loading && selectedAircraft && filteredParts.length === 0 && (
        <EmptyState text="No component rows found." />
      )}
      {visibleParts.map((part, index) => {
        const status = getPartStatus(part);
        return (
          <InfoCard
            key={part._id || `${part.componentName}-${index}`}
            title={part.componentName || "Unnamed component"}
            subtitle={part.hd || "Component interval"}
            right={<StatusChip label={status.label} color={status.color} />}
          >
            <View style={{ flexDirection: "row", flexWrap: "wrap" }}>
              <FieldRow label="Days Remaining" value={part.daysRemaining} />
              <FieldRow label="Time Remaining" value={part.timeRemaining} />
              {renderEditableDate({
                label: "Date C/W",
                value: part.dateCW || "",
                onChangeText: (value) => updatePartField(part._id, "dateCW", value),
              })}
              {renderEditableDate({
                label: "Date Due",
                value: part.dateDue || "",
                onChangeText: (value) => updatePartField(part._id, "dateDue", value),
              })}
              <FieldRow label="TT/CYC Due" value={part.ttCycleDue} />
              <FieldRow label="HRS C/W" value={part.hoursCW} />
              <FieldRow label="Total Time Since New" value={part.totalTimeSinceNew} />
            </View>
          </InfoCard>
        );
      })}
      {selectedAircraft && filteredParts.length > COMPONENT_DISPLAY_LIMIT && (
        <View style={{ flexDirection: "row", gap: 8, marginBottom: 10 }}>
          <TouchableOpacity
            style={[
              moduleStyles.button,
              {
                flex: 1,
                backgroundColor:
                  componentPage === 0 ? COLORS.grayMedium : COLORS.primary,
              },
            ]}
            disabled={componentPage === 0}
            onPress={() => setComponentPage((page) => Math.max(0, page - 1))}
          >
            <MaterialCommunityIcons
              name="chevron-left"
              size={18}
              color={COLORS.white}
            />
            <Text style={[moduleStyles.buttonText, { marginLeft: 4 }]}>
              Previous
            </Text>
          </TouchableOpacity>
          <View
            style={[
              moduleStyles.card,
              {
                marginBottom: 0,
                alignItems: "center",
                justifyContent: "center",
                minWidth: 74,
                padding: 8,
              },
            ]}
          >
            <Text style={{ color: COLORS.primary, fontWeight: "800" }}>
              {componentPage + 1}/{totalComponentPages}
            </Text>
          </View>
          <TouchableOpacity
            style={[
              moduleStyles.button,
              {
                flex: 1,
                backgroundColor:
                  componentPage >= totalComponentPages - 1
                    ? COLORS.grayMedium
                    : COLORS.primaryLight,
              },
            ]}
            disabled={componentPage >= totalComponentPages - 1}
            onPress={() =>
              setComponentPage((page) =>
                Math.min(totalComponentPages - 1, page + 1),
              )
            }
          >
            <Text style={[moduleStyles.buttonText, { marginRight: 4 }]}>
              Next
            </Text>
            <MaterialCommunityIcons
              name="chevron-right"
              size={18}
              color={COLORS.white}
            />
          </TouchableOpacity>
        </View>
      )}
    </ModuleContainer>
  );
}
