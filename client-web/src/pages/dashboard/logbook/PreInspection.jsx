import React, { useCallback, useContext, useEffect, useMemo, useState } from "react";
import { Button, Card, Checkbox, Col, Descriptions, Divider, Input, Modal, Row, Select, Space, Table, Tag, Typography, message } from "antd";
import { EditOutlined, PlusOutlined, SearchOutlined } from "@ant-design/icons";
import { AuthContext } from "../../../context/AuthContext";
import { API_BASE } from "../../../utils/API_BASE";
import PinVerifiedSignatureModal from "../../../components/common/PinVerifiedSignatureModal";

const { Text } = Typography;
const STATUS_OPTIONS = ["all", "pending", "released", "completed"];

const signaturePayload = (user, signature) => ({
  name: `${user?.firstName || ""} ${user?.lastName || ""}`.trim() || user?.username || "User",
  id: user?.id || user?._id || "",
  signature,
  timestamp: new Date().toISOString(),
});

export default function PreInspection() {
  const { user, getAuthHeader } = useContext(AuthContext);
  const [records, setRecords] = useState([]);
  const [loading, setLoading] = useState(false);
  const [query, setQuery] = useState("");
  const [aircraft, setAircraft] = useState("all");
  const [status, setStatus] = useState("all");
  const [editing, setEditing] = useState(null);
  const [creating, setCreating] = useState(false);
  const [draft, setDraft] = useState({ rpc: "", aircraftType: "", date: "" });
  const [signatureMode, setSignatureMode] = useState(null);

  const role = user?.jobTitle?.toLowerCase() || "";
  const readOnly = role === "officer-in-charge";
  const canCreate = role !== "pilot" && !readOnly;
  const canRelease = role === "mechanic";
  const canAccept = role === "pilot";

  const load = useCallback(async () => {
    try {
      setLoading(true);
      const response = await fetch(`${API_BASE}/api/pre-inspections/getAllPreInspection`, { headers: await getAuthHeader() });
      const data = await response.json();
      if (!response.ok) throw new Error(data.message || "Failed to load pre-inspections");
      setRecords(Array.isArray(data.data) ? data.data : []);
    } catch (error) {
      message.error(error.message || "Failed to load pre-inspections");
    } finally {
      setLoading(false);
    }
  }, [getAuthHeader]);

  useEffect(() => { load(); }, [load]);

  const aircraftOptions = useMemo(() => ["all", ...new Set(records.map((item) => item.rpc).filter(Boolean))], [records]);

  const filtered = useMemo(() => records.filter((item) => {
    const needle = query.trim().toLowerCase();
    const matchesQuery = !needle || [item.rpc, item.aircraftType, item.date].some((value) => String(value || "").toLowerCase().includes(needle));
    const matchesAircraft = aircraft === "all" || item.rpc === aircraft;
    const matchesStatus = status === "all" || String(item.status || "").toLowerCase() === status;
    return matchesQuery && matchesAircraft && matchesStatus;
  }), [records, query, aircraft, status]);

  const booleanFields = useMemo(() => Object.keys(editing || {}).filter((key) => typeof editing?.[key] === "boolean"), [editing]);

  const saveCreate = async () => {
    if (!draft.rpc || !draft.aircraftType || !draft.date) {
      message.warning("RPC, aircraft type, and date are required");
      return;
    }

    try {
      setCreating(true);
      const response = await fetch(`${API_BASE}/api/pre-inspections/createPreInspection`, {
        method: "POST",
        headers: { "Content-Type": "application/json", ...(await getAuthHeader()) },
        body: JSON.stringify({
          ...draft,
          status: "pending",
          createdBy: `${user?.firstName || ""} ${user?.lastName || ""}`.trim(),
          confirmAction: true,
        }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.message || "Failed to create pre-inspection");
      message.success("Pre-inspection created");
      setCreating(false);
      setDraft({ rpc: "", aircraftType: "", date: "" });
      await load();
    } catch (error) {
      setCreating(false);
      message.error(error.message || "Failed to create pre-inspection");
    }
  };

  const saveEdit = async (nextPayload = editing) => {
    if (!nextPayload?._id) return;
    try {
      const response = await fetch(`${API_BASE}/api/pre-inspections/updatePreInspectionById/${nextPayload._id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json", ...(await getAuthHeader()) },
        body: JSON.stringify({ ...nextPayload, confirmAction: true }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.message || "Failed to update pre-inspection");
      setEditing(data.data);
      await load();
      message.success("Pre-inspection updated");
    } catch (error) {
      message.error(error.message || "Failed to update pre-inspection");
    }
  };

  const handleSignedAction = async (signature) => {
    if (!editing) return;
    if (signatureMode === "release") {
      await saveEdit({ ...editing, status: "released", releasedBy: signaturePayload(user, signature) });
    }
    if (signatureMode === "accept") {
      await saveEdit({ ...editing, status: "completed", acceptedBy: signaturePayload(user, signature) });
    }
    setSignatureMode(null);
  };

  return (
    <div style={{ padding: 20 }}>
      <Card>
        <Row gutter={[12, 12]}>
          <Col xs={24} md={8}><Input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search" prefix={<SearchOutlined />} /></Col>
          <Col xs={24} md={6}><Select style={{ width: "100%" }} value={aircraft} onChange={setAircraft} options={aircraftOptions.map((value) => ({ value, label: value === "all" ? "All Aircraft" : `RP/C: ${value}` }))} /></Col>
          <Col xs={24} md={6}><Select style={{ width: "100%" }} value={status} onChange={setStatus} options={STATUS_OPTIONS.map((value) => ({ value, label: value === "all" ? "All Status" : value }))} /></Col>
          {canCreate && <Col xs={24} md={4}><Button type="primary" icon={<PlusOutlined />} onClick={() => setCreating(true)}>New Entry</Button></Col>}
        </Row>
      </Card>

      <Table
        style={{ marginTop: 12 }}
        rowKey="_id"
        loading={loading}
        dataSource={filtered}
        pagination={{ pageSize: 10 }}
        columns={[
          { title: "RP/C", dataIndex: "rpc" },
          { title: "Aircraft Type", dataIndex: "aircraftType" },
          { title: "Date", dataIndex: "date" },
          { title: "Status", dataIndex: "status", render: (value) => <Tag>{String(value || "pending").toUpperCase()}</Tag> },
          { title: "Action", render: (_, record) => <Button icon={<EditOutlined />} onClick={() => setEditing(record)}>{readOnly ? "View" : "Edit"}</Button> },
        ]}
      />

      <Modal open={creating} onCancel={() => setCreating(false)} onOk={saveCreate} title="Create Pre-Inspection" okText="Create">
        <Space direction="vertical" style={{ width: "100%" }}>
          <Input value={draft.rpc} onChange={(e) => setDraft((prev) => ({ ...prev, rpc: e.target.value }))} placeholder="RP/C" />
          <Input value={draft.aircraftType} onChange={(e) => setDraft((prev) => ({ ...prev, aircraftType: e.target.value }))} placeholder="Aircraft Type" />
          <Input value={draft.date} onChange={(e) => setDraft((prev) => ({ ...prev, date: e.target.value }))} placeholder="Date (MM/DD/YYYY)" />
        </Space>
      </Modal>

      <Modal open={Boolean(editing)} onCancel={() => setEditing(null)} onOk={() => saveEdit()} okButtonProps={{ disabled: readOnly }} title={readOnly ? "View Pre-Inspection" : "Edit Pre-Inspection"} okText="Save" width={980}>
        {editing && (
          <Space direction="vertical" style={{ width: "100%" }} size={14}>
            <Row gutter={[10, 10]}>
              <Col span={8}><Input value={editing.rpc} onChange={(e) => setEditing((prev) => ({ ...prev, rpc: e.target.value }))} disabled={readOnly} /></Col>
              <Col span={8}><Input value={editing.aircraftType} onChange={(e) => setEditing((prev) => ({ ...prev, aircraftType: e.target.value }))} disabled={readOnly} /></Col>
              <Col span={8}><Input value={editing.date} onChange={(e) => setEditing((prev) => ({ ...prev, date: e.target.value }))} disabled={readOnly} /></Col>
            </Row>

            <Descriptions bordered size="small" column={1}>
              <Descriptions.Item label="Status">{editing.status}</Descriptions.Item>
              <Descriptions.Item label="Released By">{editing.releasedBy?.name || "-"}</Descriptions.Item>
              <Descriptions.Item label="Accepted By">{editing.acceptedBy?.name || "-"}</Descriptions.Item>
            </Descriptions>

            <Divider style={{ margin: "6px 0" }}>Checklist Points</Divider>
            <Row gutter={[8, 8]}>
              {booleanFields.map((field) => (
                <Col xs={24} md={12} lg={8} key={field}>
                  <Checkbox
                    checked={Boolean(editing[field])}
                    disabled={readOnly}
                    onChange={(e) => setEditing((prev) => ({ ...prev, [field]: e.target.checked }))}
                  >
                    {field}
                  </Checkbox>
                </Col>
              ))}
            </Row>

            <Space style={{ justifyContent: "flex-end", width: "100%" }}>
              {canRelease && editing.status === "pending" && !editing.releasedBy?.name && (
                <Button type="primary" onClick={() => setSignatureMode("release")}>Release</Button>
              )}
              {canAccept && editing.status === "released" && !editing.acceptedBy?.name && (
                <Button type="primary" onClick={() => setSignatureMode("accept")}>Accept / Complete</Button>
              )}
            </Space>
            <Text type="secondary">Mobile parity note: signatures and role-based release/accept are now enforced on web too.</Text>
          </Space>
        )}
      </Modal>

      <PinVerifiedSignatureModal
        open={Boolean(signatureMode)}
        title={signatureMode === "release" ? "Release Pre-Inspection" : "Accept Pre-Inspection"}
        description={signatureMode === "release" ? "Draw your release signature." : "Draw your acceptance signature."}
        confirmDescription="Enter your 6-digit PIN to confirm this signature."
        onCancel={() => setSignatureMode(null)}
        onSave={handleSignedAction}
      />
    </div>
  );
}
