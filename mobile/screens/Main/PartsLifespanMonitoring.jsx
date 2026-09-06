import React, { useCallback, useContext, useEffect, useMemo, useState } from "react";
import AppText from "../../components/common/AppText";
import AppInput from "../../components/common/AppInput";
import {
  ActivityIndicator,
  Modal,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  View
} from "react-native";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import DateTimePicker from "@react-native-community/datetimepicker";
import * as DocumentPicker from "expo-document-picker";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { API_BASE } from "../../utilities/API_BASE";
import { AuthContext } from "../../Context/AuthContext";
import {
  formatDate,
  getAuthHeaders,
  getMultipartAuthHeaders,
} from "../../utilities/mobileApi";
import { showToast } from "../../utilities/toast";
import { confirmAction } from "../../utilities/confirmAction";
import PinVerifiedSignatureModal from "../../components/common/PinVerifiedSignatureModal";
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
import { matchesSearch } from "../../utilities/search";
import { exportPartsLifespanMonitoringExcel } from "../../utilities/documentExport";
import { resolveUserRole } from "../../../shared/navigationAccess";

const referenceFields = [
  ["engTT", "Engine Cycle"],
  ["today", "Date"],
  ["n1Cycles", "N1"],
  ["n2Cycles", "N2"],
  ["acftTT", "Acft. TT"],
  ["landings", "Landings"],
];

const previewColumns = [
  ["componentName", "Component", 230],
  ["hourLimit1", "Hour Limit", 90],
  ["hourLimit2", "H/C/OC", 90],
  ["dayLimit", "Day Limit", 90],
  ["dayType", "D/OC", 80],
  ["dateCW", "Date C/W", 110],
  ["hoursCW", "HRS C/W", 90],
  ["daysRemaining", "Days Remaining", 120],
  ["timeRemaining", "Time/Cyc Remaining", 140],
  ["dateDue", "Date Due", 110],
  ["ttCycleDue", "TT/Cyc Due", 110],
  ["due", "Due", 80],
  ["hd", "H/D", 80],
  ["timeSinceInstall", "Time Since Install", 150],
  ["totalTimeSinceNew", "Total Time Since New", 150],
];

const COMPONENT_PAGE_SIZE = 10;

const parseApiResponse = async (response) => {
  const responseText = await response.text();
  if (!responseText) return {};

  try {
    return JSON.parse(responseText);
  } catch {
    throw new Error(
      response.ok
        ? "The server returned an invalid workbook response."
        : `Workbook upload failed (${response.status}).`,
    );
  }
};

const formatLifespanDate = (value) => {
  if (!value) return "N/A";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return String(value);
  return date.toLocaleDateString("en-US", {
    month: "2-digit",
    day: "2-digit",
    year: "2-digit",
  });
};

const formatCreepDamage = (value) => {
  if (value === null || value === undefined || value === "") return "N/A";

  const parsed = Number(String(value).replace("%", "").trim());
  if (!Number.isFinite(parsed) || parsed < 0 || parsed > 100) return "N/A";

  return `${Number.isInteger(parsed) ? parsed : Math.round(parsed * 100) / 100}%`;
};

const parsePickerDate = (value) => {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? new Date() : date;
};

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
  const insets = useSafeAreaInsets();
  const { user } = useContext(AuthContext);
  const normalizedRole = resolveUserRole(user);
  const canEditParts = ["maintenance manager", "superadmin"].includes(normalizedRole);
  const [aircraftOptions, setAircraftOptions] = useState([]);
  const [selectedAircraft, setSelectedAircraft] = useState("");
  const [showAircraftDropdown, setShowAircraftDropdown] = useState(false);
  const [search, setSearch] = useState("");
  const [loadingAircraft, setLoadingAircraft] = useState(false);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [importing, setImporting] = useState(false);
  const [previewing, setPreviewing] = useState(false);
  const [pendingImportAsset, setPendingImportAsset] = useState(null);
  const [importPreview, setImportPreview] = useState(null);
  const [importWarnings, setImportWarnings] = useState([]);
  const [importErrors, setImportErrors] = useState([]);
  const [signatureImportVisible, setSignatureImportVisible] = useState(false);
  const [parts, setParts] = useState([]);
  const [refs, setRefs] = useState(normalizeRef());
  const [aircraftDetails, setAircraftDetails] = useState({});
  const [activeTab, setActiveTab] = useState("overview");
  const [statusFilter, setStatusFilter] = useState("all");
  const [componentPage, setComponentPage] = useState(0);
  const [selectedPartIndex, setSelectedPartIndex] = useState(null);
  const [datePickerTarget, setDatePickerTarget] = useState(null);

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
      setRefs(normalizeRef());
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

  const cleanParts = useMemo(
    () =>
      parts
        .map((part, index) => ({ ...part, __sourceIndex: index }))
        .filter((part) => part.rowType !== "header"),
    [parts],
  );

  const filteredParts = useMemo(() => {
    return cleanParts.filter((part) => matchesSearch(search, part));
  }, [cleanParts, search]);

  const summary = useMemo(
    () =>
      cleanParts.reduce(
        (totals, part) => {
          const status = getPartStatus(part).label;
          totals.total += 1;
          if (status === "Due") totals.due += 1;
          if (status === "Due Soon") totals.dueSoon += 1;
          return totals;
        },
        { total: 0, due: 0, dueSoon: 0 },
      ),
    [cleanParts],
  );

  const summaryChips = useMemo(
    () => [
      { key: "due", label: "Due", value: summary.due, color: "#cf1322" },
      {
        key: "dueSoon",
        label: "Due Soon",
        value: summary.dueSoon,
        color: "#d46b08",
      },
      {
        key: "ok",
        label: "OK",
        value: Math.max(summary.total - summary.due - summary.dueSoon, 0),
        color: COLORS.primaryLight,
      },
      { key: "total", label: "Total", value: summary.total, color: COLORS.primary },
    ],
    [summary],
  );

  const statusFilters = useMemo(
    () => [
      { key: "all", label: "All", value: summary.total },
      { key: "due", label: "Due", value: summary.due },
      { key: "dueSoon", label: "Due Soon", value: summary.dueSoon },
      {
        key: "ok",
        label: "OK",
        value: Math.max(summary.total - summary.due - summary.dueSoon, 0),
      },
    ],
    [summary],
  );

  const statusFilteredParts = useMemo(() => {
    if (statusFilter === "all") return filteredParts;
    return filteredParts.filter((part) => {
      const label = getPartStatus(part).label;
      if (statusFilter === "due") return label === "Due";
      if (statusFilter === "dueSoon") return label === "Due Soon";
      return label === "OK";
    });
  }, [filteredParts, statusFilter]);

  const totalComponentPages = Math.max(
    1,
    Math.ceil(statusFilteredParts.length / COMPONENT_PAGE_SIZE),
  );

  const paginatedParts = useMemo(
    () =>
      statusFilteredParts.slice(
        componentPage * COMPONENT_PAGE_SIZE,
        (componentPage + 1) * COMPONENT_PAGE_SIZE,
      ),
    [componentPage, statusFilteredParts],
  );

  const selectedPart = useMemo(
    () =>
      selectedPartIndex === null
        ? null
        : cleanParts.find((part) => part.__sourceIndex === selectedPartIndex),
    [cleanParts, selectedPartIndex],
  );

  useEffect(() => {
    setSelectedPartIndex(null);
    setComponentPage(0);
  }, [search, selectedAircraft, statusFilter]);

  const updatePartField = (sourceIndex, field, value) => {
    setParts((currentParts) =>
      currentParts.map((part, index) =>
        index === sourceIndex ? { ...part, [field]: value } : part,
      ),
    );
  };

  const openDatePicker = (target) => {
    if (!canEditParts) return;
    setDatePickerTarget(target);
  };

  const closePartEditor = () => {
    setDatePickerTarget((currentTarget) =>
      currentTarget?.type === "part" ? null : currentTarget,
    );
    setSelectedPartIndex(null);
  };

  const handleDatePickerChange = (event, selectedDate) => {
    const target = datePickerTarget;
    setDatePickerTarget(null);

    if (event?.type === "dismissed" || !selectedDate || !target) {
      return;
    }

    const nextValue = selectedDate.toISOString().slice(0, 10);
    if (target.type === "ref") {
      setRefs((current) => ({ ...current, [target.key]: nextValue }));
      return;
    }

    updatePartField(target.sourceIndex, target.field, nextValue);
  };

  const saveToDatabase = async () => {
    if (!selectedAircraft) {
      showToast("Select an aircraft before saving.");
      return;
    }

    const confirmed = await confirmAction({
      title: "Save Parts Lifespan Data",
      message: `Save current parts lifespan values for ${selectedAircraft}?`,
      confirmText: "Save",
    });
    if (!confirmed) return;

    try {
      setSaving(true);
      const response = await fetch(`${API_BASE}/api/parts-monitoring/save`, {
        method: "POST",
        headers: await getAuthHeaders({
          "x-action-confirmed": "true",
        }),
        body: JSON.stringify({
          aircraft: selectedAircraft,
          referenceData: {
            ...refs,
            today: new Date(refs.today),
          },
          parts,
          confirmAction: true,
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

  const resetImportPreview = () => {
    setPendingImportAsset(null);
    setImportPreview(null);
    setImportWarnings([]);
    setImportErrors([]);
    setSignatureImportVisible(false);
  };

  const selectAircraft = (aircraft) => {
    setSelectedAircraft(aircraft);
    setShowAircraftDropdown(false);
  };

  const exportAircraftWorkbook = async () => {
    if (!selectedAircraft || loading || exporting || parts.length === 0) return;

    try {
      setExporting(true);
      await exportPartsLifespanMonitoringExcel(selectedAircraft);
    } catch {
      // The export utility reports the actionable error to the user.
    } finally {
      setExporting(false);
    }
  };

  const appendWorkbookToForm = (formData, asset) => {
    formData.append("workbook", {
      uri: asset.uri,
      name: asset.name || "parts-lifespan-monitoring.xlsx",
      type:
        asset.mimeType ||
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    });
  };

  const previewAircraftWorkbook = async () => {
    if (!canEditParts) {
      showToast("Only maintenance managers and superadmins can add aircraft.");
      return;
    }

    try {
      const picked = await DocumentPicker.getDocumentAsync({
        type: [
          "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
          "application/vnd.ms-excel.sheet.macroEnabled.12",
        ],
        copyToCacheDirectory: true,
        multiple: false,
      });

      if (picked.canceled) {
        return;
      }

      const asset = picked.assets?.[0];
      if (!asset?.uri) {
        showToast("No workbook selected.");
        return;
      }

      setPreviewing(true);
      const formData = new FormData();
      appendWorkbookToForm(formData, asset);

      const response = await fetch(
        `${API_BASE}/api/parts-monitoring/preview-workbook`,
        {
          method: "POST",
          headers: await getMultipartAuthHeaders(),
          body: formData,
        },
      );
      const result = await parseApiResponse(response);
      if (!response.ok || !result.success) {
        throw new Error(result.message || "Failed to preview workbook");
      }

      setPendingImportAsset(asset);
      setImportPreview(result.data);
      setImportWarnings(result.warnings || []);
      setImportErrors(result.errors || []);
    } catch (error) {
      console.error("Parts lifespan workbook preview failed:", error);
      showToast(error.message || "Failed to preview workbook.");
      resetImportPreview();
    } finally {
      setPreviewing(false);
    }
  };

  const importAircraftWorkbook = async (approvalSignature) => {
    if (!pendingImportAsset) {
      showToast("Select a workbook before adding aircraft.");
      return;
    }

    try {
      setImporting(true);
      const formData = new FormData();
      appendWorkbookToForm(formData, pendingImportAsset);
      formData.append("approvalSignature", approvalSignature);
      formData.append(
        "updatedBy",
        user ? `${user.firstName || ""} ${user.lastName || ""}`.trim() : "mobile user",
      );

      const response = await fetch(
        `${API_BASE}/api/parts-monitoring/import-workbook`,
        {
          method: "POST",
          headers: await getMultipartAuthHeaders(),
          body: formData,
        },
      );
      const result = await parseApiResponse(response);
      if (!response.ok || !result.success) {
        throw new Error(result.message || "Failed to import workbook");
      }

      showToast(result.message || "Aircraft imported successfully.");
      await fetchAircraftList();
      setSelectedAircraft(result.data.aircraft);
      resetImportPreview();
    } catch (error) {
      console.error("Parts lifespan workbook import failed:", error);
      showToast(error.message || "Failed to import workbook.");
    } finally {
      setImporting(false);
    }
  };

  return (
    <ModuleContainer>
      <InfoCard title="Parts Lifespan Monitoring" subtitle="Aircraft component status">
        <View style={{ marginTop: 10, zIndex: showAircraftDropdown ? 1000 : 1 }}>
          <TouchableOpacity
            style={[
              styles.unifiedFilterButton,
              loadingAircraft ? styles.unifiedFilterButtonDisabled : null,
            ]}
            activeOpacity={0.82}
            disabled={loadingAircraft}
            onPress={() => setShowAircraftDropdown((open) => !open)}
          >
            <MaterialCommunityIcons
              name="tune"
              size={16}
              color={COLORS.primaryLight}
              style={{ marginRight: 6 }}
            />
            <AppText
              style={[
                styles.unifiedFilterButtonText,
                { color: selectedAircraft ? COLORS.black : COLORS.grayDark },
              ]}
              numberOfLines={1}
            >
              {loadingAircraft
                ? "Loading aircraft..."
                : selectedAircraft
                  ? `RP/C: ${selectedAircraft}`
                  : "Choose an aircraft"}
            </AppText>
            <MaterialCommunityIcons
              name={showAircraftDropdown ? "chevron-up" : "chevron-down"}
              size={22}
              color={COLORS.grayDark}
            />
          </TouchableOpacity>

          {showAircraftDropdown && (
            <View style={[styles.unifiedDropdownMenu, { maxHeight: 300 }]}>
              <ScrollView nestedScrollEnabled>
                <TouchableOpacity
                  accessibilityRole="button"
                  accessibilityState={{ selected: !selectedAircraft }}
                  style={[
                    styles.unifiedDropdownItem,
                    styles.unifiedDropdownItemBordered,
                  ]}
                  onPress={() => selectAircraft("")}
                >
                  <AppText style={styles.unifiedDropdownItemText}>
                    Choose an aircraft
                  </AppText>
                </TouchableOpacity>
                {aircraftOptions.length === 0 ? (
                  <View style={styles.unifiedDropdownItem}>
                    <AppText style={styles.unifiedDropdownItemText}>
                      No aircraft available
                    </AppText>
                  </View>
                ) : (
                  aircraftOptions.map((aircraft, index) => (
                    <TouchableOpacity
                      key={aircraft}
                      style={[
                        styles.unifiedDropdownItem,
                        index < aircraftOptions.length - 1
                          ? styles.unifiedDropdownItemBordered
                          : null,
                      ]}
                      accessibilityRole="button"
                      accessibilityState={{
                        selected: selectedAircraft === aircraft,
                      }}
                      onPress={() => selectAircraft(aircraft)}
                    >
                      <AppText style={styles.unifiedDropdownItemText}>
                        RP/C: {aircraft}
                      </AppText>
                    </TouchableOpacity>
                  ))
                )}
              </ScrollView>
            </View>
          )}
        </View>
        {canEditParts && (
          <TouchableOpacity
            style={[moduleStyles.button, { marginTop: 12 }]}
            onPress={previewAircraftWorkbook}
            disabled={previewing || importing}
          >
            {previewing || importing ? (
              <ActivityIndicator size="small" color={COLORS.white} />
            ) : (
              <MaterialCommunityIcons
                name="file-excel"
                size={18}
                color={COLORS.white}
              />
            )}
            <AppText style={[moduleStyles.buttonText, { marginLeft: 6 }]}>
              {previewing ? "Previewing..." : importing ? "Importing..." : "Add Aircraft"}
            </AppText>
          </TouchableOpacity>
        )}
        <TouchableOpacity
          style={[
            moduleStyles.button,
            { marginTop: 12 },
            !selectedAircraft || loading || exporting || parts.length === 0
              ? { backgroundColor: COLORS.grayMedium }
              : null,
          ]}
          onPress={exportAircraftWorkbook}
          disabled={
            !selectedAircraft || loading || exporting || parts.length === 0
          }
        >
          {exporting ? (
            <ActivityIndicator size="small" color={COLORS.white} />
          ) : (
            <MaterialCommunityIcons
              name="file-export-outline"
              size={18}
              color={COLORS.white}
            />
          )}
          <AppText style={[moduleStyles.buttonText, { marginLeft: 6 }]}>
            {exporting ? "Exporting..." : "Export"}
          </AppText>
        </TouchableOpacity>
      </InfoCard>

      {!!selectedAircraft && (
        <View style={styles.summaryGrid}>
          {summaryChips.map((chip) => (
            <TouchableOpacity
              key={chip.key}
              activeOpacity={0.82}
              style={[styles.summaryChip, { borderColor: `${chip.color}55` }]}
              onPress={() => {
                setStatusFilter(chip.key === "total" ? "all" : chip.key);
                setActiveTab("components");
              }}
            >
              <AppText style={[styles.summaryValue, { color: chip.color }]}>
                {chip.value}
              </AppText>
              <AppText style={styles.summaryLabel}>{chip.label}</AppText>
            </TouchableOpacity>
          ))}
        </View>
      )}

      <SearchBar value={search} onChangeText={setSearch} placeholder="Search components" />

      {!!selectedAircraft && (
        <View style={styles.tabBar}>
          {[
            ["overview", "Overview"],
            ["components", "Components"],
            ["reference", "Reference"],
          ].map(([key, label]) => (
            <TouchableOpacity
              key={key}
              activeOpacity={0.82}
              onPress={() => setActiveTab(key)}
              style={[
                styles.tabButton,
                activeTab === key ? styles.tabButtonActive : null,
              ]}
            >
              <AppText
                style={[
                  styles.tabText,
                  activeTab === key ? styles.tabTextActive : null,
                ]}
              >
                {label}
              </AppText>
            </TouchableOpacity>
          ))}
        </View>
      )}

      {loading && <LoadingState />}
      {!loading && !selectedAircraft && <EmptyState text="Select an aircraft to view components." />}

      {!loading && !!selectedAircraft && activeTab === "overview" && (
        <InfoCard
          title={selectedAircraft}
          subtitle={aircraftDetails.aircraftType || "Aircraft details"}
        >
          <View style={styles.fieldGrid}>
            <FieldRow
              label="Date Manufactured"
              value={formatLifespanDate(aircraftDetails.dateManufactured)}
            />
            <FieldRow label="Serial Number" value={aircraftDetails.serialNumber} />
            <FieldRow
              label="Creep Damage"
              value={formatCreepDamage(aircraftDetails.creepDamage)}
            />
            <FieldRow label="Tracked Components" value={summary.total} />
            <FieldRow label="Due" value={summary.due} />
            <FieldRow label="Due Soon" value={summary.dueSoon} />
          </View>
        </InfoCard>
      )}

      {!loading && !!selectedAircraft && activeTab === "reference" && (
        <InfoCard title="Reference Values" subtitle="Used by web formulas and saved workbook data">
          <View style={styles.inputGrid}>
            {referenceFields.map(([key, label]) => (
              <View key={key} style={styles.inputCell}>
                <AppText style={moduleStyles.label}>{label}</AppText>
                {key === "today" ? (
                  <TouchableOpacity
                    disabled={!canEditParts}
                    onPress={() => openDatePicker({ type: "ref", key })}
                    style={[
                      styles.inputLike,
                      !canEditParts ? styles.inputDisabled : null,
                    ]}
                  >
                    <AppText style={{ color: refs[key] ? COLORS.black : COLORS.grayDark }}>
                      {formatLifespanDate(refs[key]) || "Select date"}
                    </AppText>
                  </TouchableOpacity>
                ) : (
                  <AppInput
                    value={String(refs[key] ?? "")}
                    editable={canEditParts}
                    keyboardType="numeric"
                    onChangeText={(value) =>
                      setRefs((current) => ({ ...current, [key]: value }))
                    }
                    style={[
                      styles.inputLike,
                      !canEditParts ? styles.inputDisabled : null,
                    ]}
                  />
                )}
              </View>
            ))}
          </View>
          {canEditParts && (
            <TouchableOpacity
              style={[moduleStyles.button, { marginTop: 12 }]}
              onPress={saveToDatabase}
              disabled={saving}
            >
              {saving ? (
                <ActivityIndicator size="small" color={COLORS.white} />
              ) : (
                <MaterialCommunityIcons name="content-save" size={18} color={COLORS.white} />
              )}
              <AppText style={[moduleStyles.buttonText, { marginLeft: 6 }]}>
                {saving ? "Saving..." : "Save to Database"}
              </AppText>
            </TouchableOpacity>
          )}
        </InfoCard>
      )}

      {!loading && !!selectedAircraft && activeTab === "components" && (
        <>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.filterRow}
          >
            {statusFilters.map((filter) => (
              <TouchableOpacity
                key={filter.key}
                activeOpacity={0.82}
                onPress={() => setStatusFilter(filter.key)}
                style={[
                  styles.filterChip,
                  statusFilter === filter.key ? styles.filterChipActive : null,
                ]}
              >
                <AppText
                  style={[
                    styles.filterText,
                    statusFilter === filter.key ? styles.filterTextActive : null,
                  ]}
                >
                  {filter.label} {filter.value}
                </AppText>
              </TouchableOpacity>
            ))}
          </ScrollView>
          {statusFilteredParts.length === 0 && (
            <EmptyState text="No component rows found." />
          )}
          {statusFilteredParts.length > 0 && (
            <AppText style={styles.pageSummary}>
              Showing {componentPage * COMPONENT_PAGE_SIZE + 1}-
              {Math.min(
                (componentPage + 1) * COMPONENT_PAGE_SIZE,
                statusFilteredParts.length,
              )} of {statusFilteredParts.length}
            </AppText>
          )}
          {paginatedParts.map((part, index) => {
            const status = getPartStatus(part);
            return (
              <TouchableOpacity
                key={part._id || `${part.componentName}-${part.__sourceIndex}-${index}`}
                activeOpacity={0.86}
                style={styles.componentRow}
                onPress={() => setSelectedPartIndex(part.__sourceIndex)}
              >
                <View style={styles.componentHeader}>
                  <View style={{ flex: 1, paddingRight: 8 }}>
                    <AppText numberOfLines={2} style={styles.componentName}>
                      {part.componentName || "Unnamed component"}
                    </AppText>
                    <AppText style={styles.componentMeta}>
                      Due {formatLifespanDate(part.dateDue)}
                    </AppText>
                  </View>
                  <StatusChip label={status.label} color={status.color} />
                </View>
                <View style={styles.metricRow}>
                  <View style={styles.metricCell}>
                    <AppText style={styles.metricLabel}>Days</AppText>
                    <AppText style={styles.metricValue}>{part.daysRemaining ?? "N/A"}</AppText>
                  </View>
                  <View style={styles.metricCell}>
                    <AppText style={styles.metricLabel}>Time/Cyc</AppText>
                    <AppText style={styles.metricValue}>{part.timeRemaining ?? "N/A"}</AppText>
                  </View>
                  <View style={styles.metricCell}>
                    <AppText style={styles.metricLabel}>H/D</AppText>
                    <AppText style={styles.metricValue}>{part.hd || "N/A"}</AppText>
                  </View>
                </View>
              </TouchableOpacity>
            );
          })}
          {statusFilteredParts.length > COMPONENT_PAGE_SIZE && (
            <View style={styles.paginationRow}>
              <TouchableOpacity
                activeOpacity={0.82}
                style={[
                  moduleStyles.button,
                  styles.paginationButton,
                  componentPage === 0 ? styles.paginationButtonDisabled : null,
                ]}
                disabled={componentPage === 0}
                onPress={() => setComponentPage((page) => Math.max(0, page - 1))}
              >
                <MaterialCommunityIcons
                  name="chevron-left"
                  size={18}
                  color={COLORS.white}
                />
                <AppText style={[moduleStyles.buttonText, { marginLeft: 4 }]}>
                  Previous
                </AppText>
              </TouchableOpacity>
              <View style={styles.pageCounter}>
                <AppText style={styles.pageCounterText}>
                  {componentPage + 1}/{totalComponentPages}
                </AppText>
              </View>
              <TouchableOpacity
                activeOpacity={0.82}
                style={[
                  moduleStyles.button,
                  styles.paginationButton,
                  componentPage >= totalComponentPages - 1
                    ? styles.paginationButtonDisabled
                    : null,
                ]}
                disabled={componentPage >= totalComponentPages - 1}
                onPress={() =>
                  setComponentPage((page) =>
                    Math.min(totalComponentPages - 1, page + 1),
                  )
                }
              >
                <AppText style={[moduleStyles.buttonText, { marginRight: 4 }]}>
                  Next
                </AppText>
                <MaterialCommunityIcons
                  name="chevron-right"
                  size={18}
                  color={COLORS.white}
                />
              </TouchableOpacity>
            </View>
          )}
        </>
      )}

      {datePickerTarget?.type === "ref" && (
        <DateTimePicker
          value={parsePickerDate(refs[datePickerTarget.key])}
          mode="date"
          display="default"
          onChange={handleDatePickerChange}
        />
      )}
      <Modal
        visible={Boolean(selectedPart)}
        transparent
        animationType="slide"
        onRequestClose={closePartEditor}
      >
        <View style={styles.sheetOverlay}>
          <View style={styles.sheet}>
            {!!selectedPart && (
              <>
                <View style={styles.sheetHandle} />
                <View style={styles.sheetHeader}>
                  <View style={{ flex: 1, paddingRight: 8 }}>
                    <AppText style={styles.sheetTitle}>
                      {selectedPart.componentName || "Unnamed component"}
                    </AppText>
                    <AppText style={styles.componentMeta}>
                      {selectedPart.hd || "Component interval"}
                    </AppText>
                  </View>
                  <StatusChip
                    label={getPartStatus(selectedPart).label}
                    color={getPartStatus(selectedPart).color}
                  />
                </View>
                <ScrollView
                  showsVerticalScrollIndicator={false}
                  contentContainerStyle={{ paddingBottom: 18 }}
                >
                  <View style={styles.fieldGrid}>
                    <FieldRow label="Days Remaining" value={selectedPart.daysRemaining} />
                    <FieldRow label="Time/Cyc Remaining" value={selectedPart.timeRemaining} />
                    <FieldRow label="Date Due" value={formatLifespanDate(selectedPart.dateDue)} />
                    <FieldRow label="Due" value={selectedPart.due} />
                  </View>
                  <View style={styles.inputGrid}>
                    {[
                      ["hoursCW", "HRS C/W", "numeric"],
                      ["timeSinceInstall", "Time Since Installation", "numeric"],
                      ["totalTimeSinceNew", "Total Time Since New", "numeric"],
                      ["ttCycleDue", "TT/CYC Due", "numeric"],
                      ["hourLimit1", "Hour Limit", "numeric"],
                      ["hourLimit2", "H/C/OC", "default"],
                      ["dayLimit", "Day Limit", "numeric"],
                      ["dayType", "D/OC", "default"],
                    ].map(([field, label, keyboardType]) => (
                      <View key={field} style={styles.inputCell}>
                        <AppText style={moduleStyles.label}>{label}</AppText>
                        <AppInput
                          value={String(selectedPart[field] ?? "")}
                          editable={canEditParts}
                          keyboardType={keyboardType}
                          onChangeText={(value) =>
                            updatePartField(selectedPart.__sourceIndex, field, value)
                          }
                          style={[
                            styles.inputLike,
                            !canEditParts ? styles.inputDisabled : null,
                          ]}
                        />
                      </View>
                    ))}
                    <View style={styles.inputCell}>
                      <AppText style={moduleStyles.label}>Date C/W</AppText>
                      <TouchableOpacity
                        disabled={!canEditParts}
                        onPress={() =>
                          openDatePicker({
                            type: "part",
                            sourceIndex: selectedPart.__sourceIndex,
                            field: "dateCW",
                          })
                        }
                        style={[
                          styles.inputLike,
                          !canEditParts ? styles.inputDisabled : null,
                        ]}
                      >
                        <AppText
                          style={{
                            color: selectedPart.dateCW ? COLORS.black : COLORS.grayDark,
                          }}
                        >
                          {formatLifespanDate(selectedPart.dateCW)}
                        </AppText>
                      </TouchableOpacity>
                    </View>
                  </View>
                  {datePickerTarget?.type === "part" && (
                    <DateTimePicker
                      value={parsePickerDate(
                        parts[datePickerTarget.sourceIndex]?.[
                          datePickerTarget.field
                        ],
                      )}
                      mode="date"
                      display="default"
                      onChange={handleDatePickerChange}
                    />
                  )}
                </ScrollView>
                <View
                  style={[
                    styles.sheetActions,
                    { paddingBottom: Math.max(insets.bottom + 12, 24) },
                  ]}
                >
                  <TouchableOpacity
                    style={[moduleStyles.button, styles.sheetButton, { backgroundColor: COLORS.grayMedium }]}
                    onPress={closePartEditor}
                  >
                    <AppText style={moduleStyles.buttonText}>Close</AppText>
                  </TouchableOpacity>
                  {canEditParts && (
                    <TouchableOpacity
                      style={[moduleStyles.button, styles.sheetButton]}
                      onPress={saveToDatabase}
                      disabled={saving}
                    >
                      {saving ? (
                        <ActivityIndicator size="small" color={COLORS.white} />
                      ) : (
                        <MaterialCommunityIcons name="content-save" size={18} color={COLORS.white} />
                      )}
                      <AppText style={[moduleStyles.buttonText, { marginLeft: 6 }]}>
                        {saving ? "Saving..." : "Save"}
                      </AppText>
                    </TouchableOpacity>
                  )}
                </View>
              </>
            )}
          </View>
        </View>
      </Modal>
      <Modal
        visible={Boolean(importPreview)}
        transparent
        animationType="fade"
        onRequestClose={resetImportPreview}
      >
        <View
          style={{
            flex: 1,
            backgroundColor: "rgba(0,0,0,0.45)",
            justifyContent: "center",
            padding: 16,
          }}
        >
          <View
            style={{
              backgroundColor: COLORS.white,
              borderRadius: 10,
              padding: 16,
              maxHeight: "86%",
            }}
          >
            <ScrollView>
              <AppText style={{ fontSize: 15, fontWeight: "800", color: COLORS.black }}>
                Preview Aircraft Import
              </AppText>
              {importErrors.map((error) => (
                <View
                  key={error}
                  style={{
                    backgroundColor: "#fff1f0",
                    borderColor: "#ffa39e",
                    borderWidth: 1,
                    borderRadius: 8,
                    padding: 10,
                    marginTop: 10,
                  }}
                >
                  <AppText style={{ color: "#cf1322", fontWeight: "700" }}>{error}</AppText>
                </View>
              ))}
              {importWarnings.map((warning) => (
                <View
                  key={warning}
                  style={{
                    backgroundColor: "#fffbe6",
                    borderColor: "#ffe58f",
                    borderWidth: 1,
                    borderRadius: 8,
                    padding: 10,
                    marginTop: 10,
                  }}
                >
                  <AppText style={{ color: "#ad6800", fontWeight: "700" }}>{warning}</AppText>
                </View>
              ))}
              {!!importPreview && (
                <View style={{ marginTop: 12 }}>
                  <View
                    style={{
                      borderWidth: 1,
                      borderColor: COLORS.grayMedium,
                      borderRadius: 8,
                      padding: 10,
                      marginBottom: 10,
                    }}
                  >
                    <FieldRow label="Aircraft" value={importPreview.aircraft} />
                    <FieldRow
                      label="Date Manufactured"
                      value={formatDate(importPreview.dateManufactured)}
                    />
                    <FieldRow
                      label="Acft. Type"
                      value={`${importPreview.aircraftType || "N/A"}${
                        importPreview.serialNumber
                          ? ` SN: ${importPreview.serialNumber}`
                          : ""
                      }`}
                    />
                    <FieldRow
                      label="Creep Damage"
                      value={formatCreepDamage(importPreview.creepDamage)}
                    />
                  </View>
                  <View
                    style={{
                      borderWidth: 1,
                      borderColor: COLORS.grayMedium,
                      borderRadius: 8,
                      padding: 10,
                      marginBottom: 10,
                    }}
                  >
                    <View style={{ flexDirection: "row", flexWrap: "wrap" }}>
                      {[
                        ["engTT", "Engine Cycle"],
                        ["today", "Date"],
                        ["n1Cycles", "N1"],
                        ["n2Cycles", "N2"],
                        ["acftTT", "Acft. TT"],
                        ["landings", "Landings"],
                      ].map(([key, label]) => (
                        <FieldRow
                          key={key}
                          label={label}
                          value={
                            key === "today"
                              ? formatDate(importPreview.referenceData?.[key])
                              : (importPreview.referenceData?.[key] ?? "N/A")
                          }
                        />
                      ))}
                      <FieldRow label="Sling" value="" />
                    </View>
                  </View>
                  <SectionTitle
                    title="Parts Lifespan Table"
                  />
                  {importPreview.previewTruncated && (
                    <AppText style={{ color: "#8a5a00", marginBottom: 8 }}>
                      Showing the first {importPreview.previewRowCount} rows to
                      keep the preview responsive. All {importPreview.partsCount}
                      rows will be imported.
                    </AppText>
                  )}
                  <ScrollView horizontal>
                    <View
                      style={{
                        borderWidth: 1,
                        borderColor: COLORS.grayMedium,
                        borderRadius: 8,
                        overflow: "hidden",
                        marginBottom: 8,
                      }}
                    >
                      <View style={{ flexDirection: "row", backgroundColor: "#E2F0D9" }}>
                        {previewColumns.map(([key, label, width]) => (
                          <View
                            key={key}
                            style={{
                              width,
                              minHeight: 42,
                              borderRightWidth: 1,
                              borderBottomWidth: 1,
                              borderColor: COLORS.grayMedium,
                              alignItems: "center",
                              justifyContent: "center",
                              padding: 6,
                            }}
                          >
                            <AppText
                              style={{
                                color: COLORS.black,
                                fontWeight: "800",
                                fontSize: 11,
                                textAlign: "center",
                              }}
                            >
                              {label}
                            </AppText>
                          </View>
                        ))}
                      </View>
                      {(importPreview.parts || []).map((part, rowIndex) => (
                        <View
                          key={part._id || `${part.componentName}-${rowIndex}`}
                          style={{
                            flexDirection: "row",
                            backgroundColor:
                              part.rowType === "header"
                                ? "#B6D7A8"
                                : rowIndex % 2 === 0
                                  ? COLORS.white
                                  : "#FAFAFA",
                          }}
                        >
                          {previewColumns.map(([key, , width]) => (
                            <View
                              key={key}
                              style={{
                                width,
                                minHeight: 38,
                                borderRightWidth: 1,
                                borderBottomWidth: 1,
                                borderColor: COLORS.grayMedium,
                                justifyContent: "center",
                                paddingHorizontal: 6,
                                paddingVertical: 5,
                              }}
                            >
                              <AppText
                                numberOfLines={3}
                                style={{
                                  color: COLORS.black,
                                  fontSize: 11,
                                  fontWeight:
                                    part.rowType === "header" ? "800" : "400",
                                }}
                              >
                                {part[key] || ""}
                              </AppText>
                            </View>
                          ))}
                        </View>
                      ))}
                    </View>
                  </ScrollView>
                </View>
              )}
            </ScrollView>
            <View style={{ flexDirection: "row", gap: 8, marginTop: 12 }}>
              <TouchableOpacity
                style={[
                  moduleStyles.button,
                  { flex: 1, backgroundColor: COLORS.grayMedium },
                ]}
                onPress={resetImportPreview}
              >
                <AppText style={moduleStyles.buttonText}>Discard</AppText>
              </TouchableOpacity>
              <TouchableOpacity
                style={[
                  moduleStyles.button,
                  {
                    flex: 1,
                    backgroundColor:
                      importErrors.length > 0 ? COLORS.grayMedium : COLORS.primary,
                  },
                ]}
                disabled={importErrors.length > 0 || importing}
                onPress={() => setSignatureImportVisible(true)}
              >
                <AppText style={moduleStyles.buttonText}>Confirm and Sign</AppText>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
      <PinVerifiedSignatureModal
        visible={signatureImportVisible}
        title="Sign Aircraft Import"
        description={`Draw your signature to add ${importPreview?.aircraft || "this aircraft"} to parts lifespan monitoring.`}
        confirmDescription="Enter your 6-digit PIN to confirm this aircraft import."
        saveLabel="Add Aircraft"
        onClose={() => setSignatureImportVisible(false)}
        onSave={importAircraftWorkbook}
      />
    </ModuleContainer>
  );
}

const styles = StyleSheet.create({
  unifiedFilterButton: {
    backgroundColor: COLORS.white,
    borderWidth: 1,
    borderColor: COLORS.grayMedium,
    borderRadius: 10,
    paddingHorizontal: 12,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    height: 48,
  },
  unifiedFilterButtonDisabled: {
    backgroundColor: COLORS.grayLight,
  },
  unifiedFilterButtonText: {
    flex: 1,
    fontSize: 12,
    fontWeight: "600",
    marginRight: 8,
  },
  unifiedDropdownMenu: {
    position: "absolute",
    top: 52,
    left: 0,
    right: 0,
    backgroundColor: COLORS.white,
    borderWidth: 1,
    borderColor: COLORS.grayMedium,
    borderRadius: 10,
    overflow: "hidden",
    zIndex: 1000,
    elevation: 5,
  },
  unifiedDropdownItem: {
    paddingHorizontal: 12,
    paddingVertical: 12,
  },
  unifiedDropdownItemBordered: {
    borderBottomWidth: 1,
    borderBottomColor: COLORS.grayMedium,
  },
  unifiedDropdownItemText: {
    color: COLORS.black,
    fontSize: 12,
    fontWeight: "500",
  },
  summaryGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    marginBottom: 10,
  },
  summaryChip: {
    width: "48%",
    backgroundColor: COLORS.white,
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  summaryValue: {
    fontSize: 20,
    fontWeight: "800",
  },
  summaryLabel: {
    color: COLORS.grayDark,
    fontSize: 11,
    fontWeight: "700",
    marginTop: 2,
    textTransform: "uppercase",
  },
  tabBar: {
    flexDirection: "row",
    backgroundColor: COLORS.white,
    borderWidth: 1,
    borderColor: COLORS.grayMedium,
    borderRadius: 8,
    marginBottom: 10,
    padding: 3,
  },
  tabButton: {
    flex: 1,
    alignItems: "center",
    borderRadius: 6,
    paddingVertical: 9,
  },
  tabButtonActive: {
    backgroundColor: COLORS.primaryLight,
  },
  tabText: {
    color: COLORS.grayDark,
    fontSize: 12,
    fontWeight: "800",
  },
  tabTextActive: {
    color: COLORS.white,
  },
  fieldGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
  },
  inputGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  inputCell: {
    width: "48%",
    marginTop: 8,
  },
  inputLike: {
    borderWidth: 1,
    borderColor: COLORS.grayMedium,
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 9,
    marginTop: 5,
    backgroundColor: COLORS.white,
    minHeight: 42,
  },
  inputDisabled: {
    backgroundColor: COLORS.grayLight,
  },
  filterRow: {
    gap: 8,
    paddingBottom: 10,
  },
  filterChip: {
    borderWidth: 1,
    borderColor: COLORS.grayMedium,
    borderRadius: 999,
    backgroundColor: COLORS.white,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  filterChipActive: {
    backgroundColor: COLORS.primaryLight,
    borderColor: COLORS.primaryLight,
  },
  filterText: {
    color: COLORS.grayDark,
    fontSize: 12,
    fontWeight: "800",
  },
  filterTextActive: {
    color: COLORS.white,
  },
  componentRow: {
    backgroundColor: COLORS.white,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 8,
    padding: 12,
    marginBottom: 8,
  },
  componentHeader: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
  },
  componentName: {
    color: COLORS.black,
    fontSize: 14,
    fontWeight: "800",
  },
  componentMeta: {
    color: COLORS.grayDark,
    fontSize: 11,
    marginTop: 3,
  },
  metricRow: {
    flexDirection: "row",
    gap: 8,
    marginTop: 10,
  },
  metricCell: {
    flex: 1,
    borderRadius: 8,
    backgroundColor: COLORS.grayLight,
    paddingHorizontal: 8,
    paddingVertical: 8,
  },
  metricLabel: {
    color: COLORS.grayDark,
    fontSize: 10,
    fontWeight: "700",
    textTransform: "uppercase",
  },
  metricValue: {
    color: COLORS.black,
    fontSize: 13,
    fontWeight: "800",
    marginTop: 2,
  },
  pageSummary: {
    color: COLORS.grayDark,
    fontSize: 11,
    fontWeight: "700",
    marginBottom: 8,
    textTransform: "uppercase",
  },
  paginationRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 10,
    marginTop: 2,
  },
  paginationButton: {
    flex: 1,
  },
  paginationButtonDisabled: {
    backgroundColor: COLORS.grayMedium,
  },
  pageCounter: {
    minWidth: 68,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: COLORS.white,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 10,
  },
  pageCounterText: {
    color: COLORS.primary,
    fontSize: 12,
    fontWeight: "800",
  },
  sheetOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.45)",
    justifyContent: "flex-end",
  },
  sheet: {
    backgroundColor: COLORS.white,
    borderTopLeftRadius: 14,
    borderTopRightRadius: 14,
    maxHeight: "88%",
    paddingHorizontal: 14,
    paddingTop: 10,
  },
  sheetHandle: {
    alignSelf: "center",
    width: 40,
    height: 4,
    borderRadius: 4,
    backgroundColor: COLORS.grayMedium,
    marginBottom: 10,
  },
  sheetHeader: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
    marginBottom: 8,
  },
  sheetTitle: {
    color: COLORS.primary,
    fontSize: 16,
    fontWeight: "800",
  },
  sheetActions: {
    flexDirection: "row",
    gap: 8,
    paddingBottom: 14,
    paddingTop: 8,
  },
  sheetButton: {
    flex: 1,
  },
});
