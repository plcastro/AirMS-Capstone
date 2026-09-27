import React, {
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import {
  Alert,
  Button,
  Col,
  Form,
  Grid,
  Input,
  InputNumber,
  Modal,
  Row,
  Select,
  Space,
  Table,
  Typography,
  message,
} from "antd";
import {
  PlusOutlined,
  DeleteOutlined,
  QuestionCircleOutlined,
  SearchOutlined,
  InboxOutlined,
  CheckCircleOutlined,
} from "@ant-design/icons";
import { useLocation } from "react-router-dom";
import { AuthContext } from "../../../context/AuthContext";
import { API_BASE } from "../../../utils/API_BASE";
import { confirmAction } from "../../../utils/confirmAction";
import PRMTable from "../../../components/tables/PRMTable";
import PRMCardView from "../../../components/tables/PRMCardView";
import WRSModal from "../../../components/pagecomponents/WRSModal";
import PartNameInput from "../../../components/pagecomponents/PartNameInput";
import {
  canCreate,
  displayStatus,
  followUpTarget,
  isOversight,
  isRequisitionOwner,
  roleOf,
} from "../../../../../shared/partsRequisitionWorkflow";
const emptyItem = () => ({
  particular: "",
  quantity: 1,
  unitOfMeasure: "PC",
  purpose: "",
});
export default function PartsReqMonitoring() {
  const { user, getAuthHeader } = useContext(AuthContext);
  const location = useLocation();
  const screens = Grid.useBreakpoint();
  const RequisitionList = screens.md ? PRMTable : PRMCardView;
  const oversight = isOversight(user);
  const [records, setRecords] = useState([]),
    [loading, setLoading] = useState(true),
    [error, setError] = useState("");
  const [selectedId, setSelectedId] = useState(null),
    [tab, setTab] = useState("active"),
    [search, setSearch] = useState("");
  const [dateSort, setDateSort] = useState("updated");
  const [entry, setEntry] = useState(false),
    [busy, setBusy] = useState(false),
    [items, setItems] = useState([]),
    [aircraft, setAircraft] = useState([]);
  const [itemEntry, setItemEntry] = useState(emptyItem);
  const [editingItemKey, setEditingItemKey] = useState(null);
  const [showItemHelp, setShowItemHelp] = useState(false);
  const [itemPage, setItemPage] = useState(1);
  const resetItemEntry = () => {
    setItemEntry(emptyItem());
    setEditingItemKey(null);
  };
  const saveItem = () => {
    if (
      !itemEntry.particular.trim() ||
      !itemEntry.quantity ||
      itemEntry.quantity <= 0
    ) {
      return message.error(
        "Enter a part name and positive quantity for every item.",
      );
    }
    if (editingItemKey !== null) {
      setItems((current) =>
        current.map((item) =>
          item.key === editingItemKey ? { ...itemEntry, key: item.key } : item,
        ),
      );
    } else {
      setItems((current) => [
        ...current,
        { ...itemEntry, key: crypto.randomUUID() },
      ]);
      setItemPage(Math.ceil((items.length + 1) / 5));
    }
    resetItemEntry();
  };
  const removeItem = (key) => {
    setItems((current) => current.filter((item) => item.key !== key));
    setItemPage((page) =>
      Math.min(page, Math.max(1, Math.ceil((items.length - 1) / 5))),
    );
    if (editingItemKey === key) resetItemEntry();
  };
  const [form] = Form.useForm();
  const load = useCallback(async () => {
    try {
      const response = await fetch(
        `${API_BASE}/api/parts-requisition/get-all-requisition`,
        {
          headers: await getAuthHeader(),
        },
      );
      if (!response.ok) throw new Error("Could not load requisitions");
      setRecords(await response.json());
      setError("");
    } catch (error) {
      setError(error.message);
    } finally {
      setLoading(false);
    }
  }, [getAuthHeader]);
  useEffect(() => {
    // Fetching on mount and polling synchronize the page with server changes.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    load();
    const timer = setInterval(load, 15000);
    return () => clearInterval(timer);
  }, [load]);
  useEffect(() => {
    getAuthHeader()
      .then((headers) =>
        fetch(`${API_BASE}/api/parts-monitoring/aircraft-list`, {
          headers,
        }),
      )
      .then((response) => response.json())
      .then((data) =>
        setAircraft(
          (data.data || []).map((value) => ({
            value,
            label: value,
          })),
        ),
      )
      .catch(() => {});
  }, [getAuthHeader]);
  useEffect(() => {
    const id =
      location.state?.requisitionId ||
      location.state?.targetRequestId ||
      new URLSearchParams(location.search).get("targetRequestId") ||
      new URLSearchParams(location.search).get("requisitionId");
    // A notification can navigate to a different record while this page stays mounted.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    if (id) setSelectedId(id);
  }, [location]);
  const action = async (record, action, extra = {}) => {
    if (
      action !== "stock" &&
      !(await confirmAction({
        title: {
          deliver: "Confirm delivery",
          confirm: "Confirm receipt",
          cancel: "Cancel requisition",
          "follow-up": "Send follow-up reminder",
        }[action],
        content:
          action === "deliver"
            ? "Confirm that all requested parts have been delivered."
            : action === "confirm"
              ? "Confirm that you received all requested parts. This closes the requisition."
              : `Continue for ${record.wrsNo}?`,
      }))
    )
      return;
    setBusy(true);
    try {
      const response = await fetch(
        `${API_BASE}/api/parts-requisition/update-requisition/${record._id}`,
        {
          method: "POST",
          headers: {
            ...(await getAuthHeader()),
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            action,
            ...extra,
            confirmAction: true,
          }),
        },
      );
      const data = await response.json();
      if (!response.ok) throw new Error(data.message || "Update failed");
      setRecords((records) =>
        records.map((record) => (record._id === data._id ? data : record)),
      );
      message.success(
        action === "follow-up" ? "Follow-up sent" : "Requisition updated",
      );
      return true;
    } catch (error) {
      message.error(error.message);
      await load();
      return false;
    } finally {
      setBusy(false);
    }
  };
  const create = async (values) => {
    if (
      editingItemKey !== null ||
      itemEntry.particular.trim() ||
      itemEntry.purpose.trim()
    )
      return message.error(
        "Add or update the draft item, or cancel editing, before submitting.",
      );
    if (
      !items.length ||
      items.some(
        (item) =>
          !item.particular.trim() || !item.quantity || item.quantity <= 0,
      )
    )
      return message.error(
        "Enter a part name and positive quantity for every item.",
      );
    if (
      !(await confirmAction({
        title: "Submit requisition",
        content: "Send these parts to warehouse for a stock check?",
      }))
    )
      return;
    setBusy(true);
    try {
      const response = await fetch(
        `${API_BASE}/api/parts-requisition/create-requisition`,
        {
          method: "POST",
          headers: {
            ...(await getAuthHeader()),
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            aircraft: values.aircraft,
            items: items.map(
              ({ particular, quantity, unitOfMeasure, purpose }) => ({
                particular,
                quantity,
                unitOfMeasure,
                purpose,
              }),
            ),
            confirmAction: true,
          }),
        },
      );
      const data = await response.json();
      if (!response.ok) throw new Error(data.message || "Create failed");
      setRecords((records) => [data, ...records]);
      setEntry(false);
      form.resetFields();
      setItems([]);
      resetItemEntry();
      setShowItemHelp(false);
      setItemPage(1);
      message.success("Requisition submitted");
    } catch (error) {
      message.error(error.message);
    } finally {
      setBusy(false);
    }
  };
  const filtered = useMemo(
    () =>
      records.filter((record) => {
        const closed = ["Closed", "Cancelled"].includes(displayStatus(record));
        const own = isRequisitionOwner(user, record);
        return (
          (tab === "history" ? closed : !closed) &&
          (oversight || roleOf(user) === "warehouse personnel" || own) &&
          `${record.wrsNo} ${record.aircraft} ${record.staff?.requisitioner} ${displayStatus(record)} ${(record.items || []).map((item) => item.particular).join(" ")}`
            .toLowerCase()
            .includes(search.toLowerCase())
        );
      }),
    [records, tab, user, oversight, search],
  );
  if (
    ![
      "superadmin",
      "officer-in-charge",
      "warehouse personnel",
      "maintenance manager",
      "mechanic",
    ].includes(roleOf(user))
  )
    return <Alert type="error" message="Parts requisition access denied" />;
  return (
    <div
      style={{
        padding: 24,
      }}
    >
      <div
        style={{ display: "flex", gap: 14, flexWrap: "wrap", marginBottom: 18 }}
      >
        <Input
          size="large"
          prefix={<SearchOutlined />}
          placeholder="Search by WRS no., aircraft, status, or requester"
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          style={{ flex: "1 1 300px", maxWidth: 520 }}
        />
        {screens.md && (
          <Select
            size="large"
            aria-label="Requisition date sorting"
            value={dateSort}
            onChange={setDateSort}
            style={{ flex: "1 1 220px", maxWidth: 380 }}
            options={[
              { value: "updated", label: "Last updated: Newest First" },
              { value: "newest", label: "Date: Newest First" },
              { value: "oldest", label: "Date: Oldest First" },
            ]}
          />
        )}
        {canCreate(user) && (
          <Button
            size="large"
            type="primary"
            icon={<PlusOutlined />}
            style={{ marginLeft: "auto" }}
            onClick={() => setEntry(true)}
          >
            Add Requisition
          </Button>
        )}
      </div>
      {error && (
        <Alert
          type="error"
          showIcon
          title={error}
          action={<Button onClick={load}>Retry</Button>}
        />
      )}
      <Space wrap style={{ marginBottom: 20 }}>
        {[
          [
            "active",
            oversight ? "Oversight · Active" : "Active requisitions",

            <InboxOutlined key="active" />,
          ],
          [
            "history",
            "History · Closed / Cancelled",
            <CheckCircleOutlined key="history" />,
          ],
        ].map(([key, label, icon]) => (
          <Button
            size="large"
            key={key}
            icon={icon}
            type={tab === key ? "primary" : "default"}
            onClick={() => setTab(key)}
          >
            {label} (
            {
              records.filter(
                (record) =>
                  (oversight ||
                    roleOf(user) === "warehouse personnel" ||
                    isRequisitionOwner(user, record)) &&
                  (key === "history"
                    ? ["Closed", "Cancelled"].includes(displayStatus(record))
                    : !["Closed", "Cancelled"].includes(displayStatus(record))),
              ).length
            }
            )
          </Button>
        ))}
      </Space>
      <div style={{ textAlign: "right", marginBottom: 12 }}>
        <Typography.Text type="secondary">
          Showing {filtered.length} requisition(s)
        </Typography.Text>
      </div>
      <RequisitionList
        dateSort={dateSort}
        records={filtered}
        loading={loading}
        onOpen={(record) => setSelectedId(record._id)}
        oversight={oversight}
        canFollowUp={followUpTarget}
        onFollowUp={(record) => action(record, "follow-up")}
        busy={busy}
      />
      <WRSModal
        record={records.find((record) => record._id === selectedId)}
        user={user}
        open={!!selectedId}
        onClose={() => setSelectedId(null)}
        onAction={action}
        busy={busy}
      />
      <Modal
        title="New parts requisition"
        open={entry}
        onCancel={() => !busy && setEntry(false)}
        footer={null}
        width={850}
      >
        <Form form={form} layout="vertical" onFinish={create}>
          <Form.Item
            label="Aircraft"
            name="aircraft"
            rules={[
              {
                required: true,
              },
            ]}
          >
            <Select
              showSearch
              options={aircraft}
              placeholder="Select aircraft"
            />
          </Form.Item>
          <div
            style={{
              padding: 16,
              marginBottom: 20,
              border: "1px solid #d9d9d9",
              borderRadius: 6,
              background: "#fafafa",
            }}
          >
            <Typography.Text strong>
              {editingItemKey !== null ? "Edit Item" : "Add Item"}
            </Typography.Text>
            <Row gutter={[12, 12]} align="bottom" style={{ marginTop: 12 }}>
              <Col xs={24} md={8}>
                <Typography.Text>Particular</Typography.Text>
                <PartNameInput
                  value={itemEntry.particular}
                  onChange={(particular) =>
                    setItemEntry((current) => ({ ...current, particular }))
                  }
                  onSelectUnit={(unitOfMeasure) =>
                    setItemEntry((current) => ({ ...current, unitOfMeasure }))
                  }
                />
              </Col>
              <Col xs={8} md={3}>
                <Typography.Text>Quantity</Typography.Text>
                <InputNumber
                  aria-label="Quantity"
                  min={1}
                  value={itemEntry.quantity}
                  onChange={(quantity) =>
                    setItemEntry((current) => ({ ...current, quantity }))
                  }
                  style={{ width: "100%" }}
                />
              </Col>
              <Col xs={8} md={3}>
                <Typography.Text>Unit</Typography.Text>
                <Select
                  aria-label="Unit"
                  value={itemEntry.unitOfMeasure}
                  options={["PC", "SET", "ST", "UNT"].map((value) => ({
                    value,
                  }))}
                  onChange={(unitOfMeasure) =>
                    setItemEntry((current) => ({ ...current, unitOfMeasure }))
                  }
                  style={{ width: "100%" }}
                />
              </Col>
              <Col xs={24} md={6}>
                <Typography.Text>Purpose</Typography.Text>
                <Input
                  aria-label="Purpose"
                  placeholder="Optional"
                  value={itemEntry.purpose}
                  onChange={(event) =>
                    setItemEntry((current) => ({
                      ...current,
                      purpose: event.target.value,
                    }))
                  }
                />
              </Col>
              <Col xs={24} md={4}>
                <Space wrap>
                  <Button
                    type="primary"
                    onClick={saveItem}
                    disabled={busy}
                    size="large"
                  >
                    {editingItemKey !== null ? "Update" : "Add"}
                  </Button>
                  {editingItemKey !== null && (
                    <Button
                      type="link"
                      onClick={resetItemEntry}
                      disabled={busy}
                      size="large"
                    >
                      Cancel
                    </Button>
                  )}
                </Space>
              </Col>
            </Row>
          </div>
          <Space
            style={{
              width: "100%",
              justifyContent: "space-between",
              marginBottom: 12,
            }}
          >
            <Space>
              <Typography.Text strong>Requisition Items</Typography.Text>
              <Button
                type="text"
                size="small"
                icon={<QuestionCircleOutlined />}
                aria-label="Show requisition item help"
                aria-expanded={showItemHelp}
                onClick={() => setShowItemHelp((value) => !value)}
              />
            </Space>
            <Typography.Text type="secondary">
              {items.length} item{items.length !== 1 ? "s" : ""}
            </Typography.Text>
          </Space>
          {showItemHelp && (
            <Alert
              showIcon
              type={editingItemKey !== null ? "warning" : "info"}
              title={
                editingItemKey !== null
                  ? "Editing selected item"
                  : "Need to update an added item?"
              }
              description={
                editingItemKey !== null
                  ? "The highlighted row is loaded above. Click Update to save your changes, or Cancel to keep it unchanged."
                  : "Click an item row to load it into the form above, then click Update to save your changes."
              }
              style={{ marginBottom: 12 }}
            />
          )}
          <Table
            bordered
            size="small"
            rowKey="key"
            dataSource={items}
            scroll={{ x: 700 }}
            onRow={(item) => ({
              onClick: () => {
                if (!busy) {
                  setItemEntry({
                    particular: item.particular,
                    quantity: item.quantity,
                    unitOfMeasure: item.unitOfMeasure,
                    purpose: item.purpose,
                  });
                  setEditingItemKey(item.key);
                }
              },
              style: {
                cursor: "pointer",
                background: editingItemKey === item.key ? "#e6f4ff" : undefined,
              },
            })}
            pagination={
              items.length > 5
                ? {
                    current: itemPage,
                    onChange: setItemPage,
                    pageSize: 5,
                    showSizeChanger: false,
                    size: "small",
                  }
                : false
            }
            columns={[
              {
                title: "#",
                width: 50,
                render: (_, record) =>
                  items.findIndex((item) => item.key === record.key) + 1,
              },
              { title: "Particular", dataIndex: "particular", width: 240 },
              { title: "Quantity", dataIndex: "quantity", width: 90 },
              { title: "Unit", dataIndex: "unitOfMeasure", width: 80 },
              {
                title: "Purpose",
                dataIndex: "purpose",
                width: 180,
                render: (value) => value || "—",
              },
              {
                title: "Action",
                width: 70,
                fixed: "right",
                render: (_, item) => (
                  <Button
                    danger
                    type="text"
                    disabled={busy}
                    icon={<DeleteOutlined />}
                    aria-label={`Delete ${item.particular}`}
                    onClick={(event) => {
                      event.stopPropagation();
                      removeItem(item.key);
                    }}
                  />
                ),
              },
            ].map((column) => ({
              ...column,
              onCell: (item) => ({
                style: {
                  background:
                    editingItemKey === item.key ? "#e6f4ff" : undefined,
                },
              }),
            }))}
            locale={{ emptyText: "No items added yet." }}
          />
          <div
            style={{
              display: "flex",
              justifyContent: "flex-end",
              marginTop: 16,
            }}
          >
            <Button
              type="primary"
              htmlType="submit"
              loading={busy}
              size="large"
            >
              Submit requisition
            </Button>
          </div>
        </Form>
      </Modal>
    </div>
  );
}
