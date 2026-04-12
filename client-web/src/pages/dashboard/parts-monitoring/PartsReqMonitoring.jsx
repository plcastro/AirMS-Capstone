import React, { useContext, useMemo, useState, useEffect } from "react";
import {
  Alert,
  Card,
  Col,
  Input,
  Row,
  Select,
  Statistic,
  Typography,
} from "antd";
import {
  CheckCircleOutlined,
  InboxOutlined,
  SearchOutlined,
  SyncOutlined,
  FileDoneOutlined,
  ShoppingCartOutlined,
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
        record.staff?.employeeName ||
        record.staff?.requisitioner ||
        "",
    },
  });

export default function PartsRequisition() {
  const { user, getAuthHeader } = useContext(AuthContext);
  const [searchText, setSearchText] = useState("");
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

  const warehouseRequisitions = useMemo(
    () =>
      requisitions.filter((record) =>
        ["Parts Requested", "To Be Ordered", "Ordered", "Approved", "Delivered"].includes(record.status),
      ),
    [requisitions],
  );

  const stats = useMemo(
    () => ({
      total: warehouseRequisitions.length,
      requested: warehouseRequisitions.filter((r) => r.status === "Parts Requested")
        .length,
      toBeOrdered: warehouseRequisitions.filter(
        (r) => r.status === "To Be Ordered",
      ).length,
      ordered: warehouseRequisitions.filter((r) => r.status === "Ordered").length,
      approved: warehouseRequisitions.filter((r) => r.status === "Approved").length,
      delivered: warehouseRequisitions.filter((r) => r.status === "Delivered")
        .length,
    }),
    [warehouseRequisitions],
  );

  const cards = useMemo(
    () => [
      {
        title: "Total Queue",
        value: stats.total,
        icon: <InboxOutlined />,
        statusKey: "all",
        accent: "#595959",
        bg: "#fafafa",
      },
      {
        title: "Parts Requested",
        value: stats.requested,
        icon: <CheckCircleOutlined />,
        statusKey: "Parts Requested",
        accent: "#595959",
        bg: "#fafafa",
      },
      {
        title: "To Be Ordered",
        value: stats.toBeOrdered,
        icon: <ShoppingCartOutlined />,
        statusKey: "To Be Ordered",
        accent: "#d46b08",
        bg: "#fff7e6",
      },
      {
        title: "Ordered",
        value: stats.ordered,
        icon: <SyncOutlined />,
        statusKey: "Ordered",
        accent: "#1565C0",
        bg: "#e6f4ff",
      },
      {
        title: "Approved",
        value: stats.approved,
        icon: <CheckCircleOutlined />,
        statusKey: "Approved",
        accent: "#08979c",
        bg: "#e6fffb",
      },
      {
        title: "Delivered",
        value: stats.delivered,
        icon: <FileDoneOutlined />,
        statusKey: "Delivered",
        accent: "#389e0d",
        bg: "#f6ffed",
      },
    ],
    [stats],
  );

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
  }, [dateSortOrder, searchText, selectedStatus, warehouseRequisitions]);

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

      console.log("Requisitions:", data);
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
      </Row>

      <Row gutter={[16, 16]} style={{ marginTop: 10, marginBottom: 10 }}>
        {cards.map((card) => {
          const isSelected = selectedStatus === card.statusKey;

          return (
            <Col xs={12} sm={12} xl={6} key={card.statusKey}>
              <Card
                hoverable
                onClick={() => setSelectedStatus(card.statusKey)}
                variant="borderless"
                style={{
                  borderRadius: 18,
                  cursor: "pointer",
                  background: card.bg,
                  border: `2px solid ${isSelected ? card.accent : "transparent"}`,
                  boxShadow: isSelected
                    ? `0 10px 24px ${card.accent}22`
                    : "0 8px 20px rgba(0,0,0,0.04)",
                }}
              >
                <Statistic
                  title={card.title}
                  value={card.value}
                  prefix={card.icon}
                  styles={{ content: { color: card.accent } }}
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
      <PRMCardView data={filteredRequisitions} onUpdated={handleAllRequisitions} />
    </div>
  );
}
