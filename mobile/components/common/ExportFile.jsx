import React, { useState } from "react";
import AppText from "./AppText";
import {
  ActivityIndicator,
  TouchableOpacity,
  View
} from "react-native";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { InfoCard } from "./MobileModule";
import { COLORS } from "../../stylesheets/colors";
import { exportReportCsv, exportReportPdf } from "../../utilities/reportExport";
import { showToast } from "../../utilities/toast";

export default function ExportFile({ title = "Reports and Analytics", sections = [] }) {
  const [exporting, setExporting] = useState(false);

  const handleExport = async (format) => {
    if (!sections.length) {
      showToast("No report data to export.");
      return;
    }

    try {
      setExporting(true);

      if (format === "pdf") {
        await exportReportPdf({ title, sections });
      } else {
        await exportReportCsv({ title, sections });
      }

      showToast(`Exported ${format.toUpperCase()} successfully.`);
    } catch (error) {
      console.error("Report export failed:", error);
      showToast(error.message || "Export failed.");
    } finally {
      setExporting(false);
    }
  };

  const ExportButton = ({ label, icon, onPress }) => (
    <TouchableOpacity
      onPress={onPress}
      disabled={exporting}
      style={{
        flex: 1,
        backgroundColor: COLORS.primaryLight,
        borderRadius: 8,
        minHeight: 42,
        alignItems: "center",
        justifyContent: "center",
        flexDirection: "row",
        opacity: exporting ? 0.6 : 1,
      }}
    >
      <MaterialCommunityIcons name={icon} size={16} color={COLORS.white} />
      {exporting ? (
        <ActivityIndicator
          size="small"
          color={COLORS.white}
          style={{ marginLeft: 6 }}
        />
      ) : null}
      <AppText style={{ color: COLORS.white, fontSize: 12, fontWeight: "700", marginLeft: 6 }}>
        {exporting ? "Exporting..." : label}
      </AppText>
    </TouchableOpacity>
  );

  return (
    <InfoCard
      title="Export Reports"
      subtitle="Share report snapshot as PDF or CSV"
    >
      <View style={{ flexDirection: "row", gap: 8, marginTop: 8 }}>
        <ExportButton label="Export PDF" icon="file-pdf-box" onPress={() => handleExport("pdf")} />
        <ExportButton label="Export CSV" icon="file-delimited" onPress={() => handleExport("csv")} />
      </View>
    </InfoCard>
  );
}
