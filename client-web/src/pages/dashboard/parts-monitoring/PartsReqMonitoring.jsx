import React, { useContext, useMemo, useState, useEffect } from "react";
import {
  Alert,
  Card,
  Col,
  Input,
  Row,
  Select,
  Statistic,
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
import PRMCardView from "../../../components/tables/PRMCardView";
import { AuthContext } from "../../../context/AuthContext";
import { API_BASE } from "../../../utils/API_BASE";

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
  const { user, getAuthHeader } = useContext(AuthContext);
  const [searchText, setSearchText] = useState("");
  const [activeTab, setActiveTab] = useState("pending");
  const [selectedStatus, setSelectedStatus] = useState("all");
  const [dateSortOrder, setDateSortOrder] = useState("newest");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(false);
  const [requisitions, setRequisitions] = useState([]);
  const userRole = user?.jobTitle?.toLowerCase() || "";
  const isWarehouseDepartment = userRole === "warehouse department";

  if (!isWarehouseDepartment) {
    return <Navigate to="/dashboard/profile" replace />;
  }

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

  const statusCards = useMemo(() => {
    const pendingCards = [
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

    const completedCards = [
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

    return activeTab === "completed" ? completedCards : pendingCards;
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

  const handleAllRequisitions = async () => {
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
  };

  useEffect(() => {
    handleAllRequisitions();
  }, [getAuthHeader]);

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
        <Col xs={24} md={8} lg={6}>
          <Select
            size="large"
            value={selectedStatus}
            onChange={setSelectedStatus}
            style={{ width: "100%" }}
            options={statusOptions}
          />
        </Col>
        <Col xs={24} md={8} lg={6}>
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

      <Row gutter={[10, 10]} style={{ marginBottom: 10 }}>
        {statusCards.map((card) => {
          const isSelected = selectedStatus === card.key;
          return (
            <Col xs={12} sm={8} md={6} lg={4} key={card.key}>
              <Card
                size="small"
                hoverable
                onClick={() => setSelectedStatus(card.key)}
                style={{
                  borderRadius: 12,
                  cursor: "pointer",
                  border: `1px solid ${isSelected ? "#1677ff" : "#f0f0f0"}`,
                  boxShadow: isSelected
                    ? "0 6px 14px rgba(22,119,255,0.2)"
                    : "none",
                }}
              >
                <Statistic
                  title={card.title}
                  value={card.count}
                  prefix={card.icon}
                  styles={{ content: { fontSize: 18 } }}
                />
              </Card>
            </Col>
          );
        })}
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
      <PRMCardView
        data={filteredRequisitions}
        onUpdated={handleAllRequisitions}
      />
    </div>
  );
}
