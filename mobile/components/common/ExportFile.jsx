import React, { useState } from "react";
import AppText from "./AppText";
import {
  ActivityIndicator,
  Platform,
  TouchableOpacity,
  View
} from "react-native";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { Picker } from "@react-native-picker/picker";
import { InfoCard } from "./MobileModule";
import { COLORS } from "../../stylesheets/colors";
import { exportReportExcel, exportReportPdf } from "../../utilities/reportExport";
import { showToast } from "../../utilities/toast";

// Keep the iOS wheel compact while leaving enough room to scroll its two items.
const FILE_TYPE_PICKER_HEIGHT = Platform.OS === "ios" ? 120 : 48;

export default function ExportFile({
  title = "Reports and Analytics",
  sections = [],
  summaryCards = [],
  barCharts = [],
}) {
  const [exporting, setExporting] = useState(false);
  const [fileType, setFileType] = useState("PDF");

  const handleExport = async () => {
    if (!sections.length) {
      showToast("No report data to export.");
      return;
    }

    try {
      setExporting(true);

      if (fileType === "PDF") {
        await exportReportPdf({ title, sections, summaryCards, barCharts });
      } else {
        await exportReportExcel({ title, sections });
      }
    } catch (error) {
      console.error("Report export failed:", error);
      showToast(error.message || "Export failed.");
    } finally {
      setExporting(false);
    }
  };

  return (
    <InfoCard title="Export Reports" subtitle="Select a file type and export">
      <AppText style={{ color: COLORS.grayDark, fontSize: 11, fontWeight: "700", marginTop: 8 }}>
        FILE TYPE
      </AppText>
      <View style={{ borderColor: COLORS.grayMedium, borderRadius: 8, borderWidth: 1, marginVertical: 6, overflow: "hidden" }}>
        <Picker
          accessibilityLabel="File Type"
          enabled={!exporting}
          selectedValue={fileType}
          onValueChange={setFileType}
          style={{
            color: COLORS.black,
            height: FILE_TYPE_PICKER_HEIGHT,
          }}
          itemStyle={
            Platform.OS === "ios"
              ? { color: COLORS.black, height: FILE_TYPE_PICKER_HEIGHT }
              : undefined
          }
        >
          <Picker.Item label="PDF" value="PDF" />
          <Picker.Item label="Excel" value="Excel" />
        </Picker>
      </View>
      <TouchableOpacity
        accessibilityRole="button"
        onPress={handleExport}
        disabled={exporting}
        style={{ backgroundColor: COLORS.primaryLight, borderRadius: 8, minHeight: 42, alignItems: "center", justifyContent: "center", flexDirection: "row", opacity: exporting ? 0.6 : 1 }}
      >
        {exporting ? (
          <ActivityIndicator size="small" color={COLORS.white} />
        ) : (
          <MaterialCommunityIcons name={fileType === "PDF" ? "file-pdf-box" : "file-excel"} size={17} color={COLORS.white} />
        )}
        <AppText style={{ color: COLORS.white, fontSize: 12, fontWeight: "700", marginLeft: 6 }}>
          {exporting ? "Exporting..." : "Export"}
        </AppText>
      </TouchableOpacity>
    </InfoCard>
  );
}
