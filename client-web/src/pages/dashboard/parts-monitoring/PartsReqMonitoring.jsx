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
  Col,
  Form,
  Grid,
  Input,
  InputNumber,
  Modal,
  Row,
  Select,
  Space,
  Typography,
} from "antd";
import {
  CheckCircleOutlined,
  DeleteOutlined,
  InboxOutlined,
  PlusOutlined,
  SearchOutlined,
} from "@ant-design/icons";
import { Navigate, useLocation, useNavigate } from "react-router-dom";
import PRMTable from "../../../components/tables/PRMTable";
import ResultPopup from "../../../components/common/ResultPopup";
import { AuthContext } from "../../../context/AuthContext";
import { API_BASE } from "../../../utils/API_BASE";
import { confirmAction } from "../../../utils/confirmAction";
import { matchesSearch } from "../../../utils/search";

const { Text } = Typography;
const { useBreakpoint } = Grid;

const normalizeStatus = (value) => {
  const raw = String(value || "")
    .trim()
    .toLowerCase();
  if (raw === "pending") return "parts requested";
  if (raw === "completed") return "delivered";
  return raw;
};

const getEffectiveStatus = (record) => {
  const normalized = normalizeStatus(record?.status);
  if (normalized === "parts requested" && record?.dateWarehouseReviewed) {
    return "availability checked";
  }
  return normalized;
};

const getStatusBucket = (record) => {
  const normalized = getEffectiveStatus(record);
  if (normalized === "approved") return "approved";
  if (["delivered", "cancelled"].includes(normalized)) return "closed";
  return "pending";
};

const getManagerStatusBucket = (record) => {
  const normalized = getEffectiveStatus(record);
  if (["availability checked", "ordered"].includes(normalized)) {
    return "for_review";
  }
  if (["approved", "delivered", "cancelled"].includes(normalized)) {
    return "closed";
  }
  return "pending";
};

const getWarehouseStatusBucket = (record) =>
  ["delivered", "cancelled"].includes(getEffectiveStatus(record))
    ? "completed"
    : "pending";

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

export default function PartsReqMonitoring() {
  const screens = useBreakpoint();
  const location = useLocation();
  const navigate = useNavigate();
  const { user, getAuthHeader } = useContext(AuthContext);
  const [searchText, setSearchText] = useState("");
  const [selectedStatus, setSelectedStatus] = useState("all");
  const [dateSortOrder, setDateSortOrder] = useState("newest");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(false);
  const [requisitions, setRequisitions] = useState([]);
  const [targetRecord, setTargetRecord] = useState(null);
  const [aircraftOptions, setAircraftOptions] = useState([]);
  const [isEntryModalOpen, setIsEntryModalOpen] = useState(false);
  const [isSubmittingEntry, setIsSubmittingEntry] = useState(false);
  const [entryForm] = Form.useForm();
  const userRole = user?.jobTitle?.toLowerCase() || "";
  const userTitle = user?.jobTitle || user?.access || "User";
  const [popup, setPopup] = useState({
    open: false,
    status: "success",
    title: "",
    subTitle: "",
  });
  const allowedRoles = [
    "superadmin",
    "warehouse staff",
    "maintenance manager",
    "officer-in-charge",
    "mechanic",
  ];
  const canAccessPartsRequisition = allowedRoles.includes(userRole);
  const isManager = [
    "superadmin",
    "maintenance manager",
    "officer-in-charge",
  ].includes(userRole);
  const isWarehouseStaff = userRole === "warehouse staff";
  const warehouseRequisitions = useMemo(() => requisitions, [requisitions]);

  const statusFilters = useMemo(() => {
    if (isManager) {
      return [
        {
          key: "all",
          title: "All",
          icon: <InboxOutlined />,
          count: warehouseRequisitions.length,
        },
        {
          key: "for_review",
          title: "For Review",
          icon: <InboxOutlined />,
          count: warehouseRequisitions.filter(
            (record) => getManagerStatusBucket(record) === "for_review",
          ).length,
        },
        {
          key: "closed",
          title: "Closed",
          icon: <CheckCircleOutlined />,
          count: warehouseRequisitions.filter(
            (record) => getManagerStatusBucket(record) === "closed",
          ).length,
        },
      ];
    }

    if (isWarehouseStaff) {
      return [
        {
          key: "all",
          title: "All",
          icon: <InboxOutlined />,
          count: warehouseRequisitions.length,
        },
        {
          key: "pending",
          title: "Pending",
          icon: <InboxOutlined />,
          count: warehouseRequisitions.filter(
            (record) => getWarehouseStatusBucket(record) === "pending",
          ).length,
        },
        {
          key: "completed",
          title: "Completed",
          icon: <CheckCircleOutlined />,
          count: warehouseRequisitions.filter(
            (record) => getWarehouseStatusBucket(record) === "completed",
          ).length,
        },
      ];
    }

    return [
      {
        key: "all",
        title: "All",
        icon: <InboxOutlined />,
        count: warehouseRequisitions.length,
      },
      {
        key: "pending",
        title: "Pending",
        icon: <InboxOutlined />,
        count: warehouseRequisitions.filter(
          (record) => getStatusBucket(record) === "pending",
        ).length,
      },
      {
        key: "approved",
        title: "Approved",
        icon: <CheckCircleOutlined />,
        count: warehouseRequisitions.filter(
          (record) => getStatusBucket(record) === "approved",
        ).length,
      },
      {
        key: "closed",
        title: "Closed",
        icon: <CheckCircleOutlined />,
        count: warehouseRequisitions.filter(
          (record) => getStatusBucket(record) === "closed",
        ).length,
      },
    ];
  }, [isManager, isWarehouseStaff, warehouseRequisitions]);

  const filteredRequisitions = useMemo(() => {
    let data = warehouseRequisitions;

    if (searchText.trim()) {
      data = data.filter((record) => matchesSearch(searchText, record));
    }

    if (selectedStatus !== "all") {
      const normalizedSelectedStatus = normalizeStatus(selectedStatus);
      data = data.filter((record) => {
        if (normalizedSelectedStatus === "for_review") {
          return getManagerStatusBucket(record) === "for_review";
        }
        if (normalizedSelectedStatus === "completed") {
          return getWarehouseStatusBucket(record) === "completed";
        }
        if (isWarehouseStaff && normalizedSelectedStatus === "pending") {
          return getWarehouseStatusBucket(record) === "pending";
        }
        if (
          ["pending", "approved", "closed"].includes(normalizedSelectedStatus)
        ) {
          return getStatusBucket(record) === normalizedSelectedStatus;
        }
        return getEffectiveStatus(record) === normalizedSelectedStatus;
      });
    }

    return [...data].sort((first, second) => {
      const firstDate = parseRequestedDate(first.dateRequested);
      const secondDate = parseRequestedDate(second.dateRequested);

      return dateSortOrder === "oldest"
        ? firstDate - secondDate
        : secondDate - firstDate;
    });
  }, [
    dateSortOrder,
    isWarehouseStaff,
    searchText,
    selectedStatus,
    warehouseRequisitions,
  ]);

  useEffect(() => {
    if (!statusFilters.some((filter) => filter.key === selectedStatus)) {
      setSelectedStatus(statusFilters[0]?.key || "all");
    }
  }, [selectedStatus, statusFilters]);

  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const targetRequestId = params.get("targetRequestId");
    if (!targetRequestId || !warehouseRequisitions.length) return;

    const matched = warehouseRequisitions.find(
      (record) => String(record._id) === String(targetRequestId),
    );
    if (!matched) return;

    setTargetRecord(matched);
    navigate("/dashboard/parts-requisition", { replace: true });
  }, [location.search, navigate, warehouseRequisitions]);

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

  const handleFetchAircraftOptions = useCallback(async () => {
    try {
      const response = await fetch(
        `${API_BASE}/api/parts-monitoring/aircraft-list`,
      );
      if (!response.ok) {
        throw new Error("Failed to fetch aircraft options");
      }

      const data = await response.json();
      setAircraftOptions(
        (data.data || []).map((aircraft) => ({
          label: aircraft,
          value: aircraft,
        })),
      );
    } catch (err) {
      console.error("Aircraft options error:", err);
      setAircraftOptions([]);
    }
  }, []);

  useEffect(() => {
    handleAllRequisitions();
  }, [handleAllRequisitions]);

  useEffect(() => {
    handleFetchAircraftOptions();
  }, [handleFetchAircraftOptions]);

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

  const openAddRequisitionModal = () => {
    entryForm.setFieldsValue({
      aircraft: undefined,
      items: [{ particular: "", quantity: null, unit: "pcs", purpose: "" }],
    });
    setIsEntryModalOpen(true);
  };

  const closeAddRequisitionModal = () => {
    setIsEntryModalOpen(false);
    entryForm.resetFields();
  };

  const buildRequestItemsPayload = (items = []) =>
    items.map((item, index) => ({
      itemNo: index + 1,
      particular: String(item.particular || "").trim(),
      quantity: Number(item.quantity) || 0,
      unitOfMeasure: item.unit || "pcs",
      purpose: String(item.purpose || "").trim(),
      availableQty: 0,
      stockStatus: "Parts Requested",
    }));

  const handleAddRequisition = async () => {
    try {
      const values = await entryForm.validateFields();
      const fullName =
        `${user?.firstName || ""} ${user?.lastName || ""}`.trim() ||
        "Unknown User";
      const highestSlipNumber = warehouseRequisitions.reduce(
        (highest, item) => {
          const numericPart =
            Number(String(item.wrsNo || "").replace("WRS-", "")) || 0;
          return numericPart > highest ? numericPart : highest;
        },
        0,
      );
      const nextSlipNo = `WRS-${String(highestSlipNumber + 1).padStart(3, "0")}`;
      const confirmedCreate = await confirmAction({
        title: "Submit Requisition",
        content: `Submit new requisition ${nextSlipNo}?`,
        okText: "Submit",
      });

      if (!confirmedCreate) return;

      setIsSubmittingEntry(true);
      const response = await fetch(
        `${API_BASE}/api/parts-requisition/create-requisition`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            ...(await getAuthHeader()),
          },
          body: JSON.stringify({
            confirmAction: true,
            wrsNo: nextSlipNo,
            aircraft: values.aircraft,
            staff: {
              requisitioner: fullName,
              requisitionerTitle: userTitle,
              approvedBy: "",
              approvedByTitle: "",
              receiver: "",
              receiverTitle: "",
              notedBy: "",
              notedByTitle: "",
              warehouseBy: "",
              warehouseByTitle: "",
              deliveredBy: "",
              deliveredByTitle: "",
            },
            items: buildRequestItemsPayload(values.items),
            dateRequested: new Date().toISOString(),
            status: "Parts Requested",
          }),
        },
      );

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data?.message || "Failed to create requisition");
      }
      setPopup({
        open: true,
        status: "success",
        title: "WRS " + nextSlipNo,
        subTitle: `${nextSlipNo} added successfully.`,
      });
      closeAddRequisitionModal();
      await handleAllRequisitions();
    } catch (err) {
      if (err?.errorFields) return;
      console.error("Create requisition error:", err);
      setPopup({
        open: true,
        status: "error",
        title: "Operation failed!",
        subTitle: err.message || "Failed to create requisition.",
      });
    } finally {
      setIsSubmittingEntry(false);
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
        <Col xs={24} md={6} lg={6}>
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
        {!isManager && (
          <Col
            xs={24}
            md={10}
            lg={10}
            style={{ textAlign: screens.xs ? "left" : "right" }}
          >
            <Button
              size="large"
              type="primary"
              icon={<PlusOutlined />}
              onClick={openAddRequisitionModal}
              style={{ width: screens.xs ? "100%" : undefined }}
            >
              Add Requisition
            </Button>
          </Col>
        )}
      </Row>

      <Row style={{ marginBottom: 10, marginTop: 20 }}>
        <Col span={24}>
          <div
            style={{
              display: "flex",
              flexWrap: "nowrap",
              gap: 8,
              width: "100%",
              overflowX: "auto",
              overflowY: "hidden",
              paddingBottom: 4,
              WebkitOverflowScrolling: "touch",
            }}
          >
            {statusFilters.map((filter) => {
              const isSelected = selectedStatus === filter.key;

              return (
                <Button
                  key={filter.key}
                  type={isSelected ? "primary" : "default"}
                  icon={filter.icon}
                  onClick={() => setSelectedStatus(filter.key)}
                  style={{
                    flex: "0 0 auto",
                    minWidth: screens.xs ? 132 : 150,
                    height: "auto",
                    minHeight: 40,

                    whiteSpace: "nowrap",
                  }}
                  size="large"
                >
                  {filter.title} ({filter.count})
                </Button>
              );
            })}
          </div>
        </Col>
      </Row>

      <Row gutter={[10, 10]} style={{ marginTop: 8, marginBottom: 16 }}>
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
        key={targetRecord?._id || "prm-table"}
        data={filteredRequisitions}
        loading={loading}
        onUpdated={handleAllRequisitions}
        initialSelectedRecord={targetRecord}
      />

      <Modal
        title="Add Requisition"
        open={isEntryModalOpen}
        onCancel={closeAddRequisitionModal}
        onOk={handleAddRequisition}
        confirmLoading={isSubmittingEntry}
        okText="Submit"
        width={900}
        destroyOnHidden
      >
        <Form form={entryForm} layout="vertical">
          <Form.Item
            label="Aircraft"
            name="aircraft"
            rules={[{ required: true, message: "Please choose an aircraft." }]}
          >
            <Select
              placeholder="Choose Aircraft"
              options={aircraftOptions}
              showSearch={{ optionFilterProp: "label" }}
            />
          </Form.Item>

          <Form.List name="items">
            {(fields, { add, remove }) => (
              <Space orientation="vertical" size={12} style={{ width: "100%" }}>
                {fields.map(({ key, name, ...restField }) => (
                  <div
                    key={key}
                    style={{
                      border: "1px solid #f0f0f0",
                      borderRadius: 8,
                      padding: 12,
                    }}
                  >
                    <Row gutter={12} align="middle">
                      <Col xs={24} md={9}>
                        <Form.Item
                          {...restField}
                          label="Particular"
                          name={[name, "particular"]}
                          rules={[{ required: true, message: "Required" }]}
                          style={{ marginBottom: 8 }}
                        >
                          <Input placeholder="Particular" />
                        </Form.Item>
                      </Col>
                      <Col xs={24} md={4}>
                        <Form.Item
                          {...restField}
                          label="Quantity"
                          name={[name, "quantity"]}
                          rules={[
                            { required: true, message: "Required" },
                            { type: "number", min: 1, message: "Min 1" },
                          ]}
                          style={{ marginBottom: 8 }}
                        >
                          <InputNumber style={{ width: "100%" }} min={1} />
                        </Form.Item>
                      </Col>
                      <Col xs={24} md={4}>
                        <Form.Item
                          {...restField}
                          label="Unit"
                          name={[name, "unit"]}
                          initialValue="pcs"
                          style={{ marginBottom: 8 }}
                        >
                          <Select
                            options={[
                              { label: "pcs", value: "pcs" },
                              { label: "kg", value: "kg" },
                              { label: "ft", value: "ft" },
                              { label: "L", value: "L" },
                            ]}
                          />
                        </Form.Item>
                      </Col>
                      <Col xs={24} md={6}>
                        <Form.Item
                          {...restField}
                          label="Purpose"
                          name={[name, "purpose"]}
                          style={{ marginBottom: 8 }}
                        >
                          <Input placeholder="Optional" />
                        </Form.Item>
                      </Col>
                      <Col xs={24} md={1} style={{ textAlign: "right" }}>
                        {fields.length > 1 && (
                          <Button
                            danger
                            type="text"
                            icon={<DeleteOutlined />}
                            onClick={() => remove(name)}
                          />
                        )}
                      </Col>
                    </Row>
                  </div>
                ))}
                <Button
                  type="dashed"
                  icon={<PlusOutlined />}
                  onClick={() =>
                    add({
                      particular: "",
                      quantity: null,
                      unit: "pcs",
                      purpose: "",
                    })
                  }
                >
                  Add Another Item
                </Button>
              </Space>
            )}
          </Form.List>
        </Form>
      </Modal>
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
