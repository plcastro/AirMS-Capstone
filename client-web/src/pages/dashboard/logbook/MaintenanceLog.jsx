import React, { useContext, useEffect, useMemo, useState } from "react";
import {
  App,
  Input,
  Row,
  Col,
  Card,
  Button,
  Typography,
  Space,
} from "antd";
import {
  SearchOutlined,
  ArrowLeftOutlined,
  PrinterOutlined,
} from "@ant-design/icons";
import MLogTable from "../../../components/tables/MLogTable";
import { API_BASE } from "../../../utils/API_BASE";
import { AuthContext } from "../../../context/AuthContext";

const { Title, Text } = Typography;

const normalizeWorkDetails = (details = []) =>
  details.map((item) => ({
    description: String(item?.description || "").trim(),
  }));

export default function MaintenanceLog() {
  const { message, modal } = App.useApp();
  const { getAuthHeader } = useContext(AuthContext);
  const [allEntries, setAllEntries] = useState([]);
  const [searchValue, setSearchValue] = useState("");
  const [loading, setLoading] = useState(true);
  const [viewLevel, setViewLevel] = useState("dashboard");
  const [selectedAircraft, setSelectedAircraft] = useState(null);
  const [selectedWO, setSelectedWO] = useState(null);
  const [editableWorkDetails, setEditableWorkDetails] = useState([]);
  const [savingWorkDetails, setSavingWorkDetails] = useState(false);

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

  const workDetailsChanged = useMemo(() => {
    if (!selectedWO || selectedWO.workDetailsLocked) {
      return false;
    }

    return (
      JSON.stringify(normalizeWorkDetails(editableWorkDetails)) !==
      JSON.stringify(normalizeWorkDetails(selectedWO.workDetails || []))
    );
  }, [editableWorkDetails, selectedWO]);

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
    setEditableWorkDetails(record.workDetails || []);
    setViewLevel("report");
  };

  const goBack = () => {
    if (viewLevel === "report") setViewLevel("aircraft");
    else if (viewLevel === "aircraft") setViewLevel("dashboard");
  };

  const updateWorkDetail = (index, description) => {
    setEditableWorkDetails((prev) =>
      prev.map((item, itemIndex) =>
        itemIndex === index ? { ...item, description } : item,
      ),
    );
  };

  const addWorkDetail = () => {
    setEditableWorkDetails((prev) => [...prev, { description: "" }]);
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

  const saveWorkDetails = async () => {
    if (!selectedWO?._id) {
      message.error("Maintenance log ID is missing");
      return;
    }

    modal.confirm({
      title: "Save description of work?",
      content:
        "Are you sure you want to save these changes? Once saved, the description of work table will be locked and cannot be edited again.",
      okText: "Save and Lock",
      cancelText: "Cancel",
      onOk: async () => {
        try {
          setSavingWorkDetails(true);
          const authHeader = await getAuthHeader();
          const response = await fetch(
            `${API_BASE}/api/maintenance-logs/updateMaintenanceLogById/${selectedWO._id}`,
            {
              method: "PUT",
              headers: {
                "Content-Type": "application/json",
                ...authHeader,
              },
              body: JSON.stringify({
                ...selectedWO,
                workDetails: normalizeWorkDetails(editableWorkDetails),
                workDetailsLocked: true,
              }),
            },
          );

          const payload = await response.json();
          if (!response.ok) {
            throw new Error(payload.message || "Failed to save work details");
          }

          const updatedLog = {
            ...payload.data,
            id: payload.data.sourceTaskId || payload.data._id,
            type: "Task Assignment",
            sn:
              String(payload.data.aircraft || "").replace(/[^\d]/g, "") ||
              "N/A",
          };

          setAllEntries((prev) =>
            prev.map((entry) =>
              entry._id === updatedLog._id
                ? { ...entry, ...updatedLog }
                : entry,
            ),
          );

          setSelectedAircraft((prev) =>
            prev
              ? {
                  ...prev,
                  entries: (prev.entries || []).map((entry) =>
                    entry._id === updatedLog._id
                      ? { ...entry, ...updatedLog }
                      : entry,
                  ),
                }
              : prev,
          );

          setSelectedWO(updatedLog);
          setEditableWorkDetails(updatedLog.workDetails || []);
          message.success("Description of work saved and locked");
        } catch (error) {
          console.error("Failed to save work details:", error);
          message.error(error.message || "Failed to save work details");
          throw error;
        } finally {
          setSavingWorkDetails(false);
        }
      },
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
            <Card>
              <Title level={3} style={{ marginBottom: 8 }}>
                {selectedAircraft?.aircraft || "N/A"}
              </Title>
              <Text type="secondary">
                Completed task records synced to maintenance logs
              </Text>

              <Row gutter={[0, 10]} style={{ marginTop: 18 }}>
                <Col span={12}>
                  <Text strong>REPORTED BY:</Text>{" "}
                  {selectedAircraft?.reportedBy || "N/A"}
                </Col>
                <Col span={12}>
                  <Text strong>STATUS:</Text>{" "}
                  {selectedAircraft?.status || "N/A"}
                </Col>
                <Col span={12}>
                  <Text strong>ACFT S/N:</Text> {selectedAircraft?.sn || "N/A"}
                </Col>
                <Col span={12}>
                  <Text strong>WORK ORDERS:</Text>{" "}
                  {selectedAircraft?.entries?.length || 0}
                </Col>
              </Row>
            </Card>
          </Col>

          <Col xs={24} lg={10}>
            <Card title="Work Orders" styles={{ body: { padding: 0 } }}>
              <MLogTable
                headers={[
                  { title: "W.O. #", key: "id" },
                  { title: "DATE", key: "dateDefectRectified" },
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
              icon={<PrinterOutlined />}
              type="primary"
              style={{ backgroundColor: "#26866f", border: "none" }}
              onClick={() => window.print()}
            >
              Print
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
              {renderReadOnlyField("Task Status:", selectedWO?.sourceTaskStatus)}
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
          <Space
            style={{
              width: "100%",
              justifyContent: "space-between",
              marginBottom: 10,
            }}
            wrap
          >
            <Text
              type={selectedWO?.workDetailsLocked ? "secondary" : undefined}
            >
              {selectedWO?.workDetailsLocked
                ? "Description of work is locked after saving."
                : "You may add or edit descriptions before saving. Rows cannot be deleted."}
            </Text>

            {!selectedWO?.workDetailsLocked && (
              <Space>
                <Button onClick={addWorkDetail}>Add Description</Button>
                {workDetailsChanged && (
                  <Button
                    type="primary"
                    loading={savingWorkDetails}
                    onClick={saveWorkDetails}
                    style={{ backgroundColor: "#26866f", border: "none" }}
                  >
                    Save Changes
                  </Button>
                )}
              </Space>
            )}
          </Space>

          <MLogTable
            headers={[{ title: "DESCRIPTION OF WORK", key: "description" }]}
            data={editableWorkDetails}
            isSimple={true}
            isWorkReport={true}
            isWorkReportEditable={!selectedWO?.workDetailsLocked}
            onWorkDetailChange={updateWorkDetail}
          />
        </Card>
      </div>
    );
  }

  return null;
}
