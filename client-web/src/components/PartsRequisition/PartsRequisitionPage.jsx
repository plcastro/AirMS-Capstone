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
  Input,
  Row,
  Select,
  Space,
  Tabs,
  Typography,
} from "antd";
import {
  CheckCircleOutlined,
  CloseCircleOutlined,
  FileDoneOutlined,
  InboxOutlined,
  SearchOutlined,
  ShoppingCartOutlined,
  SyncOutlined,
} from "@ant-design/icons";
import { Navigate } from "react-router-dom";
import { useLocation, useNavigate } from "react-router-dom";
import PRMTable from "../tables/PRMTable";
import { AuthContext } from "../../context/AuthContext";
import { API_BASE } from "../../utils/API_BASE";

const { Text } = Typography;

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
  const location = useLocation();
  const navigate = useNavigate();
  const { user, getAuthHeader } = useContext(AuthContext);
  const [searchText, setSearchText] = useState("");
  const [activeTab, setActiveTab] = useState("pending");
  const [selectedStatus, setSelectedStatus] = useState("all");
  const [dateSortOrder, setDateSortOrder] = useState("newest");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(false);
  const [requisitions, setRequisitions] = useState([]);
  const [targetRecord, setTargetRecord] = useState(null);
  const userRole = user?.jobTitle?.toLowerCase() || "";
  const allowedRoles = [
    "warehouse department",
    "maintenance manager",
    "officer-in-charge",
    "mechanic",
  ];
  const canAccessPartsRequisition = allowedRoles.includes(userRole);
  const isManager = ["maintenance manager", "officer-in-charge"].includes(
    userRole,
  );

  const warehouseRequisitions = useMemo(() => requisitions, [requisitions]);

  const stats = useMemo(
    () => ({
      total: warehouseRequisitions.length,
      pending: warehouseRequisitions.filter(
        (record) => !["Approved", "Delivered", "Completed", "Cancelled"].includes(String(record.status || "")),
      ).length,
      approved: warehouseRequisitions.filter((record) =>
        ["Approved"].includes(String(record.status || "")),
      ).length,
      forReview: warehouseRequisitions.filter((record) =>
        ["Availability Checked", "Ordered"].includes(String(record.status || "")),
      ).length,
      closed: warehouseRequisitions.filter((record) =>
        ["Delivered", "Completed", "Cancelled"].includes(String(record.status || "")),
      ).length,
    }),
    [warehouseRequisitions],
  );

  const tabItems = useMemo(
    () =>
      isManager
        ? [
            { key: "for_review", label: `For Review (${stats.forReview})` },
            { key: "closed", label: `Closed (${stats.closed})` },
          ]
        : [
            { key: "pending", label: `Pending (${stats.pending})` },
            { key: "approved", label: `Approved (${stats.approved})` },
            { key: "closed", label: `Closed (${stats.closed})` },
          ],
    [isManager, stats],
  );

  const statusFilters = useMemo(() => {
    const allFilters = [
      {
        key: "all",
        title: "All",
        icon: <InboxOutlined />,
        count: warehouseRequisitions.length,
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

    return allFilters;
  }, [warehouseRequisitions]);

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

    if (isManager) {
      if (activeTab === "for_review") {
        data = data.filter((record) =>
          ["Availability Checked", "Ordered"].includes(String(record.status || "")),
        );
      } else {
        data = data.filter((record) =>
          ["Delivered", "Completed", "Cancelled"].includes(String(record.status || "")),
        );
      }
    } else if (activeTab === "pending") {
      data = data.filter((record) =>
        !["Approved", "Delivered", "Completed", "Cancelled"].includes(String(record.status || "")),
      );
    } else if (activeTab === "approved") {
      data = data.filter((record) => String(record.status || "") === "Approved");
    } else {
      data = data.filter((record) =>
        ["Delivered", "Completed", "Cancelled"].includes(String(record.status || "")),
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
    isManager,
    dateSortOrder,
    searchText,
    selectedStatus,
    warehouseRequisitions,
  ]);

  useEffect(() => {
    setSelectedStatus("all");
  }, [activeTab]);

  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const targetRequestId = params.get("targetRequestId");
    if (!targetRequestId || !warehouseRequisitions.length) return;

    const matched = warehouseRequisitions.find(
      (record) => String(record._id) === String(targetRequestId),
    );
    if (!matched) return;

    if (isManager) {
      setActiveTab(
        ["Delivered", "Completed", "Cancelled"].includes(String(matched.status || ""))
          ? "closed"
          : "for_review",
      );
    } else if (["Delivered", "Completed", "Cancelled"].includes(String(matched.status || ""))) {
      setActiveTab("closed");
    } else if (String(matched.status || "") === "Approved") {
      setActiveTab("approved");
    } else {
      setActiveTab("pending");
    }

    setTargetRecord(matched);
    navigate("/dashboard/parts-requisition", { replace: true });
  }, [isManager, location.search, navigate, warehouseRequisitions]);

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

  useEffect(() => {
    handleAllRequisitions();
  }, [handleAllRequisitions]);

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
                  style={{ fontWeight: 600 }}
                  size="large"
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
        key={targetRecord?._id || "prm-table"}
        data={filteredRequisitions}
        loading={loading}
        onUpdated={handleAllRequisitions}
        initialSelectedRecord={targetRecord}
      />
    </div>
  );
}
