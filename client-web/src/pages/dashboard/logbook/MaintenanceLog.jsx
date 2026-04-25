import React, { useContext, useEffect, useMemo, useState } from "react";
import { Input, Row, Col, Card, Button, Typography, Modal, message } from "antd";
import {
  SearchOutlined,
  ArrowLeftOutlined,
  PrinterOutlined,
} from "@ant-design/icons";
import MLogTable from "../../../components/tables/MLogTable";
import { API_BASE } from "../../../utils/API_BASE";
import { AuthContext } from "../../../context/AuthContext";

const { Title, Text } = Typography;

export default function MaintenanceLog() {
  const { getAuthHeader } = useContext(AuthContext);
  const [allEntries, setAllEntries] = useState([]);
  const [searchValue, setSearchValue] = useState("");
  const [loading, setLoading] = useState(true);
  const [viewLevel, setViewLevel] = useState("dashboard"); // dashboard, aircraft, or report
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
          throw new Error(`Failed to fetch maintenance logs (${response.status})`);
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
      [entry.aircraft, entry.taskTitle, entry.defects, entry.correctiveActionDone, entry.reportedBy]
        .filter(Boolean)
        .some((value) => String(value).toLowerCase().includes(needle)),
    );
  }, [allEntries, searchValue]);

  const navigateToAircraft = (reg) => {
    const aircraftData = filteredEntries.find((e) => e.aircraft === reg);
    const relatedEntries = filteredEntries.filter((e) => e.aircraft === reg);
    setSelectedAircraft({ ...aircraftData, entries: relatedEntries });
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

  const normalizeWorkDetails = (details = []) =>
    details.map((item) => ({
      description: String(item?.description || "").trim(),
    }));

  const workDetailsChanged = useMemo(() => {
    if (!selectedWO || selectedWO.workDetailsLocked) {
      return false;
    }

    return (
      JSON.stringify(normalizeWorkDetails(editableWorkDetails)) !==
      JSON.stringify(normalizeWorkDetails(selectedWO.workDetails || []))
    );
  }, [editableWorkDetails, selectedWO]);

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

  const saveWorkDetails = async () => {
    if (!selectedWO?._id) {
      message.error("Maintenance log ID is missing");
      return;
    }

    Modal.confirm({
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
            sn: String(payload.data.aircraft || "").replace(/[^\d]/g, "") || "N/A",
          };

          setAllEntries((prev) =>
            prev.map((entry) =>
              entry._id === updatedLog._id ? { ...entry, ...updatedLog } : entry,
            ),
          );
          setSelectedAircraft((prev) =>
            prev
              ? {
                  ...prev,
                  entries: (prev.entries || []).map((entry) =>
                    entry._id === updatedLog._id ? { ...entry, ...updatedLog } : entry,
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

  // --- VIEW 1: DASHBOARD (2 Cards Per Row) ---
  if (viewLevel === "dashboard") {
    const uniqueAircraft = [...new Set(filteredEntries.map((e) => e.aircraft))];
    return (
      <div style={{ padding: "40px 20px" }}>
        <div
          style={{
            display: "flex",
            justifyContent: "center",
            marginBottom: 40,
          }}
        >
          <Input
            placeholder="Search defect..."
            prefix={<SearchOutlined />}
            style={{ width: "50%", borderRadius: 10 }}
            value={searchValue}
            onChange={(event) => setSearchValue(event.target.value)}
          />
        </div>
        <div style={{ maxWidth: 1000, margin: "0 auto" }}>
          <Title level={3} style={{ marginBottom: 20 }}>
            REMARKS
          </Title>
          <Row gutter={[16, 16]}>
            {!loading && uniqueAircraft.length === 0 && (
              <Col span={24}>
                <Card>
                  <Text type="secondary">
                    No maintenance logs found yet. Completed task-assignment records
                    will appear here automatically.
                  </Text>
                </Card>
              </Col>
            )}
            {uniqueAircraft.map((reg) => (
              <Col span={12} key={reg}>
                <Card
                  hoverable
                  onClick={() => navigateToAircraft(reg)}
                  styles={{ body: { display: "flex", padding: 0 } }}
                >
                  <div
                    style={{
                      width: 140,
                      background: "#d7efe7",
                      borderRadius: "4px 0 0 4px",
                    }}
                  />
                  <div style={{ padding: 15 }}>
                    <Title level={5} style={{ margin: 0 }}>
                      {reg}
                    </Title>
                    <Text type="secondary">SOURCE: Task Assignment</Text>
                    <br />
                    <Text type="secondary">
                      ENTRIES: {filteredEntries.filter((entry) => entry.aircraft === reg).length}
                    </Text>
                  </div>
                </Card>
              </Col>
            ))}
          </Row>
        </div>
      </div>
    );
  }

  // --- VIEW 2: AIRCRAFT DETAILS (Split View) ---
  if (viewLevel === "aircraft") {
    return (
      <div style={{ padding: "20px" }}>
        <Button
          icon={<ArrowLeftOutlined />}
          type="text"
          onClick={goBack}
          style={{ marginBottom: 20 }}
        />
        <Row gutter={24} style={{ maxWidth: 1200, margin: "0 auto" }}>
          <Col span={14}>
            <Card styles={{ body: { display: "flex", padding: 0 } }}>
              <div style={{ width: 250, background: "#d1c4e9" }} />
              <div style={{ padding: "20px" }}>
                <Title level={3}>{selectedAircraft?.aircraft}</Title>
                <Text type="secondary">Completed task records synced to maintenance logs</Text>
                <Row style={{ marginTop: 25 }} gutter={[0, 12]}>
                  <Col span={12}>
                    <Text strong>REPORTED BY:</Text> {selectedAircraft?.reportedBy || "N/A"}
                  </Col>
                  <Col span={12}>
                    <Text strong>STATUS:</Text> {selectedAircraft?.status || "N/A"}
                  </Col>
                </Row>
              </div>
            </Card>
          </Col>
          <Col span={10}>
            <MLogTable
              headers={[
                { title: "W.O. #", key: "id" },
                { title: "DATE", key: "dateDefectRectified" },
              ]}
              data={(selectedAircraft?.entries || []).map((entry) => ({
                ...entry,
                dateDefectRectified: formatDisplayDate(entry.dateDefectRectified),
              }))}
              onRowClick={navigateToReport}
              isSimple={true}
            />
          </Col>
        </Row>
      </div>
    );
  }

  // --- VIEW 3: WORK REPORT (Blank Fields + Grid Table) ---
  if (viewLevel === "report") {
    return (
      <div
        style={{
          padding: "20px",
          height: "calc(100vh - 64px)",
          overflowY: "auto",
          overflowX: "hidden",
        }}
      >
        <Button
          icon={<ArrowLeftOutlined />}
          type="text"
          onClick={goBack}
          style={{ marginBottom: 10 }}
        />
        <div style={{ maxWidth: 950, margin: "0 auto" }}>
          <div
            style={{
              display: "flex",
              justifyContent: "flex-end",
              marginBottom: 10,
            }}
          >
            <Button
              icon={<PrinterOutlined />}
              type="primary"
              style={{ backgroundColor: "#26866f", border: "none" }}
            >
              Print
            </Button>
          </div>
          <Card style={{ marginBottom: 15 }}>
            <Row gutter={[16, 12]}>
              <Col span={12}>
                <Input addonBefore="Aircraft:" value={selectedWO?.aircraft || ""} readOnly />
              </Col>
              <Col span={12}>
                <Input addonBefore="Task ID:" value={selectedWO?.sourceTaskId || selectedWO?.id || ""} readOnly />
              </Col>
              <Col span={12}>
                <Input addonBefore="Reported By:" value={selectedWO?.reportedBy || ""} readOnly />
              </Col>
              <Col span={12}>
                <Input addonBefore="Task Status:" value={selectedWO?.sourceTaskStatus || ""} readOnly />
              </Col>
              <Col span={12}>
                <Input addonBefore="Log Status:" value={selectedWO?.status || ""} readOnly />
              </Col>
              <Col span={12}>
                <Input
                  addonBefore="Rectified:"
                  value={formatDisplayDate(selectedWO?.dateDefectRectified)}
                  readOnly
                />
              </Col>
              <Col span={12}>
                <Input addonBefore="Task Title:" value={selectedWO?.taskTitle || ""} readOnly />
              </Col>
            </Row>
          </Card>
          <Title level={5} style={{ marginBottom: 10 }}>
            WORK DONE REPORT/CERTIFICATE OF RETURN TO SERVICE
          </Title>
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              gap: 12,
              marginBottom: 10,
            }}
          >
            <Text type={selectedWO?.workDetailsLocked ? "secondary" : undefined}>
              {selectedWO?.workDetailsLocked
                ? "Description of work is locked after saving."
                : "You may add or edit descriptions before saving. Rows cannot be deleted."}
            </Text>
            {!selectedWO?.workDetailsLocked && (
              <div style={{ display: "flex", gap: 8 }}>
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
              </div>
            )}
          </div>
          <div
            style={{
              border: "1px solid #d9d9d9",
              borderRadius: 4,
              overflow: "hidden",
            }}
          >
            <div
              style={{
                background: "#26866f",
                color: "white",
                padding: "10px 15px",
                fontWeight: "bold",
              }}
            >
              DESCRIPTION OF WORK
            </div>
            <div
              style={{
                maxHeight: "55vh",
                overflowY: "auto",
                overflowX: "hidden",
              }}
            >
              <MLogTable
                headers={[{ title: "", key: "description" }]}
                data={editableWorkDetails}
                isSimple={true}
                isWorkReport={true}
                isWorkReportEditable={!selectedWO?.workDetailsLocked}
                onWorkDetailChange={updateWorkDetail}
              />
            </div>
          </div>
        </div>
      </div>
    );
  }
}
