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
  message,
  Table,
  AutoComplete,
  Typography,
  Space,
} from "antd";
import {
  CheckCircleOutlined,
  DeleteOutlined,
  FilePdfOutlined,
  InboxOutlined,
  PlusOutlined,
  SearchOutlined,
  SaveOutlined,
} from "@ant-design/icons";
import { Navigate, useLocation, useNavigate } from "react-router-dom";
import PRMTable from "../../../components/tables/PRMTable";
import ResultPopup from "../../../components/common/ResultPopup";
import { exportPartsRequisitionMonitoringReport } from "../../../components/common/ExportFile";
import { AuthContext } from "../../../context/AuthContext";
import { API_BASE } from "../../../utils/API_BASE";
import { confirmAction } from "../../../utils/confirmAction";
import { matchesSearch } from "../../../utils/search";
import { useDebouncedValue } from "../../../utils/debounce";

const { Text } = Typography;
const { useBreakpoint } = Grid;
const WRS_UOM_OPTIONS = ["SET", "ST", "UNT", "PC"].map((unit) => ({
  label: unit,
  value: unit,
}));
const options = [
  { value: "WRENCH,LOCK,TRH,PN 350A93-3302-02,AIRBUS" },
  { value: "TOOL,EXCHANGE,PN 355A93-7540-00,AIRBUS" },
  { value: "TOOL,PN 350A93-3501-20,AIRBUS" },
  { value: "TOOL,PN 350A93-3500-00,AIRBUS" },
  { value: "WRENCH,M27,PN 350A93-3806-00,AIRBUS" },
  { value: "WRENCH,M22,PN 350A93-3804-00,AIRBUS" },
  { value: "YOKE,IMMOBILIZING,#350A93-3802-21,AIRBUS" },
  { value: "YOKE,IMMOBILIZING,#350A93-3800-20,AIRBUS" },
  { value: "TOOL,GIMBAL,PN 350A93-3505-00,AIRBUS" },
  { value: "WRENCH,TORQUE,¼DRIVE" },
  { value: "CALIPER,VERNIER,DIGITAL,0.01-305MM RANGE" },
  { value: "PICK SET,RADIATOR HOSE" },
  { value: "PLIERS SET,CIRCLIP" },
  { value: "WRENCH,TORQUE,⅜ DRIVE" },
  { value: "WRENCH,TORQUE,½ DRIVE" },
  { value: "AIRCRAFT TUG, AMA - 5170, WHITE/TOYOTA/MODEL" },
  { value: "02-2TD25; YEAR 2012" },
  { value: "LIDAR, STATIC, PORTABLE" },
];

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
  if (!dateValue) return 0;

  const parsed = new Date(dateValue);
  if (!Number.isNaN(parsed.getTime())) {
    return parsed.getTime();
  }

  const [month, day, year] = String(dateValue || "")
    .split("/")
    .map(Number);
  const slashDate = new Date(year, month - 1, day).getTime();
  return Number.isNaN(slashDate) ? 0 : slashDate;
};

const toSummaryRecord = (record) => ({
  ...record,
  noOfItems: record.items?.length || 0,
  totalQty:
    record.items?.reduce((sum, item) => sum + (item.quantity || 0), 0) || 0,
});

const normalizeRequisitionRecord = (record) =>
  toSummaryRecord({
    ...record,
    status:
      record.status === "Pending"
        ? "Parts Requested"
        : record.status === "Completed"
          ? "Delivered"
          : record.status,
    dateRequested: record.dateRequested || record.createdAt || "",
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
  const debouncedSearchText = useDebouncedValue(searchText, 300);
  const [selectedStatus, setSelectedStatus] = useState("all");
  const [dateSortOrder, setDateSortOrder] = useState("newest");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(false);
  const [requisitions, setRequisitions] = useState([]);
  const [targetRecord, setTargetRecord] = useState(null);
  const [aircraftOptions, setAircraftOptions] = useState([]);
  const [isEntryModalOpen, setIsEntryModalOpen] = useState(false);
  const [isSubmittingEntry, setIsSubmittingEntry] = useState(false);
  const [exportingReport, setExportingReport] = useState(false);
  const [entryForm] = Form.useForm();

  const [requisitionItems, setRequisitionItems] = useState([]);
  const [editingItemKey, setEditingItemKey] = useState(null);

  const [itemEntry, setItemEntry] = useState({
    particular: "",
    quantity: 1,
    unit: "PC",
    purpose: "",
  });

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
    "warehouse personnel",
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
  const isWarehouseStaff = userRole === "warehouse personnel";
  const warehouseRequisitions = useMemo(() => requisitions, [requisitions]);

  const statusFilters = useMemo(() => {
    if (isManager) {
      return [
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

    if (debouncedSearchText.trim()) {
      data = data.filter((record) =>
        matchesSearch(debouncedSearchText, record),
      );
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
    debouncedSearchText,
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
    entryForm.resetFields();

    setItemEntry({
      particular: "",
      quantity: 1,
      unit: "PC",
      purpose: "",
    });

    setRequisitionItems([]);
    setEditingItemKey(null);
    setIsEntryModalOpen(true);
  };

  const closeAddRequisitionModal = () => {
    setIsEntryModalOpen(false);
    entryForm.resetFields();

    setItemEntry({
      particular: "",
      quantity: 1,
      unit: "PC",
      purpose: "",
    });

    setRequisitionItems([]);
    setEditingItemKey(null);
  };

  const buildRequestItemsPayload = (items = []) =>
    items.map((item, index) => ({
      itemNo: index + 1,
      particular: String(item.particular || "").trim(),
      quantity: Number(item.quantity) || 0,
      unitOfMeasure: item.unit || "PC",
      purpose: String(item.purpose || "").trim(),
      availableQty: 0,
      stockStatus: "Parts Requested",
    }));

  const handleExportRequisitionExcel = async (record) => {
    if (!isWarehouseStaff || !record?._id) return;

    try {
      const response = await fetch(
        `${API_BASE}/api/parts-requisition/${record._id}/export-excel`,
        {
          method: "GET",
          headers: await getAuthHeader(),
        },
      );

      if (!response.ok) {
        const payload = await response.json().catch(() => null);
        throw new Error(payload?.message || "Failed to export Excel file");
      }

      const blob = await response.blob();
      const downloadUrl = window.URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = downloadUrl;
      link.download = `${record.wrsNo || "parts-requisition"}.xlsx`;
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(downloadUrl);
      setPopup({
        open: true,
        status: "success",
        title: "Excel Exported!",
        subTitle: `${record.wrsNo || "Parts requisition"} exported successfully.`,
      });
    } catch (err) {
      setPopup({
        open: true,
        status: "error",
        title: "Operation failed!",
        subTitle: err.message || "Failed to export Excel file.",
      });
    }
  };

  const handleExportMonitoringReport = async () => {
    if (!isWarehouseStaff || exportingReport) return;

    setExportingReport(true);
    try {
      await exportPartsRequisitionMonitoringReport({
        data: filteredRequisitions,
        selectedStatus,
        setPopup,
      });
    } finally {
      setExportingReport(false);
    }
  };

  const handleAddItem = () => {
    const particular = String(itemEntry.particular || "").trim();
    const quantity = Number(itemEntry.quantity);
    const unit = itemEntry.unit || "PC";
    const purpose = String(itemEntry.purpose || "").trim();

    if (!particular) {
      message.error("Please enter a particular.");
      return;
    }

    if (!Number.isFinite(quantity) || quantity < 1) {
      message.error("Quantity must be at least 1.");
      return;
    }

    const normalizedParticular = particular.toLowerCase();

    const duplicateItem = requisitionItems.find(
      (item) =>
        item.key !== editingItemKey &&
        String(item.particular || "")
          .trim()
          .toLowerCase() === normalizedParticular,
    );

    if (duplicateItem) {
      message.warning("This item has already been added to the requisition.");
      return;
    }

    if (editingItemKey) {
      setRequisitionItems((prev) =>
        prev.map((item) =>
          item.key === editingItemKey
            ? {
                ...item,
                particular,
                quantity,
                unit,
                purpose,
              }
            : item,
        ),
      );

      message.success("Item updated successfully.");
      setEditingItemKey(null);
    } else {
      setRequisitionItems((prev) => [
        ...prev,
        {
          key: crypto.randomUUID(),
          particular,
          quantity,
          unit,
          purpose,
        },
      ]);

      message.success("Item added.");
    }

    setItemEntry({
      particular: "",
      quantity: 1,
      unit: "PC",
      purpose: "",
    });
  };

  const handleEditItem = (record) => {
    setEditingItemKey(record.key);

    setItemEntry({
      particular: record.particular || "",
      quantity: record.quantity || null,
      unit: record.unit || "PC",
      purpose: record.purpose || "",
    });
  };

  const handleCancelEditItem = () => {
    setEditingItemKey(null);

    setItemEntry({
      particular: "",
      quantity: 1,
      unit: "PC",
      purpose: "",
    });
  };

  const handleRemoveItem = (key) => {
    setRequisitionItems((prev) => prev.filter((item) => item.key !== key));

    if (editingItemKey === key) {
      handleCancelEditItem();
    }
  };

  const handleAddRequisition = async () => {
    try {
      const values = await entryForm.validateFields();

      if (requisitionItems.length === 0) {
        message.error("Please add at least one item.");
        return;
      }

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
            items: buildRequestItemsPayload(requisitionItems),
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
        {isWarehouseStaff && (
          <Col
            xs={24}
            md={10}
            lg={10}
            style={{ textAlign: screens.xs ? "left" : "right" }}
          >
            <Button
              size="large"
              icon={<FilePdfOutlined />}
              loading={exportingReport}
              disabled={filteredRequisitions.length === 0}
              onClick={handleExportMonitoringReport}
              style={{ width: screens.xs ? "100%" : undefined }}
            >
              Export Report (PDF)
            </Button>
          </Col>
        )}
        {!isManager && !isWarehouseStaff && (
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
        onExportExcel={isWarehouseStaff ? handleExportRequisitionExcel : null}
      />

      <Modal
        title="Add Requisition"
        open={isEntryModalOpen}
        onCancel={closeAddRequisitionModal}
        onOk={handleAddRequisition}
        confirmLoading={isSubmittingEntry}
        okText="Submit"
        cancelText="Cancel"
        width="min(90%, calc(100vw - 24px))"
        centered
        zIndex={3000}
        destroyOnHidden
        styles={{
          body: {
            height: screens.xs ? "auto" : "100%",
            maxHeight: screens.xs ? "calc(100vh - 140px)" : "100%",
            overflowY: "auto",
            padding: screens.xs ? "0" : "16px 24px",
          },
        }}
      >
        <Form form={entryForm} layout="vertical">
          <Form.Item
            label="Aircraft"
            name="aircraft"
            rules={[
              {
                required: true,
                message: "Please choose an aircraft.",
              },
            ]}
          >
            <Select
              size="large"
              placeholder="Choose Aircraft"
              options={aircraftOptions}
              showSearch={{
                optionFilterProp: "label",
              }}
            />
          </Form.Item>

          {/* Item Entry */}
          <div
            style={{
              marginTop: 20,
              marginBottom: 24,
              padding: 16,
              border: "1px solid #d9d9d9",
              borderRadius: 6,
              background: "#fafafa",
            }}
          >
            <Typography.Text
              strong
              style={{
                display: "block",
                marginBottom: 16,
              }}
            >
              Add Item
            </Typography.Text>

            <Row gutter={[12, 0]} align="bottom">
              <Col xs={24} md={8}>
                <div style={{ marginBottom: 8 }}>
                  <Typography.Text>Particular</Typography.Text>
                </div>

                <AutoComplete
                  size="large"
                  value={itemEntry.particular}
                  options={options}
                  placeholder="Enter or select particular"
                  style={{ width: "100%" }}
                  onChange={(value) =>
                    setItemEntry((prev) => ({
                      ...prev,
                      particular: value,
                    }))
                  }
                  showSearch={{
                    filterOption: (inputValue, option) =>
                      option?.value
                        ?.toUpperCase()
                        .includes(inputValue.toUpperCase()),
                  }}
                />
              </Col>

              <Col xs={24} sm={8} md={3}>
                <div style={{ marginBottom: 8 }}>
                  <Typography.Text>Quantity</Typography.Text>
                </div>

                <InputNumber
                  size="large"
                  min={1}
                  value={itemEntry.quantity ?? 1}
                  placeholder="Enter Quantity"
                  style={{ width: "100%" }}
                  onChange={(value) =>
                    setItemEntry((prev) => ({
                      ...prev,
                      quantity: value,
                    }))
                  }
                />
              </Col>

              <Col xs={24} sm={8} md={4}>
                <div style={{ marginBottom: 8 }}>
                  <Typography.Text>Unit</Typography.Text>
                </div>

                <Select
                  size="large"
                  value={itemEntry.unit}
                  options={WRS_UOM_OPTIONS}
                  style={{ width: "100%" }}
                  onChange={(value) =>
                    setItemEntry((prev) => ({
                      ...prev,
                      unit: value,
                    }))
                  }
                />
              </Col>

              <Col xs={24} sm={16} md={6}>
                <div style={{ marginBottom: 8 }}>
                  <Typography.Text>Purpose</Typography.Text>
                </div>

                <Input
                  size="large"
                  value={itemEntry.purpose}
                  placeholder="Optional"
                  onChange={(e) =>
                    setItemEntry((prev) => ({
                      ...prev,
                      purpose: e.target.value,
                    }))
                  }
                />
              </Col>

              <Col xs={24} sm={8} md={3}>
                <Space
                  size={8}
                  style={{
                    width: "100%",
                    display: "flex",
                  }}
                >
                  <Button
                    type="primary"
                    size="large"
                    icon={!editingItemKey ? <PlusOutlined /> : <SaveOutlined />}
                    onClick={handleAddItem}
                    style={{ flex: 1 }}
                  >
                    {editingItemKey ? "Update" : "Add"}
                  </Button>

                  {editingItemKey && (
                    <Button
                      type="link"
                      size="large"
                      onClick={handleCancelEditItem}
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
          </div>

          {/* Items Table */}
          <div>
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                marginBottom: 12,
              }}
            >
              <Typography.Text strong>Requisition Items</Typography.Text>

              <Typography.Text type="secondary">
                {requisitionItems.length} item
                {requisitionItems.length !== 1 ? "s" : ""}
              </Typography.Text>
            </div>

            <Table
              bordered
              size="small"
              rowKey="key"
              dataSource={requisitionItems}
              onRow={(record) => ({
                onClick: () => handleEditItem(record),
                style: {
                  cursor: "pointer",
                  background:
                    editingItemKey === record.key ? "#e6f4ff" : undefined,
                },
              })}
              pagination={
                requisitionItems.length > 5
                  ? {
                      pageSize: 5,
                      showSizeChanger: false,
                      showQuickJumper: false,
                      size: "small",
                      showTotal: (total, range) =>
                        `${range[0]}-${range[1]} of ${total}`,
                    }
                  : false
              }
              scroll={{ x: 700 }}
              columns={[
                {
                  title: "#",
                  width: 50,
                  align: "center",
                  render: (_, __, index) => index + 1,
                },
                {
                  title: "Particular",
                  dataIndex: "particular",
                  width: 240,
                  ellipsis: true,
                },
                {
                  title: "Quantity",
                  dataIndex: "quantity",
                  width: 90,
                  align: "center",
                },
                {
                  title: "Unit",
                  dataIndex: "unit",
                  width: 80,
                  align: "center",
                },
                {
                  title: "Purpose",
                  dataIndex: "purpose",
                  width: 220,
                  ellipsis: true,
                  render: (value) => value || "—",
                },
                {
                  title: "Action",
                  width: 70,
                  fixed: "right",
                  align: "center",
                  render: (_, record) => (
                    <Button
                      danger
                      type="text"
                      icon={<DeleteOutlined />}
                      onClick={(event) => {
                        event.stopPropagation();
                        handleRemoveItem(record.key);
                      }}
                    />
                  ),
                },
              ]}
              locale={{
                emptyText: "No items added yet.",
              }}
            />
          </div>
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
