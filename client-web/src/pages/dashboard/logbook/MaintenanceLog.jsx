import React, { useContext, useEffect, useMemo, useState } from "react";
import { Input, Row, Col, Card, Button, Typography, Space } from "antd";
import {
  SearchOutlined,
  ArrowLeftOutlined,
  ExportOutlined,
} from "@ant-design/icons";
import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";
import MLogTable from "../../../components/tables/MLogTable";
import { API_BASE } from "../../../utils/API_BASE";
import { AuthContext } from "../../../context/AuthContext";
import { renderStatusTag } from "../../../utils/statusTags";
import ResultPopup from "../../../components/common/ResultPopup";

const { Title, Text } = Typography;
const NGCP_LOGO_PATH = "/images/ngcp-logo.png";
const BRAND = "#26866f";
const SEEN_MAINTENANCE_LOG_IDS_KEY = "maintenanceLogSeenIds";
const formatPdfValue = (value, fallback = "") =>
  value === null || value === undefined || value === ""
    ? fallback
    : String(value);

const buildSafeFileName = (value, fallback = "MaintenanceLog") =>
  String(value || fallback)
    .trim()
    .replace(/[\\/:*?"<>|]+/g, "-")
    .replace(/\s+/g, "-");

const loadImageDataUrl = (src) =>
  new Promise((resolve, reject) => {
    const image = new Image();
    image.crossOrigin = "anonymous";
    image.onload = () => {
      const canvas = document.createElement("canvas");
      canvas.width = image.naturalWidth;
      canvas.height = image.naturalHeight;
      const context = canvas.getContext("2d");
      context.drawImage(image, 0, 0);
      resolve(canvas.toDataURL("image/png"));
    };
    image.onerror = () => reject(new Error(`Unable to load image: ${src}`));
    image.src = src;
  });

const drawTextInBox = (doc, text, x, y, width, height, options = {}) => {
  const {
    bold = false,
    fontSize = 8,
    align = "left",
    valign = "middle",
    padding = 3,
  } = options;
  doc.setFont("helvetica", bold ? "bold" : "normal");
  doc.setFontSize(fontSize);

  const lines = doc.splitTextToSize(formatPdfValue(text), width - padding * 2);
  const lineHeight = fontSize + 1.5;
  const totalHeight = lines.length * lineHeight;
  let textY = y + padding + fontSize;

  if (valign === "middle") {
    textY = y + (height - totalHeight) / 2 + fontSize;
  }

  const textX =
    align === "center"
      ? x + width / 2
      : align === "right"
        ? x + width - padding
        : x + padding;

  doc.text(lines, textX, textY, { align });
};

const drawLabeledRow = (
  doc,
  label,
  value,
  x,
  y,
  labelWidth,
  valueWidth,
  rowHeight,
) => {
  doc.rect(x, y, labelWidth, rowHeight);
  doc.rect(x + labelWidth, y, valueWidth, rowHeight);
  drawTextInBox(doc, label, x, y, labelWidth, rowHeight, {
    bold: true,
    fontSize: 8,
    padding: 2,
  });
  drawTextInBox(doc, value, x + labelWidth, y, valueWidth, rowHeight, {
    fontSize: 8,
    padding: 3,
  });
};

const drawMaintenanceReportHeader = (
  doc,
  record,
  aircraftData,
  logoDataUrl,
) => {
  const marginX = 28;
  const pageWidth = doc.internal.pageSize.getWidth();
  const contentWidth = pageWidth - marginX * 2;
  const topY = 26;
  const metadataY = 42;
  const rowHeight = 15;
  const leftWidth = 156;
  const rightWidth = 142;
  const centerWidth = contentWidth - leftWidth - rightWidth;
  const centerX = marginX + leftWidth;
  const rightX = centerX + centerWidth;
  const labelWidth = 61;
  const rightLabelWidth = 76;
  const serialNumber =
    aircraftData?.serialNumber ||
    String(record?.aircraft || "").replace(/[^\d]/g, "") ||
    "";
  const ref = aircraftData?.referenceData || {};

  doc.setDrawColor(25, 25, 25);
  doc.setLineWidth(0.9);
  doc.rect(marginX, topY, contentWidth, 150);
  doc.rect(marginX, topY, contentWidth, 16);

  const leftRows = [
    ["ACFT TYPE:", aircraftData?.aircraftType || "AS350 B3"],
    ["ACFT REG:", record?.aircraft || ""],
    ["ACFT S/N:", serialNumber],
    ["W.O. #:", record?.sourceTaskId || record?.id || record?._id || ""],
  ];

  const rightRows = [
    ["AIRCRAFT TT:", ref.acftTT ?? ""],
    ["LANDING CYC:", ref.landings ?? ""],
    ["ENGINE: TT:", ref.engTT ?? ref.acftTT ?? ""],
    ["ENGINE CYC:", ref.n2Cycles ? `N2: ${ref.n2Cycles}` : ""],
  ];

  leftRows.forEach(([label, value], index) => {
    drawLabeledRow(
      doc,
      label,
      value,
      marginX,
      metadataY + index * rowHeight,
      labelWidth,
      leftWidth - labelWidth,
      rowHeight,
    );
  });

  doc.rect(centerX, metadataY, centerWidth, rowHeight * 4);
  if (logoDataUrl) {
    doc.addImage(
      logoDataUrl,
      "PNG",
      centerX + 10,
      metadataY + 4,
      centerWidth - 20,
      38,
    );
  } else {
    doc.setFont("helvetica", "bold");
    doc.setFontSize(32);
    doc.setTextColor(4, 100, 64);
    doc.text("NGCP", centerX + centerWidth / 2, metadataY + 34, {
      align: "center",
    });
    doc.setTextColor(0);
  }

  rightRows.forEach(([label, value], index) => {
    drawLabeledRow(
      doc,
      label,
      value,
      rightX,
      metadataY + index * rowHeight,
      rightLabelWidth,
      rightWidth - rightLabelWidth,
      rowHeight,
    );
  });

  const reportTitleY = metadataY + rowHeight * 4 + 18;
  doc.rect(marginX, reportTitleY, contentWidth, 32);
  drawTextInBox(
    doc,
    "WORK DONE REPORT /\nCERTIFICATE OF RETURN TO SERVICE",
    marginX,
    reportTitleY,
    contentWidth,
    32,
    { bold: true, fontSize: 10, align: "center" },
  );

  const descriptionY = reportTitleY + 32;
  doc.rect(marginX, descriptionY, contentWidth, 16);
  drawTextInBox(
    doc,
    "DESCRIPTION OF WORK:",
    marginX,
    descriptionY,
    contentWidth,
    16,
    {
      bold: true,
      fontSize: 9,
      padding: 2,
    },
  );

  return {
    startY: descriptionY + 16,
    marginX,
    contentWidth,
    numberColumnWidth: 50,
  };
};

export default function MaintenanceLog() {
  const { getAuthHeader } = useContext(AuthContext);
  const [allEntries, setAllEntries] = useState([]);
  const [searchValue, setSearchValue] = useState("");
  const [loading, setLoading] = useState(true);
  const [viewLevel, setViewLevel] = useState("dashboard");
  const [selectedAircraft, setSelectedAircraft] = useState(null);
  const [selectedWO, setSelectedWO] = useState(null);
  const [exporting, setExporting] = useState(false);
  const [popup, setPopup] = useState({
    open: false,
    status: "success",
    title: "",
    subTitle: "",
  });
  const [seenLogIds, setSeenLogIds] = useState(() => {
    try {
      const stored = JSON.parse(
        localStorage.getItem(SEEN_MAINTENANCE_LOG_IDS_KEY) || "[]",
      );
      return new Set(Array.isArray(stored) ? stored : []);
    } catch {
      return new Set();
    }
  });
  const pageScrollStyle = {
    padding: "16px 16px 24px",
    height: "calc(100vh - 64px)",
    overflowY: "auto",
    overflowX: "hidden",
  };
  const contentWrapStyle = {
    maxWidth: "100%",
    margin: "0 auto",
  };
  const persistSeenLogIds = (nextSet) => {
    setSeenLogIds(nextSet);
    localStorage.setItem(
      SEEN_MAINTENANCE_LOG_IDS_KEY,
      JSON.stringify(Array.from(nextSet)),
    );
  };
  const getLogStableId = (entry) =>
    String(entry?.sourceTaskId || entry?.id || entry?._id || "");
  const buildNewBadge = () => (
    <span
      style={{
        marginLeft: 8,
        display: "inline-flex",
        alignItems: "center",
        borderRadius: 999,
        padding: "1px 8px",
        fontSize: 10,
        fontWeight: 700,
        color: "#8a3f00",
        background: "#fff3e0",
        border: "1px solid #ffd8a8",
        letterSpacing: 0.4,
      }}
    >
      NEW
    </span>
  );

  useEffect(() => {
    const fetchMaintenanceLogs = async () => {
      try {
        setLoading(true);
        const authHeader = await getAuthHeader();
        const response = await fetch(
          `${API_BASE}/api/maintenance-logs/getAllMaintenanceLog`,
          {
            headers: authHeader,
          },
        );

        if (!response.ok) {
          throw new Error(
            `Failed to fetch maintenance logs (${response.status})`,
          );
        }

        const payload = await response.json();
        const normalized = (payload?.data || []).map((entry) => {
          const workDetails =
            Array.isArray(entry.workDetails) && entry.workDetails.length > 0
              ? entry.workDetails
              : [
                  entry.correctiveActionDone
                    ? { description: entry.correctiveActionDone }
                    : null,
                  entry.defects ? { description: entry.defects } : null,
                  entry.taskTitle
                    ? { description: `Reference task: ${entry.taskTitle}` }
                    : null,
                ].filter(Boolean);

          return {
            ...entry,
            id: entry.sourceTaskId || entry._id,
            type: "Task Assignment",
            sn: String(entry.aircraft || "").replace(/[^\d]/g, "") || "N/A",
            dateDefectRectified: entry.dateDefectRectified,
            workDetails,
          };
        });

        setAllEntries(normalized);
      } catch (error) {
        console.error("Failed to fetch maintenance logs:", error);
        setAllEntries([]);
      } finally {
        setLoading(false);
      }
    };

    fetchMaintenanceLogs();
  }, [getAuthHeader]);

  const formatDisplayDate = (value) => {
    if (!value) return "N/A";
    const parsed = new Date(value);
    if (Number.isNaN(parsed.getTime())) return "N/A";
    return parsed.toLocaleDateString("en-US", {
      month: "2-digit",
      day: "2-digit",
      year: "numeric",
    });
  };

  const filteredEntries = useMemo(() => {
    const needle = searchValue.trim().toLowerCase();
    if (!needle) {
      return allEntries;
    }

    return allEntries.filter((entry) =>
      [
        entry.aircraft,
        entry.taskTitle,
        entry.defects,
        entry.correctiveActionDone,
        entry.reportedBy,
      ]
        .filter(Boolean)
        .some((value) => String(value).toLowerCase().includes(needle)),
    );
  }, [allEntries, searchValue]);

  const uniqueAircraft = useMemo(
    () => [
      ...new Set(
        filteredEntries.map((entry) => entry.aircraft).filter(Boolean),
      ),
    ],
    [filteredEntries],
  );

  const navigateToAircraft = (aircraftReg) => {
    const entries = filteredEntries.filter(
      (entry) => entry.aircraft === aircraftReg,
    );
    if (entries.length === 0) return;
    const nextSeen = new Set(seenLogIds);
    entries.forEach((entry) => {
      const stableId = getLogStableId(entry);
      if (stableId) nextSeen.add(stableId);
    });
    persistSeenLogIds(nextSeen);

    setSelectedAircraft({
      ...entries[0],
      entries,
    });
    setViewLevel("aircraft");
  };

  const navigateToReport = (record) => {
    const stableId = getLogStableId(record);
    if (stableId && !seenLogIds.has(stableId)) {
      const nextSeen = new Set(seenLogIds);
      nextSeen.add(stableId);
      persistSeenLogIds(nextSeen);
    }
    setSelectedWO(record);
    setViewLevel("report");
  };

  const goBack = () => {
    if (viewLevel === "report") setViewLevel("aircraft");
    else if (viewLevel === "aircraft") setViewLevel("dashboard");
  };

  const renderReadOnlyField = (label, value, isTag = false) => {
    if (isTag) {
      return (
        <Space.Compact style={{ width: "100%" }}>
          <span
            style={{
              minWidth: 120,
              padding: "0 11px",
            }}
          >
            {label}
          </span>
          {renderStatusTag(value)}
        </Space.Compact>
      );
    }

    return (
      <Space.Compact style={{ width: "100%" }}>
        <span
          style={{
            minWidth: 120,
            padding: "0 11px",
          }}
        >
          {label}
        </span>
        <Input value={value || ""} readOnly />
      </Space.Compact>
    );
  };
  const fetchAircraftExportData = async (aircraft) => {
    if (!aircraft) return null;

    try {
      const authHeader = await getAuthHeader();
      const response = await fetch(
        `${API_BASE}/api/parts-monitoring/${encodeURIComponent(aircraft)}`,
        { headers: authHeader },
      );
      const payload = await response.json();
      return response.ok ? payload?.data || null : null;
    } catch (error) {
      console.warn("Unable to load aircraft export details:", error);
      return null;
    }
  };

  const handleExport = async () => {
    if (!selectedWO) return;

    try {
      setExporting(true);
      const [aircraftData, logoDataUrl] = await Promise.all([
        fetchAircraftExportData(selectedWO.aircraft),
        loadImageDataUrl(NGCP_LOGO_PATH).catch((error) => {
          console.warn(error);
          return null;
        }),
      ]);

      const doc = new jsPDF("p", "pt", "a4");
      const fileName = buildSafeFileName(
        `MaintenanceLog-${selectedWO?.sourceTaskId || selectedWO?.id || selectedWO?._id || "record"}`,
      );
      const bodyRows = (
        Array.isArray(selectedWO.workDetails) &&
        selectedWO.workDetails.length > 0
          ? selectedWO.workDetails
          : [
              {
                description:
                  selectedWO.correctiveActionDone || selectedWO.defects || "",
              },
            ]
      )
        .map((item) => formatPdfValue(item?.description || item, "").trim())
        .filter(Boolean)
        .map((description, index) => ["", `${index + 1}. ${description}`]);

      const drawPageHeader = () =>
        drawMaintenanceReportHeader(doc, selectedWO, aircraftData, logoDataUrl);

      const header = drawPageHeader();

      autoTable(doc, {
        startY: header.startY,
        body: bodyRows.length ? bodyRows : [["", ""]],
        theme: "grid",
        margin: {
          left: header.marginX,
          right: header.marginX,
          top: header.startY,
        },
        tableWidth: header.contentWidth,
        showHead: "never",
        styles: {
          font: "helvetica",
          fontSize: 7.5,
          cellPadding: 3,
          lineColor: [25, 25, 25],
          lineWidth: 0.75,
          textColor: [20, 20, 20],
          overflow: "linebreak",
          valign: "middle",
          minCellHeight: 16,
        },
        columnStyles: {
          0: { cellWidth: header.numberColumnWidth },
          1: { cellWidth: header.contentWidth - header.numberColumnWidth },
        },
        didDrawPage: (data) => {
          if (data.pageNumber > 1) {
            const pageHeader = drawPageHeader();
            data.settings.margin.top = pageHeader.startY;
          }
        },
      });

      doc.save(`${fileName}.pdf`);
      setPopup({
        open: true,
        status: "success",
        title: "Maintenance Log Exported!",
        subTitle: "The maintenance log PDF has been exported successfully.",
      });
    } catch (error) {
      console.error("Failed to export maintenance log:", error);
      setPopup({
        open: true,
        status: "error",
        title: "Operation failed!",
        subTitle: error.message || "Maintenance log PDF export failed.",
      });
    } finally {
      setExporting(false);
    }
  };

  if (viewLevel === "dashboard") {
    return (
      <div style={pageScrollStyle}>
        <div style={contentWrapStyle}>
          <Card
            style={{ marginBottom: 14, borderRadius: 12 }}
            styles={{ body: { padding: 16 } }}
          >
            <Row gutter={[12, 12]} align="middle" justify="space-between">
              <Col xs={24} md={10}>
                <Space orientation="vertical" size={2}>
                  <Text type="secondary" style={{ letterSpacing: 0.3 }}>
                    MAINTENANCE LOGBOOK
                  </Text>
                  <Title level={4} style={{ margin: 0 }}>
                    Aircraft Maintenance Logs
                  </Title>
                </Space>
              </Col>
              <Col xs={24} md={10}>
                <Input
                  size="large"
                  placeholder="Search aircraft, task title, defects, or reporter..."
                  prefix={<SearchOutlined />}
                  allowClear
                  value={searchValue}
                  onChange={(event) => setSearchValue(event.target.value)}
                />
              </Col>
              <Col xs={24} md={4}>
                <div
                  style={{
                    border: "1px solid #e6f2ed",
                    background: "#f7fcfa",
                    borderRadius: 10,
                    padding: "8px 10px",
                    textAlign: "center",
                  }}
                >
                  <Text type="secondary" style={{ fontSize: 12 }}>
                    Aircraft
                  </Text>
                  <div
                    style={{ fontWeight: 700, color: "#1f5f49", fontSize: 18 }}
                  >
                    {uniqueAircraft.length}
                  </div>
                </div>
              </Col>
            </Row>
          </Card>

          <Row gutter={[16, 16]}>
            {!loading && uniqueAircraft.length === 0 && (
              <Col span={24}>
                <Card style={{ borderRadius: 12 }}>
                  <Text type="secondary">
                    No maintenance logs found yet. Completed task-assignment
                    records will appear here automatically.
                  </Text>
                </Card>
              </Col>
            )}

            {uniqueAircraft.map((reg) => {
              const entriesForAircraft = filteredEntries.filter(
                (entry) => entry.aircraft === reg,
              );
              const sample = entriesForAircraft[0];
              const newCount = entriesForAircraft.filter((entry) => {
                const stableId = getLogStableId(entry);
                return stableId && !seenLogIds.has(stableId);
              }).length;

              return (
                <Col xs={24} sm={12} md={8} lg={6} key={reg}>
                  <Card
                    hoverable
                    onClick={() => navigateToAircraft(reg)}
                    styles={{ body: { padding: 0 } }}
                    style={{ borderRadius: 12, overflow: "hidden" }}
                  >
                    <div style={{ display: "flex", minHeight: 120 }}>
                      <div style={{ width: 7, background: BRAND }} />
                      <div style={{ padding: 16, flex: 1 }}>
                        <Title
                          level={5}
                          style={{
                            margin: "0 0 8px",
                            display: "flex",
                            alignItems: "center",
                            gap: 8,
                          }}
                        >
                          <span>{reg}</span>
                          {newCount > 0 ? buildNewBadge() : null}
                        </Title>
                        <Text type="secondary">
                          SOURCE: {sample?.type || "Task Assignment"}
                        </Text>
                        <br />
                        <Text type="secondary">
                          ENTRIES: {entriesForAircraft.length}
                        </Text>
                        {newCount > 0 ? (
                          <>
                            <br />
                            <Text style={{ color: "#d46b08", fontWeight: 600 }}>
                              {newCount} new work done
                            </Text>
                          </>
                        ) : null}
                      </div>
                    </div>
                  </Card>
                </Col>
              );
            })}
          </Row>
          <Row gutter={[10, 10]} style={{ marginTop: 8, marginBottom: 16 }}>
            <Col span={24} style={{ textAlign: "right" }}>
              <Text type="secondary">
                Showing <Text strong>{uniqueAircraft.length}</Text> aircraft/s
              </Text>
            </Col>
          </Row>
        </div>
      </div>
    );
  }

  if (viewLevel === "aircraft") {
    return (
      <div style={pageScrollStyle}>
        <div style={contentWrapStyle}>
          <Button
            icon={<ArrowLeftOutlined />}
            type="text"
            onClick={goBack}
            style={{ marginBottom: 12, paddingInline: 0 }}
          >
            Back to Aircraft Logs
          </Button>

          <Row gutter={[16, 16]}>
            <Col xs={24} lg={14}>
              <Card
                style={{
                  borderRadius: 14,
                  overflow: "hidden",
                  border: "1px solid #e8f0ec",
                }}
                styles={{ body: { padding: 0 } }}
              >
                <div
                  style={{
                    padding: "18px 20px",
                    background:
                      "linear-gradient(135deg, #1f5f49 0%, #26866f 55%, #52a18b 100%)",
                    color: "#fff",
                  }}
                >
                  <Text
                    style={{
                      color: "rgba(255,255,255,0.85)",
                      fontSize: 12,
                      letterSpacing: 0.6,
                    }}
                  >
                    MAINTENANCE SNAPSHOT
                  </Text>
                  <Title
                    level={3}
                    style={{ margin: "4px 0 2px", color: "#fff" }}
                  >
                    {selectedAircraft?.aircraft || "N/A"}
                  </Title>
                  <Text style={{ color: "rgba(255,255,255,0.88)" }}>
                    Completed task records synced to maintenance logs
                  </Text>
                </div>

                <div style={{ padding: 18 }}>
                  <Row gutter={[12, 12]}>
                    {[
                      {
                        label: "Reported By",
                        value: selectedAircraft?.reportedBy || "N/A",
                      },
                      {
                        label: "Status",
                        value: selectedAircraft?.status || "N/A",
                      },
                      {
                        label: "ACFT S/N",
                        value: selectedAircraft?.sn || "N/A",
                      },
                      {
                        label: "Work Orders",
                        value: String(selectedAircraft?.entries?.length || 0),
                      },
                    ].map((item) => (
                      <Col xs={24} sm={12} key={item.label}>
                        <div
                          style={{
                            border: "1px solid #edf3f0",
                            background: "#fbfdfc",
                            borderRadius: 10,
                            padding: "10px 12px",
                            minHeight: 72,
                            display: "flex",
                            flexDirection: "column",
                            justifyContent: "center",
                          }}
                        >
                          <Text
                            style={{
                              fontSize: 12,
                              textTransform: "uppercase",
                              letterSpacing: 0.4,
                              color: "#5a7268",
                            }}
                          >
                            {item.label}
                          </Text>
                          <Text
                            strong
                            style={{
                              fontSize: 16,
                              marginTop: 2,
                              color: "#1b3d2f",
                              wordBreak: "break-word",
                            }}
                          >
                            {item.label === "Status"
                              ? renderStatusTag(item.value)
                              : item.value}
                          </Text>
                        </div>
                      </Col>
                    ))}
                  </Row>
                </div>
              </Card>
            </Col>

            <Col xs={24} lg={10}>
              <Card
                title={
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between",
                      gap: 8,
                    }}
                  >
                    <Text strong style={{ color: "#1b3d2f" }}>
                      Work Orders
                    </Text>
                    <span
                      style={{
                        display: "inline-flex",
                        alignItems: "center",
                        justifyContent: "center",
                        minWidth: 28,
                        height: 24,
                        padding: "0 8px",
                        borderRadius: 999,
                        background: "#e6f4ef",
                        color: "#1f5f49",
                        fontWeight: 700,
                        fontSize: 12,
                      }}
                    >
                      {selectedAircraft?.entries?.length || 0}
                    </span>
                  </div>
                }
                style={{
                  borderRadius: 14,
                  overflow: "hidden",
                  border: "1px solid #e8f0ec",
                }}
                styles={{
                  body: { padding: 0 },
                  header: { borderBottom: "1px solid #edf3f0" },
                }}
              >
                <div>
                  <MLogTable
                    headers={[
                      { title: "W.O. #", key: "id", width: "20%" },
                      {
                        title: "DATE",
                        key: "dateDefectRectified",
                        width: "30%",
                      },
                    ]}
                    data={(selectedAircraft?.entries || []).map((entry) => ({
                      ...entry,
                      id: (
                        <span
                          style={{
                            display: "inline-flex",
                            alignItems: "center",
                          }}
                        >
                          {entry.id || "N/A"}
                          {!seenLogIds.has(getLogStableId(entry))
                            ? buildNewBadge()
                            : null}
                        </span>
                      ),
                      dateDefectRectified: formatDisplayDate(
                        entry.dateDefectRectified,
                      ),
                    }))}
                    onRowClick={navigateToReport}
                    isSimple={true}
                  />
                </div>
              </Card>
            </Col>
          </Row>
        </div>
      </div>
    );
  }

  if (viewLevel === "report") {
    return (
      <div style={pageScrollStyle}>
        <div style={contentWrapStyle}>
          <Row
            justify="space-between"
            align="middle"
            style={{ marginBottom: 12 }}
          >
            <Col>
              <Button icon={<ArrowLeftOutlined />} type="text" onClick={goBack}>
                Back
              </Button>
            </Col>
            <Col>
              <Button
                icon={<ExportOutlined />}
                type="primary"
                style={{ backgroundColor: BRAND, border: "none" }}
                onClick={handleExport}
                loading={exporting}
              >
                Export
              </Button>
            </Col>
          </Row>

          <Card style={{ marginBottom: 15, borderRadius: 12 }}>
            <Row gutter={[16, 12]}>
              <Col xs={24} md={12}>
                {renderReadOnlyField("Aircraft:", selectedWO?.aircraft)}
              </Col>

              <Col xs={24} md={12}>
                {renderReadOnlyField(
                  "Task ID:",
                  selectedWO?.sourceTaskId || selectedWO?.id,
                )}
              </Col>

              <Col xs={24} md={12}>
                {renderReadOnlyField("Reported By:", selectedWO?.reportedBy)}
              </Col>

              <Col xs={24} md={12}>
                {renderReadOnlyField("Task Title:", selectedWO?.taskTitle)}
              </Col>

              <Col xs={24} md={12}>
                {renderReadOnlyField(
                  "Rectified:",
                  formatDisplayDate(selectedWO?.dateDefectRectified),
                )}
              </Col>

              {/* Bottom row */}
              <Col xs={24} md={12}>
                <Space.Compact style={{ width: "100%" }}>
                  <span
                    style={{
                      minWidth: 120,
                      padding: "0 11px",
                    }}
                  >
                    Task Status:
                  </span>

                  {renderStatusTag(selectedWO?.sourceTaskStatus)}
                </Space.Compact>
              </Col>

              <Col xs={24} md={12}>
                <Space.Compact style={{ width: "100%" }}>
                  <span
                    style={{
                      minWidth: 120,
                      padding: "0 11px",
                    }}
                  >
                    Log Status:
                  </span>

                  {renderStatusTag(selectedWO?.status)}
                </Space.Compact>
              </Col>
            </Row>
          </Card>
          <Card
            title="WORK DONE REPORT/CERTIFICATE OF RETURN TO SERVICE"
            style={{ borderRadius: 12 }}
            styles={{
              header: {
                background: BRAND,
                color: "#fff",
                fontWeight: 700,
              },
            }}
          >
            <MLogTable
              headers={[{ title: "DESCRIPTION OF WORK", key: "description" }]}
              data={selectedWO?.workDetails || []}
              isSimple={true}
              isWorkReport={true}
            />
          </Card>
        </div>
        <ResultPopup
          open={popup.open}
          status={popup.status}
          title={popup.title}
          subTitle={popup.subTitle}
          onClose={() => setPopup((prev) => ({ ...prev, open: false }))}
        />
      </div>
    );
  }

  return null;
}
