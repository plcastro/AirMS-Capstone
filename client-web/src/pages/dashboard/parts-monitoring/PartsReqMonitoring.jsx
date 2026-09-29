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
  Card,
} from "antd";
import {
  PlusOutlined,
  DeleteOutlined,
  QuestionCircleOutlined,
  SearchOutlined,
  InboxOutlined,
  CheckCircleOutlined,
  EditOutlined,
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
  const [itemError, setItemError] = useState("");

  const resetItemEntry = () => {
    setItemEntry(emptyItem());
    setEditingItemKey(null);
  };
  const closeEntry = async () => {
    if (busy) return;

    const confirmed = await confirmAction({
      title: "Cancel requisition?",
      content:
        "Are you sure you want to cancel this requisition? Any items you have entered will be discarded.",
    });

    if (!confirmed) return;

    setEntry(false);
    form.resetFields();
    setItems([]);
    resetItemEntry();
    setShowItemHelp(false);
    setItemPage(1);
    setItemError("");
  };
  const saveItem = () => {
    const particular = itemEntry.particular.trim();

    setItemError("");

    if (!particular) {
      setItemError("Please enter a part name.");
      return;
    }

    if (!itemEntry.quantity || itemEntry.quantity <= 0) {
      return message.error("Enter a positive quantity for every item.");
    }

    const duplicate = items.some(
      (item) =>
        item.key !== editingItemKey &&
        item.particular.trim().toLowerCase() === particular.toLowerCase(),
    );

    if (duplicate) {
      setItemError(
        "This part has already been added. Click the existing item below to edit its quantity or details.",
      );
      return;
    }

    if (editingItemKey !== null) {
      setItems((current) =>
        current.map((item) =>
          item.key === editingItemKey
            ? {
                ...itemEntry,
                particular,
                key: item.key,
              }
            : item,
        ),
      );

      message.success("Item updated.");
    } else {
      setItems((current) => [
        ...current,
        {
          ...itemEntry,
          particular,
          key: crypto.randomUUID(),
        },
      ]);

      setItemPage(Math.ceil((items.length + 1) / 5));
      message.success("Item added.");
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
      "admin staff",
      "officer-in-charge",
      "warehouse personnel",
      "maintenance manager",
      "mechanic",
    ].includes(roleOf(user))
  )
    return <Alert type="error" title="Parts requisition access denied" />;
  return (
    <div className="fl-page">
      <div style={{ marginBottom: 8 }}>
        <Card
          style={{
            width: "100%",
            marginBottom: 14,
            borderRadius: 12,
          }}
          styles={{
            body: {
              padding: screens.md ? 16 : 12,
            },
          }}
        >
          <Row gutter={[12, 12]} align="middle">
            {/* Search + Sort */}
            <Col xs={24} md={18}>
              <Row gutter={[8, 8]}>
                <Col xs={24} sm={16} md={14}>
                  <Input
                    size="large"
                    prefix={<SearchOutlined />}
                    placeholder="Search by WRS no., aircraft, status, or requester"
                    value={search}
                    onChange={(event) => setSearch(event.target.value)}
                    allowClear
                    style={{
                      width: "100%",
                    }}
                  />
                </Col>

                {screens.md && (
                  <Col md={10}>
                    <Select
                      size="large"
                      aria-label="Requisition date sorting"
                      value={dateSort}
                      onChange={setDateSort}
                      style={{
                        width: "100%",
                      }}
                      options={[
                        {
                          value: "updated",
                          label: "Last updated: Newest First",
                        },
                        {
                          value: "newest",
                          label: "Date: Newest First",
                        },
                        {
                          value: "oldest",
                          label: "Date: Oldest First",
                        },
                      ]}
                    />
                  </Col>
                )}
              </Row>
            </Col>

            {/* Add Requisition */}
            {canCreate(user) && (
              <Col
                xs={24}
                md={6}
                style={{
                  display: "flex",
                  justifyContent: screens.md ? "flex-end" : "stretch",
                }}
              >
                <Button
                  size="large"
                  type="primary"
                  icon={<PlusOutlined />}
                  onClick={() => setEntry(true)}
                  block={!screens.md}
                  style={{
                    width: screens.md ? 150 : "100%",
                  }}
                >
                  Request item/s
                </Button>
              </Col>
            )}
          </Row>
        </Card>
      </div>
      {error && (
        <Alert
          type="error"
          showIcon
          title={error}
          action={<Button onClick={load}>Retry</Button>}
        />
      )}
      <Space wrap style={{ marginBottom: 16 }}>
        {[
          [
            "active",
            oversight ? "Oversight · Active" : "Active",

            <InboxOutlined key="active" />,
          ],
          ["history", "Closed", <CheckCircleOutlined key="history" />],
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
        onCancel={closeEntry}
        footer={null}
        centered
        width={screens.md ? "70vw" : "calc(100vw - 16px)"}
        styles={{
          content: {
            padding: 0,
            overflow: "hidden",
          },
          header: {
            padding: screens.md ? "14px 20px" : 0,
            marginBottom: 0,
          },
          body: {
            height: screens.md ? "75vh" : "calc(100dvh - 90px)",
            overflowY: "auto",
            padding: screens.md ? "16px 20px" : 0,
          },
        }}
      >
        <Form form={form} layout="vertical" onFinish={create}>
          {/* Aircraft */}
          <Form.Item
            label="Aircraft"
            name="aircraft"
            rules={[
              {
                required: true,
                message: "Please select an aircraft.",
              },
            ]}
            style={{ marginBottom: 20 }}
          >
            <Select
              size="large"
              showSearch
              optionFilterProp="label"
              options={aircraft}
              placeholder="Select aircraft"
              style={{ width: "100%" }}
            />
          </Form.Item>

          {/* Item Entry Header */}
          <div
            style={{
              display: "flex",
              alignItems: screens.md ? "center" : "flex-start",
              justifyContent: "space-between",
              gap: 8,
              marginBottom: 12,
            }}
          >
            <Typography.Text strong style={{ fontSize: 16 }}>
              {editingItemKey !== null ? "Edit Item" : "Add Item"}
            </Typography.Text>

            {!screens.md && items.length > 0 && (
              <Typography.Text type="secondary">
                {items.length} item{items.length !== 1 ? "s" : ""}
              </Typography.Text>
            )}
          </div>

          {/* Item Entry */}
          <Row gutter={[12, 12]} align="bottom">
            {/* Particular */}
            <Col xs={24} md={8}>
              <div style={{ marginBottom: 6 }}>
                <Typography.Text strong>Particular</Typography.Text>
              </div>

              <PartNameInput
                value={itemEntry.particular}
                onChange={(particular) => {
                  setItemError("");
                  setItemEntry((current) => ({
                    ...current,
                    particular,
                  }));
                }}
                onSelectUnit={(unitOfMeasure) =>
                  setItemEntry((current) => ({
                    ...current,
                    unitOfMeasure,
                  }))
                }
              />
            </Col>

            {/* Quantity */}
            <Col xs={12} md={3}>
              <div style={{ marginBottom: 6 }}>
                <Typography.Text strong>Quantity</Typography.Text>
              </div>

              <InputNumber
                size="large"
                aria-label="Quantity"
                min={1}
                value={itemEntry.quantity}
                onChange={(quantity) =>
                  setItemEntry((current) => ({
                    ...current,
                    quantity,
                  }))
                }
                style={{ width: "100%" }}
              />
            </Col>

            {/* Unit */}
            <Col xs={12} md={3}>
              <div style={{ marginBottom: 6 }}>
                <Typography.Text strong>Unit</Typography.Text>
              </div>

              <Select
                size="large"
                aria-label="Unit"
                value={itemEntry.unitOfMeasure}
                options={["PC", "SET", "ST", "UNT"].map((value) => ({
                  value,
                  label: value,
                }))}
                onChange={(unitOfMeasure) =>
                  setItemEntry((current) => ({
                    ...current,
                    unitOfMeasure,
                  }))
                }
                style={{ width: "100%" }}
              />
            </Col>

            {/* Purpose */}
            <Col xs={24} md={6}>
              <div style={{ marginBottom: 6 }}>
                <Typography.Text strong>Purpose</Typography.Text>
              </div>

              <Input
                size="large"
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

            {/* Add / Update */}
            <Col xs={24} md={4}>
              <Space
                size={8}
                style={{
                  width: "100%",
                  display: "flex",
                }}
              >
                <Button
                  type="primary"
                  onClick={saveItem}
                  disabled={busy}
                  size="large"
                  icon={
                    editingItemKey !== null ? (
                      <EditOutlined />
                    ) : (
                      <PlusOutlined />
                    )
                  }
                  style={{ flex: 1 }}
                >
                  {editingItemKey !== null ? "Update" : "Add"}
                </Button>

                {editingItemKey !== null && (
                  <Button
                    type="link"
                    onClick={resetItemEntry}
                    disabled={busy}
                    size="large"
                    style={{
                      padding: "0 4px",
                      whiteSpace: "nowrap",
                    }}
                  >
                    Cancel
                  </Button>
                )}
              </Space>
            </Col>
          </Row>
          {itemError && (
            <Typography.Text
              type="danger"
              style={{
                display: "block",
                marginTop: 6,
                lineHeight: 1.4,
              }}
            >
              {itemError}
            </Typography.Text>
          )}

          {/* Items Header */}
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              gap: 8,
              marginTop: 24,
              marginBottom: 12,
            }}
          >
            <Space size={4}>
              <Typography.Text strong style={{ fontSize: 16 }}>
                Requisition Items
              </Typography.Text>

              <Button
                type="text"
                size="large"
                icon={<QuestionCircleOutlined />}
                aria-label="Show requisition item help"
                aria-expanded={showItemHelp}
                onClick={() => setShowItemHelp((value) => !value)}
              />
            </Space>

            <Typography.Text type="secondary">
              {items.length} item{items.length !== 1 ? "s" : ""}
            </Typography.Text>
          </div>

          {/* Help */}
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
                  ? "The selected item is loaded above. Click Update to save your changes, or Cancel Editing to keep it unchanged."
                  : "Click an item to load it into the form above, then update it."
              }
              style={{ marginBottom: 16 }}
            />
          )}

          {/* MOBILE ITEM CARDS */}
          {!screens.md && (
            <div>
              {items.length === 0 ? (
                <Card
                  size="small"
                  style={{
                    textAlign: "center",
                    borderStyle: "dashed",
                    marginBottom: 16,
                  }}
                >
                  <Typography.Text type="secondary">
                    No items added yet.
                  </Typography.Text>
                </Card>
              ) : (
                items.map((item, index) => {
                  const editing = editingItemKey === item.key;

                  return (
                    <Card
                      key={item.key}
                      size="small"
                      onClick={() => {
                        if (!busy) {
                          setItemEntry({
                            particular: item.particular,
                            quantity: item.quantity,
                            unitOfMeasure: item.unitOfMeasure,
                            purpose: item.purpose,
                          });
                          setEditingItemKey(item.key);
                        }
                      }}
                      style={{
                        marginBottom: 10,
                        cursor: busy ? "default" : "pointer",
                        borderColor: editing ? "#1677ff" : undefined,
                        background: editing ? "#e6f4ff" : undefined,
                      }}
                      styles={{
                        body: {
                          padding: 12,
                        },
                      }}
                    >
                      <div
                        style={{
                          display: "flex",
                          alignItems: "flex-start",
                          justifyContent: "space-between",
                          gap: 12,
                        }}
                      >
                        <div
                          style={{
                            minWidth: 0,
                            flex: 1,
                          }}
                        >
                          <Typography.Text
                            type="secondary"
                            style={{ fontSize: 12 }}
                          >
                            Item #{index + 1}
                          </Typography.Text>

                          <div
                            style={{
                              marginTop: 2,
                              fontWeight: 600,
                              wordBreak: "break-word",
                            }}
                          >
                            {item.particular}
                          </div>

                          <div
                            style={{
                              display: "flex",
                              flexWrap: "wrap",
                              gap: 8,
                              marginTop: 8,
                            }}
                          >
                            <Typography.Text>
                              Qty: <strong>{item.quantity}</strong>
                            </Typography.Text>

                            <Typography.Text>
                              Unit: <strong>{item.unitOfMeasure}</strong>
                            </Typography.Text>
                          </div>

                          {item.purpose && (
                            <div
                              style={{
                                marginTop: 6,
                                wordBreak: "break-word",
                              }}
                            >
                              <Typography.Text type="secondary">
                                Purpose:{" "}
                              </Typography.Text>
                              <Typography.Text>{item.purpose}</Typography.Text>
                            </div>
                          )}
                        </div>

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
                      </div>
                    </Card>
                  );
                })
              )}

              {items.length > 5 && (
                <div
                  style={{
                    display: "flex",
                    justifyContent: "center",
                    marginTop: 8,
                    marginBottom: 16,
                  }}
                >
                  <Pagination
                    current={itemPage}
                    onChange={setItemPage}
                    pageSize={5}
                    total={items.length}
                    showSizeChanger={false}
                    size="small"
                  />
                </div>
              )}
            </div>
          )}

          {/* DESKTOP ITEM TABLE */}
          {screens.md && (
            <Table
              bordered
              size="small"
              rowKey="key"
              dataSource={items}
              scroll={{
                y: 500,
              }}
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
                  background:
                    editingItemKey === item.key ? "#e6f4ff" : undefined,
                },
              })}
              columns={[
                {
                  title: "#",
                  width: 50,
                  render: (_, record) =>
                    items.findIndex((item) => item.key === record.key) + 1,
                },
                {
                  title: "Particular",
                  dataIndex: "particular",
                  width: 220,
                },
                {
                  title: "Quantity",
                  dataIndex: "quantity",
                  width: 90,
                },
                {
                  title: "Unit",
                  dataIndex: "unitOfMeasure",
                  width: 80,
                },
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
              locale={{
                emptyText: "No items added yet.",
              }}
            />
          )}

          {/* ACTIONS */}
          <div
            style={{
              flexShrink: 0,
              display: "flex",
              justifyContent: "flex-end",
              alignItems: "center",
              gap: 8,
              paddingTop: 10,
              marginTop: 8,
              background: "#fff",
              borderTop: "1px solid #f0f0f0",
            }}
          >
            <Button
              disabled={busy}
              size="large"
              onClick={async () => {
                if (busy) return;

                const confirmed = await confirmAction({
                  title: "Cancel requisition?",
                  content:
                    "Are you sure you want to cancel this requisition? Any items you have entered will be discarded.",
                });

                if (confirmed) {
                  setEntry(false);
                  form.resetFields();
                  setItems([]);
                  resetItemEntry();
                  setShowItemHelp(false);
                  setItemPage(1);
                  setItemError("");
                }
              }}
            >
              Cancel
            </Button>

            <Button
              type="primary"
              htmlType="submit"
              loading={busy}
              size="large"
            >
              Submit
            </Button>
          </div>
        </Form>
      </Modal>
    </div>
  );
}
