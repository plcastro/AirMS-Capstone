import React, { useContext, useEffect, useMemo, useState } from "react";
import { Input, Row, Col, Card, Button, Typography, Space } from "antd";
import {
  SearchOutlined,
  ArrowLeftOutlined,
  ExportOutlined,
} from "@ant-design/icons";
import MLogTable from "../../../components/tables/MLogTable";
import { API_BASE } from "../../../utils/API_BASE";
import { AuthContext } from "../../../context/AuthContext";
import { exportRecordToPDF } from "../../../components/common/ExportFile";

const { Title, Text } = Typography;

export default function MaintenanceLog() {
  const { getAuthHeader } = useContext(AuthContext);
  const [allEntries, setAllEntries] = useState([]);
  const [searchValue, setSearchValue] = useState("");
  const [loading, setLoading] = useState(true);
  const [viewLevel, setViewLevel] = useState("dashboard");
  const [selectedAircraft, setSelectedAircraft] = useState(null);
  const [selectedWO, setSelectedWO] = useState(null);

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

    setSelectedAircraft({
      ...entries[0],
      entries,
    });
    setViewLevel("aircraft");
  };

  const navigateToReport = (record) => {
    setSelectedWO(record);
    setViewLevel("report");
  };

  const goBack = () => {
    if (viewLevel === "report") setViewLevel("aircraft");
    else if (viewLevel === "aircraft") setViewLevel("dashboard");
  };

  const renderReadOnlyField = (label, value) => (
    <Space.Compact style={{ width: "100%" }}>
      <span
        style={{
          minWidth: 120,
          padding: "0 11px",
          border: "1px solid #d9d9d9",
          borderRight: 0,
          borderRadius: "6px 0 0 6px",
          background: "#fafafa",
          lineHeight: "30px",
          whiteSpace: "nowrap",
        }}
      >
        {label}
      </span>
      <Input
        value={value || ""}
        readOnly
        style={{ borderRadius: "0 6px 6px 0" }}
      />
    </Space.Compact>
  );

  const handleExport = async () => {
    await exportRecordToPDF({
      title: "Maintenance Log",
      fileName: `MaintenanceLog-${selectedWO?.sourceTaskId || selectedWO?._id || "record"}`,
      subtitle: `Aircraft: ${selectedWO?.aircraft || "N/A"} | Task: ${selectedWO?.sourceTaskId || selectedWO?.id || "N/A"}`,
      record: selectedWO,
    });
  };

  if (viewLevel === "dashboard") {
    return (
      <div style={{ padding: 20 }}>
        <Row gutter={[12, 12]} align="middle" style={{ marginBottom: 18 }}>
          <Col xs={24} md={10}>
            <Input
              size="large"
              placeholder="Search maintenance logs..."
              prefix={<SearchOutlined />}
              allowClear
              value={searchValue}
              onChange={(event) => setSearchValue(event.target.value)}
            />
          </Col>
          <Col xs={24} md={14} style={{ textAlign: "right" }}>
            <Text type="secondary">
              Showing <Text strong>{uniqueAircraft.length}</Text> aircraft
            </Text>
          </Col>
        </Row>

        <Title level={4} style={{ marginBottom: 14 }}>
          Maintenance Remarks
        </Title>

        <Row gutter={[16, 16]}>
          {!loading && uniqueAircraft.length === 0 && (
            <Col span={24}>
              <Card>
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

            return (
              <Col xs={24} md={12} key={reg}>
                <Card
                  hoverable
                  onClick={() => navigateToAircraft(reg)}
                  styles={{ body: { padding: 0 } }}
                  style={{ borderRadius: 12, overflow: "hidden" }}
                >
                  <div style={{ display: "flex", minHeight: 120 }}>
                    <div style={{ width: 12, background: "#26866f" }} />
                    <div style={{ padding: 16, flex: 1 }}>
                      <Title level={5} style={{ margin: "0 0 8px" }}>
                        {reg}
                      </Title>
                      <Text type="secondary">
                        SOURCE: {sample?.type || "Task Assignment"}
                      </Text>
                      <br />
                      <Text type="secondary">
                        ENTRIES: {entriesForAircraft.length}
                      </Text>
                    </div>
                  </div>
                </Card>
              </Col>
            );
          })}
        </Row>
      </div>
    );
  }

  if (viewLevel === "aircraft") {
    return (
      <div style={{ padding: 20 }}>
        <Button
          icon={<ArrowLeftOutlined />}
          type="text"
          onClick={goBack}
          style={{ marginBottom: 16 }}
        >
          Back
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
                <Title level={3} style={{ margin: "4px 0 2px", color: "#fff" }}>
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
                          {item.value}
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
              <div style={{ maxHeight: 430, overflowY: "auto" }}>
                <MLogTable
                  headers={[
                    { title: "W.O. #", key: "id", width: "20%" },
                    { title: "DATE", key: "dateDefectRectified", width: "30%" },
                  ]}
                  data={(selectedAircraft?.entries || []).map((entry) => ({
                    ...entry,
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
    );
  }

  if (viewLevel === "report") {
    return (
      <div style={{ padding: 20 }}>
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
              style={{ backgroundColor: "#26866f", border: "none" }}
              onClick={handleExport}
            >
              Export
            </Button>
          </Col>
        </Row>

        <Card style={{ marginBottom: 15 }}>
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
              {renderReadOnlyField(
                "Task Status:",
                selectedWO?.sourceTaskStatus,
              )}
            </Col>
            <Col xs={24} md={12}>
              {renderReadOnlyField("Log Status:", selectedWO?.status)}
            </Col>
            <Col xs={24} md={12}>
              {renderReadOnlyField(
                "Rectified:",
                formatDisplayDate(selectedWO?.dateDefectRectified),
              )}
            </Col>
            <Col xs={24} md={12}>
              {renderReadOnlyField("Task Title:", selectedWO?.taskTitle)}
            </Col>
          </Row>
        </Card>
        <div style={{ minHeight: "100vh", overflowY: "auto" }}>
          <Card
            title="WORK DONE REPORT/CERTIFICATE OF RETURN TO SERVICE"
            styles={{
              header: {
                background: "#26866f",
                color: "#fff",
                fontWeight: 700,
              },
            }}
          >
            <div style={{ maxHeight: 420, overflowY: "auto", paddingRight: 4 }}>
              <MLogTable
                headers={[{ title: "DESCRIPTION OF WORK", key: "description" }]}
                data={selectedWO?.workDetails || []}
                isSimple={true}
                isWorkReport={true}
              />
            </div>
          </Card>
        </div>
      </div>
    );
  }

  return null;
}
