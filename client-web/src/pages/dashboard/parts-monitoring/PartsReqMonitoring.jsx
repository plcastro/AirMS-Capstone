import React, {
  useCallback,
  useContext,
  useMemo,
  useState,
  useEffect,
} from "react";
import {
  Alert,
  Button,
  Card,
  Col,
  Form,
  Input,
  InputNumber,
  Modal,
  Row,
  Select,
  Space,
  Tabs,
  Typography,
} from "antd";
import {
  CheckCircleOutlined,
  CloseCircleOutlined,
  DeleteOutlined,
  FileDoneOutlined,
  InboxOutlined,
  PlusOutlined,
  SearchOutlined,
  ShoppingCartOutlined,
  SyncOutlined,
} from "@ant-design/icons";
import { Navigate } from "react-router-dom";
import PRMTable from "../../../components/tables/PRMTable";
import { AuthContext } from "../../../context/AuthContext";
import { API_BASE } from "../../../utils/API_BASE";

const { Text } = Typography;
const UNIT_OPTIONS = ["pcs", "kg", "ft", "L"];

const parseRequestedDate = (dateValue) => {
  const [month, day, year] = String(dateValue || "")
    .split("/")
    .map(Number);
  return new Date(year, month - 1, day).getTime();
};

const toSummaryRecord = (record) => ({
  ...record,
  noOfItems: record.items?.length || 0,
  totalQty:
    record.items?.reduce((sum, item) => sum + (item.quantity || 0), 0) || 0,
});

const formatRequestedDate = (dateValue) => {
  if (!dateValue) return "";

  const date = new Date(dateValue);
  if (Number.isNaN(date.getTime())) {
    return String(dateValue);
  }

  return `${date.getMonth() + 1}/${String(date.getDate()).padStart(2, "0")}/${date.getFullYear()}`;
};

const normalizeRequisitionRecord = (record) =>
  toSummaryRecord({
    ...record,
    status:
      record.status === "Pending"
        ? "Parts Requested"
        : record.status === "Completed"
          ? "Delivered"
          : record.status,
    dateRequested: formatRequestedDate(record.dateRequested),
    staff: {
      ...record.staff,
      employeeName:
        record.staff?.employeeName || record.staff?.requisitioner || "",
    },
  });

export default function PartsRequisition() {
  const { user, getAuthHeader } = useContext(AuthContext);
  const [form] = Form.useForm();
  const [searchText, setSearchText] = useState("");
  const [activeTab, setActiveTab] = useState("pending");
  const [selectedStatus, setSelectedStatus] = useState("all");
  const [dateSortOrder, setDateSortOrder] = useState("newest");
  const [loading, setLoading] = useState(false);
  const [submittingRequest, setSubmittingRequest] = useState(false);
  const [error, setError] = useState(false);
  const [requisitions, setRequisitions] = useState([]);
  const [aircraftOptions, setAircraftOptions] = useState([]);
  const [requestModalOpen, setRequestModalOpen] = useState(false);
  const userRole = user?.jobTitle?.toLowerCase() || "";
  const allowedRoles = [
    "warehouse department",
    "maintenance manager",
    "officer-in-charge",
    "mechanic",
  ];
  const canAccessPartsRequisition = allowedRoles.includes(userRole);
  const canRequestParts = !["maintenance manager", "officer-in-charge"].includes(
    userRole,
  );

  const warehouseRequisitions = useMemo(() => requisitions, [requisitions]);

  const stats = useMemo(
    () => ({
      total: warehouseRequisitions.length,
      pending: warehouseRequisitions.filter((record) => {
        const status = String(record.status || "");
        return !["Delivered", "Completed", "Cancelled"].includes(status);
      }).length,
      completed: warehouseRequisitions.filter((record) => {
        const status = String(record.status || "");
        return ["Delivered", "Completed", "Cancelled"].includes(status);
      }).length,
    }),
    [warehouseRequisitions],
  );

  const tabItems = useMemo(
    () => [
      {
        key: "pending",
        label: `Pending (${stats.pending})`,
      },
      {
        key: "completed",
        label: `Completed (${stats.completed})`,
      },
    ],
    [stats],
  );

  const statusFilters = useMemo(() => {
    const pendingFilters = [
      {
        key: "all",
        title: "All Pending",
        icon: <InboxOutlined />,
        count: warehouseRequisitions.filter(
          (r) => !["Delivered", "Completed", "Cancelled"].includes(r.status),
        ).length,
      },
      {
        key: "Parts Requested",
        title: "Parts Requested",
        icon: <InboxOutlined />,
        count: warehouseRequisitions.filter(
          (r) => r.status === "Parts Requested",
        ).length,
      },
      {
        key: "To Be Ordered",
        title: "To Be Ordered",
        icon: <ShoppingCartOutlined />,
        count: warehouseRequisitions.filter((r) => r.status === "To Be Ordered")
          .length,
      },
      {
        key: "Availability Checked",
        title: "Availability Checked",
        icon: <SyncOutlined />,
        count: warehouseRequisitions.filter(
          (r) => r.status === "Availability Checked",
        ).length,
      },
      {
        key: "Ordered",
        title: "Restocked",
        icon: <SyncOutlined />,
        count: warehouseRequisitions.filter((r) => r.status === "Ordered")
          .length,
      },
      {
        key: "Approved",
        title: "Approved",
        icon: <CheckCircleOutlined />,
        count: warehouseRequisitions.filter((r) => r.status === "Approved")
          .length,
      },
    ];

    const completedFilters = [
      {
        key: "all",
        title: "All Completed",
        icon: <FileDoneOutlined />,
        count: warehouseRequisitions.filter((r) =>
          ["Delivered", "Completed", "Cancelled"].includes(r.status),
        ).length,
      },
      {
        key: "Delivered",
        title: "Delivered",
        icon: <FileDoneOutlined />,
        count: warehouseRequisitions.filter((r) => r.status === "Delivered")
          .length,
      },
      {
        key: "Cancelled",
        title: "Cancelled",
        icon: <CloseCircleOutlined />,
        count: warehouseRequisitions.filter((r) => r.status === "Cancelled")
          .length,
      },
    ];

    return activeTab === "completed" ? completedFilters : pendingFilters;
  }, [activeTab, warehouseRequisitions]);

  const statusOptions = useMemo(() => {
    const pendingStatuses = [
      "Parts Requested",
      "Availability Checked",
      "To Be Ordered",
      "Ordered",
      "Approved",
    ];
    const completedStatuses = ["Delivered", "Completed", "Cancelled"];

    const statusesForTab =
      activeTab === "completed" ? completedStatuses : pendingStatuses;

    return [
      { value: "all", label: "All Statuses" },
      ...statusesForTab.map((status) => ({
        value: status,
        label: status === "Ordered" ? "Restocked" : status,
      })),
    ];
  }, [activeTab]);

  const filteredRequisitions = useMemo(() => {
    let data = warehouseRequisitions;

    if (searchText.trim()) {
      const query = searchText.trim().toLowerCase();
      data = data.filter(
        (record) =>
          record.wrsNo?.toLowerCase().includes(query) ||
          record.aircraft?.toLowerCase().includes(query) ||
          record.status?.toLowerCase().includes(query) ||
          record.staff?.employeeName?.toLowerCase().includes(query),
      );
    }

    if (activeTab === "completed") {
      data = data.filter((record) =>
        ["Delivered", "Completed", "Cancelled"].includes(
          String(record.status || ""),
        ),
      );
    } else {
      data = data.filter(
        (record) =>
          !["Delivered", "Completed", "Cancelled"].includes(
            String(record.status || ""),
          ),
      );
    }

    if (selectedStatus !== "all") {
      data = data.filter((record) => record.status === selectedStatus);
    }

    return [...data].sort((first, second) => {
      const firstDate = parseRequestedDate(first.dateRequested);
      const secondDate = parseRequestedDate(second.dateRequested);

      return dateSortOrder === "oldest"
        ? firstDate - secondDate
        : secondDate - firstDate;
    });
  }, [
    activeTab,
    dateSortOrder,
    searchText,
    selectedStatus,
    warehouseRequisitions,
  ]);

  useEffect(() => {
    setSelectedStatus("all");
  }, [activeTab]);

  const handleAllRequisitions = useCallback(async () => {
    if (!canAccessPartsRequisition) return;

    try {
      setLoading(true);
      setError(null);

      const response = await fetch(
        `${API_BASE}/api/parts-requisition/get-all-requisition`,
        {
          method: "GET",
          headers: await getAuthHeader(),
        },
      );

      if (!response.ok) {
        throw new Error("Failed to fetch requisitions");
      }

      const data = await response.json();

      // console.log("Requisitions:", data);
      setRequisitions(
        Array.isArray(data) ? data.map(normalizeRequisitionRecord) : [],
      );
    } catch (err) {
      console.error("Fetch error:", err);
      setError("Failed to load requisitions.");
    } finally {
      setLoading(false);
    }
  }, [canAccessPartsRequisition, getAuthHeader]);

  const handleAircraftOptions = useCallback(async () => {
    if (!canAccessPartsRequisition) return;

    try {
      const response = await fetch(
        `${API_BASE}/api/parts-monitoring/aircraft-list`,
      );
      const data = await response.json();
      if (response.ok && Array.isArray(data.data)) {
        setAircraftOptions(data.data.filter(Boolean));
      }
    } catch {
      setAircraftOptions([]);
    }
  }, [canAccessPartsRequisition]);

  useEffect(() => {
    handleAllRequisitions();
    handleAircraftOptions();
  }, [handleAircraftOptions, handleAllRequisitions]);

  useEffect(() => {
    if (!canAccessPartsRequisition) {
      return undefined;
    }

    const refreshInterval = window.setInterval(() => {
      handleAllRequisitions();
    }, 15000);

    return () => window.clearInterval(refreshInterval);
  }, [canAccessPartsRequisition, handleAllRequisitions]);

  if (!canAccessPartsRequisition) {
    return <Navigate to="/dashboard/profile" replace />;
  }

  const openRequestModal = () => {
    form.setFieldsValue({
      aircraft: undefined,
      items: [{ particular: "", quantity: 1, unit: "pcs", purpose: "" }],
    });
    setRequestModalOpen(true);
  };

  const buildRequestItemsPayload = (items) =>
    items.map((item, index) => ({
      itemNo: index + 1,
      particular: String(item.particular || "").trim(),
      quantity: Number(item.quantity),
      unitOfMeasure: item.unit || "pcs",
      purpose: String(item.purpose || "").trim(),
      availableQty: 0,
      stockStatus: "Parts Requested",
    }));

  const handleSubmitRequest = async () => {
    try {
      const values = await form.validateFields();
      const highestSlipNumber = requisitions.reduce((highest, item) => {
        const numericPart = Number(item.wrsNo?.replace("WRS-", "")) || 0;
        return numericPart > highest ? numericPart : highest;
      }, 0);
      const nextSlipNo = `WRS-${String(highestSlipNumber + 1).padStart(3, "0")}`;
      const fullName =
        `${user?.firstName || ""} ${user?.lastName || ""}`.trim() ||
        user?.username ||
        "Unknown User";

      setSubmittingRequest(true);
      const response = await fetch(
        `${API_BASE}/api/parts-requisition/create-requisition`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            ...(await getAuthHeader()),
          },
          body: JSON.stringify({
            wrsNo: nextSlipNo,
            aircraft: values.aircraft,
            staff: {
              requisitioner: fullName,
              approvedBy: "",
              receiver: "",
              notedBy: "",
              warehouseBy: "",
              deliveredBy: "",
            },
            items: buildRequestItemsPayload(values.items || []),
            dateRequested: new Date().toISOString(),
            status: "Parts Requested",
            confirmAction: true,
          }),
        },
      );
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.message || "Failed to create requisition");
      }

      setRequestModalOpen(false);
      form.resetFields();
      setActiveTab("pending");
      setSelectedStatus("all");
      await handleAllRequisitions();
      Modal.success({ title: `${nextSlipNo} added successfully.` });
    } catch (err) {
      if (err?.errorFields) return;
      Modal.error({
        title: "Failed to create requisition",
        content: err.message || "Please try again.",
      });
    } finally {
      setSubmittingRequest(false);
    }
  };

  return (
    <div
      style={{
        padding: 20,
        height: "100vh",
        display: "flex",
        flexDirection: "column",
        overflowY: "auto",
        paddingBottom: 120,
      }}
    >
      <Row gutter={[16, 16]} align="middle">
        <Col xs={24} md={8}>
          <Input
            size="large"
            placeholder="Search by WRS no., aircraft, status, or requester"
            prefix={<SearchOutlined />}
            allowClear
            value={searchText}
            onChange={(e) => setSearchText(e.target.value)}
          />
        </Col>
        <Col xs={24} md={6} lg={4}>
          <Select
            size="large"
            value={dateSortOrder}
            onChange={setDateSortOrder}
            style={{ width: "100%" }}
            options={[
              { value: "newest", label: "Date: Newest First" },
              { value: "oldest", label: "Date: Oldest First" },
            ]}
          />
        </Col>
        {canRequestParts && (
          <Col xs={24} md={4} lg={3}>
            <Button
              type="primary"
              size="large"
              icon={<PlusOutlined />}
              onClick={openRequestModal}
              block
            >
              Request
            </Button>
          </Col>
        )}
      </Row>

      <Row style={{ marginTop: 10, marginBottom: 10 }}>
        <Col span={24}>
          <Tabs
            activeKey={activeTab}
            onChange={setActiveTab}
            items={tabItems}
          />
        </Col>
      </Row>

      <Row style={{ marginBottom: 10 }}>
        <Col span={24}>
          <Space size={[8, 8]} wrap>
            {statusFilters.map((filter) => {
              const isSelected = selectedStatus === filter.key;

              return (
                <Button
                  key={filter.key}
                  type={isSelected ? "primary" : "default"}
                  icon={filter.icon}
                  onClick={() => setSelectedStatus(filter.key)}
                >
                  {filter.title} ({filter.count})
                </Button>
              );
            })}
          </Space>
        </Col>
      </Row>

      <Row gutter={[10, 10]} style={{ marginBottom: 20 }}>
        <Col span={24} style={{ textAlign: "right" }}>
          <Text type="secondary">
            Showing <Text strong>{filteredRequisitions.length}</Text>{" "}
            requisition(s)
          </Text>
        </Col>
      </Row>
      {error && (
        <Alert
          type="error"
          title={error}
          showIcon
          style={{ marginBottom: 16 }}
        />
      )}
      <PRMTable
        data={filteredRequisitions}
        loading={loading}
        onUpdated={handleAllRequisitions}
      />

      <Modal
        open={requestModalOpen}
        onCancel={() => setRequestModalOpen(false)}
        onOk={handleSubmitRequest}
        okText="Submit"
        confirmLoading={submittingRequest}
        title="New Entry"
        width={820}
      >
        <Form
          form={form}
          layout="vertical"
          initialValues={{
            items: [{ particular: "", quantity: 1, unit: "pcs", purpose: "" }],
          }}
        >
          <Form.Item
            label="Choose Aircraft"
            name="aircraft"
            rules={[{ required: true, message: "Please choose an aircraft" }]}
          >
            <Select
              placeholder="Choose Aircraft"
              showSearch
              optionFilterProp="label"
              options={aircraftOptions.map((aircraft) => ({
                value: aircraft,
                label: aircraft,
              }))}
            />
          </Form.Item>

          <Form.List name="items">
            {(fields, { add, remove }) => (
              <Space direction="vertical" style={{ width: "100%" }} size={12}>
                {fields.map((field, index) => (
                  <Card
                    key={field.key}
                    size="small"
                    title={`Item ${index + 1}`}
                    extra={
                      fields.length > 1 ? (
                        <Button
                          type="text"
                          danger
                          icon={<DeleteOutlined />}
                          onClick={() => remove(field.name)}
                        />
                      ) : null
                    }
                  >
                    <Row gutter={[12, 0]}>
                      <Col xs={24} md={10}>
                        <Form.Item
                          {...field}
                          label="Particular"
                          name={[field.name, "particular"]}
                          rules={[
                            { required: true, message: "Particular is required" },
                          ]}
                        >
                          <Input placeholder="-" />
                        </Form.Item>
                      </Col>
                      <Col xs={14} md={6}>
                        <Form.Item
                          {...field}
                          label="Quantity"
                          name={[field.name, "quantity"]}
                          rules={[
                            { required: true, message: "Quantity is required" },
                          ]}
                        >
                          <InputNumber min={1} style={{ width: "100%" }} />
                        </Form.Item>
                      </Col>
                      <Col xs={10} md={4}>
                        <Form.Item
                          {...field}
                          label="Unit"
                          name={[field.name, "unit"]}
                          rules={[{ required: true, message: "Unit is required" }]}
                        >
                          <Select
                            options={UNIT_OPTIONS.map((unit) => ({
                              value: unit,
                              label: unit,
                            }))}
                          />
                        </Form.Item>
                      </Col>
                      <Col xs={24} md={4}>
                        <Form.Item
                          {...field}
                          label="Purpose"
                          name={[field.name, "purpose"]}
                        >
                          <Input placeholder="-" />
                        </Form.Item>
                      </Col>
                    </Row>
                  </Card>
                ))}

                <Button
                  icon={<PlusOutlined />}
                  onClick={() =>
                    add({ particular: "", quantity: 1, unit: "pcs", purpose: "" })
                  }
                >
                  Add Another Item
                </Button>
              </Space>
            )}
          </Form.List>
        </Form>
      </Modal>
    </div>
  );
}
