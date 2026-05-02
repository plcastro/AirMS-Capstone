import React, { useState, useEffect, useContext, useMemo } from "react";
import {
  Input,
  Button,
  Divider,
  TreeSelect,
  message,
  Grid,
  Card,
  Statistic,
  Row,
  Col,
  Typography,
} from "antd";
import { SDMChart } from "../../../components/common/PieChart";
import UserTable from "../../../components/tables/UserTable";
import UserForm from "../../../components/common/UserForm";
import { API_BASE } from "../../../utils/API_BASE";
import { UserAddOutlined, FilterOutlined } from "@ant-design/icons";
import { AuthContext } from "../../../context/AuthContext";
const { Title } = Typography;
const { useBreakpoint } = Grid;

const accessLevelData = [
  {
    title: "Job Title",
    value: "pos-parent",
    selectable: false,
    children: [
      { title: "Admin", value: "Admin_job" },
      { title: "Maintenance Manager", value: "Maintenance Manager" },
      { title: "Pilot", value: "Pilot" },
      { title: "Officer-In-Charge", value: "Officer-In-Charge" },
      { title: "Mechanic", value: "Mechanic" },
      { title: "Warehouse Department", value: "Warehouse Department" },
    ],
  },
  {
    title: "Access Level",
    value: "access-parent",
    selectable: false,
    children: [
      { title: "Admin", value: "Admin_access" }, // Note: unique value if overlaps with jobTitle
      { title: "Superuser", value: "Superuser" },
      { title: "User", value: "User" },
    ],
  },
  {
    title: "Status",
    value: "status-parent",
    selectable: false,
    children: [
      { title: "Active", value: "active" },
      { title: "Inactive", value: "inactive" },
      { title: "Deactivated", value: "deactivated" },
    ],
  },
];

export default function UserManagement() {
  const screens = useBreakpoint();
  const isMobile = !screens.md;
  const { getValidToken } = useContext(AuthContext);
  const [allUsers, setAllUsers] = useState([]);
  const [filteredUsers, setFilteredUsers] = useState([]);
  const [showModal, setShowModal] = useState(false);
  const [editingUser, setEditingUser] = useState(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [currentUserId, setCurrentUserId] = useState(null);
  const [loading, setLoading] = useState(false);

  const statusCounts = useMemo(() => {
    const counts = { active: 0, inactive: 0, deactivated: 0, unknown: 0 };

    allUsers.forEach((user) => {
      const status = (user.status || "unknown").toLowerCase();
      if (counts[status] !== undefined) counts[status]++;
      else counts.unknown++;
    });

    return counts;
  }, [allUsers]);

  const roleCounts = useMemo(() => {
    const counts = {};

    allUsers.forEach((user) => {
      const role = user.jobTitle || "Unknown";
      counts[role] = (counts[role] || 0) + 1;
    });

    return counts;
  }, [allUsers]);

  const roleColors = [
    "#1890ff",
    "#52c41a",
    "#faad14",
    "#13c2c2",
    "#f5222d",
    "#722ed1",
    "#eb2f96",
  ];

  const statusColorMap = {
    active: "#52c41a",
    inactive: "#faad14",
    deactivated: "#f5222d",
    unknown: "#d9d9d9",
  };

  const roleChartData = Object.entries(roleCounts).map(
    ([name, value], index) => ({
      name,
      value,
      fill: roleColors[index % roleColors.length],
    }),
  );

  const statusChartData = Object.entries(statusCounts).map(([name, value]) => ({
    name: name.charAt(0).toUpperCase() + name.slice(1),
    value,
    fill: statusColorMap[name] || "#d9d9d9",
  }));
  const maskEmail = (email) => {
    if (!email) return "";

    const [name, domain] = email.split("@");
    if (!name || !domain) return email;

    const visible = name.slice(0, 2);
    const masked = "*".repeat(Math.max(name.length - 2, 0));

    return `${visible}${masked}@${domain}`;
  };

  const formatUserForTable = (u, index = null) => ({
    ...u,
    ...(index !== null ? { index } : {}),
    fullname: `${u.firstName || ""} ${u.lastName || ""}`.trim(),
    maskedEmail: maskEmail(u.email),
    dateCreated: u.dateCreated
      ? new Date(u.dateCreated).toLocaleString()
      : "N/A",
  });
  // Filtering states
  const [treeValue, setTreeValue] = useState(undefined);

  const headers = [
    { label: "Fullname", key: "fullname" },
    { label: "Username", key: "username" },
    { label: "Email", key: "maskedEmail" },
    { label: "JobTitle", key: "jobTitle" },
    { label: "Access Control", key: "access" },
    { label: "Status", key: "status" },
    { label: "Invite Status", key: "invitationStatus" },
    { label: "Date and Time Created", key: "dateCreated" },
    { label: "Actions", key: "actions", fixed: "right", width: 150 },
  ];

  // Load current user for deactivation protection
  useEffect(() => {
    const storedUser = localStorage.getItem("currentUser");
    if (storedUser) {
      try {
        const parsed = JSON.parse(storedUser);
        setCurrentUserId(parsed.userid || parsed._id || parsed.id);
      } catch (err) {
        console.error(err);
      }
    }
  }, []);

  const fetchUsers = async () => {
    setLoading(true);
    try {
      const token = await getValidToken();
      const res = await fetch(`${API_BASE}/api/user/get-all-users`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
      const json = await res.json();
      if (Array.isArray(json.data)) {
        const now = Date.now();
        const formatted = json.data.map((u, idx) =>
          formatUserForTable(
            {
              ...u,
              invitationStatus:
                u.invitationStatus ||
                (u.status === "active"
                  ? "claimed"
                  : u.tempPasswordExpires &&
                      new Date(u.tempPasswordExpires).getTime() < now
                    ? "expired"
                    : "pending"),
              invitationExpiresAt:
                u.invitationExpiresAt || u.tempPasswordExpires || null,
            },
            idx + 1,
          ),
        );
        setAllUsers(formatted);
        setFilteredUsers(formatted);
      } else {
        message.warning("No user records returned by the server");
      }
    } catch (err) {
      console.error(err);
      message.error(err.message || "Failed to load users");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  useEffect(() => {
    let filtered = [...allUsers];

    if (treeValue) {
      filtered = filtered.filter((u) => {
        if (treeValue === "Admin_job") return u.jobTitle === "Admin";
        if (treeValue === "Admin_access") return u.access === "Admin";

        return (
          u.jobTitle === treeValue ||
          u.access === treeValue ||
          u.status?.toLowerCase() === treeValue.toLowerCase()
        );
      });
    }

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      filtered = filtered.filter((u) =>
        [
          u.fullname,
          u.username,
          u.email,
          u.jobTitle,
          u.access,
          u.invitationStatus,
        ]
          .join(" ")
          .toLowerCase()
          .includes(q),
      );
    }

    setFilteredUsers(filtered);
  }, [allUsers, treeValue, searchQuery]);

  const handleAddUser = () => {
    setEditingUser(null);
    setShowModal(true);
  };
  const handleEditUser = (user) => {
    setEditingUser(user);
    setShowModal(true);
  };

  const handleDeactivateUser = async (user) => {
    if (user._id === currentUserId) return;
    try {
      const token = await getValidToken();
      const response = await fetch(
        `${API_BASE}/api/user/update-user-status/${user._id}`,
        {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({ status: "deactivated" }),
        },
      );
      const data = await response.json().catch(() => ({}));

      if (!response.ok) {
        throw new Error(data.message || "Failed to deactivate user");
      }

      message.success(`User ${user.username || user.fullname} deactivated`);
      fetchUsers();
    } catch (error) {
      message.error(error.message || "Failed to deactivate user");
    }
  };

  const runInviteAction = async (endpoint, method = "PUT", payload = null) => {
    const token = await getValidToken();
    const response = await fetch(`${API_BASE}${endpoint}`, {
      method,
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: payload ? JSON.stringify(payload) : undefined,
    });

    const data = await response.json().catch(() => ({}));
    if (!response.ok) {
      throw new Error(data.message || "Request failed");
    }

    return data;
  };

  const handleResendInvite = async (user) => {
    try {
      await runInviteAction(`/api/user/resend-activation/${user._id}`, "POST");
      message.success(`Activation email resent to ${user.email}`);
      fetchUsers();
    } catch (error) {
      message.error(error.message || "Failed to resend invite");
    }
  };

  const handleExtendInvite = async (user) => {
    try {
      await runInviteAction(
        `/api/user/extend-invitation-expiry/${user._id}`,
        "PUT",
        {
          hours: 24,
        },
      );
      message.success("Invitation expiry extended by 24 hours");
      fetchUsers();
    } catch (error) {
      message.error(error.message || "Failed to extend invitation");
    }
  };

  const handleRevokeInvite = async (user) => {
    try {
      await runInviteAction(`/api/user/revoke-invitation/${user._id}`, "PUT");
      message.success("Invitation revoked");
      fetchUsers();
    } catch (error) {
      message.error(error.message || "Failed to revoke invitation");
    }
  };

  const handleReactivateUser = async (user) => {
    try {
      const token = await getValidToken();
      const response = await fetch(
        `${API_BASE}/api/user/update-user-status/${user._id}`,
        {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({ status: "active" }),
        },
      );
      const data = await response.json().catch(() => ({}));

      if (!response.ok) {
        throw new Error(data.message || "Failed to reactivate user");
      }

      message.success(`User ${user.username || user.fullname} reactivated`);
      fetchUsers();
    } catch (error) {
      message.error(error.message || "Failed to reactivate user");
    }
  };

  const handleModalClose = () => {
    setShowModal(false);
    setEditingUser(null);
  };
  const handleUserSaved = (updatedUser) => {
    setAllUsers((prevUsers) => {
      if (!updatedUser._id) return prevUsers;
      const index = prevUsers.findIndex((u) => u._id === updatedUser._id);
      if (index !== -1) {
        const newUsers = [...prevUsers];
        newUsers[index] = formatUserForTable(
          { ...newUsers[index], ...updatedUser },
          newUsers[index].index ?? index + 1,
        );
        return newUsers;
      }
      return [
        ...prevUsers,
        formatUserForTable(updatedUser, prevUsers.length + 1),
      ];
    });

    handleModalClose();
  };

  return (
    <div
      style={{
        padding: isMobile ? 12 : 20,
        maxWidth: "100%",
        paddingBottom: 24,
      }}
    >
      <Row gutter={[12, 12]} style={{ marginBottom: 20 }}>
        <Col xs={12} sm={12} md={6}>
          <Card loading={loading} size="small">
            <Statistic title="Total Users" value={allUsers.length} />
          </Card>
        </Col>

        <Col xs={12} sm={12} md={6}>
          <Card loading={loading} size="small">
            <Statistic title="Active" value={statusCounts.active} />
          </Card>
        </Col>

        <Col xs={12} sm={12} md={6}>
          <Card loading={loading} size="small">
            <Statistic title="Inactive" value={statusCounts.inactive} />
          </Card>
        </Col>

        <Col xs={12} sm={12} md={6}>
          <Card loading={loading} size="small">
            <Statistic title="Deactivated" value={statusCounts.deactivated} />
          </Card>
        </Col>
      </Row>
      <Row
        gutter={[12, 12]}
        align="middle"
        justify="space-between"
        style={{ marginBottom: 20 }}
      >
        {/* LEFT SIDE: search + filter */}
        <Col xs={24} md={18}>
          <Row gutter={[12, 12]}>
            <Col xs={16} md={12}>
              <Input
                placeholder="Search user"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                allowClear
                size="large"
              />
            </Col>

            <Col xs={8} md={6}>
              <TreeSelect
                value={treeValue}
                style={{ width: "100%" }}
                styles={{
                  popup: {
                    root: { maxHeight: 400, overflow: "auto", width: 240 },
                  },
                }}
                treeData={accessLevelData}
                placeholder="Filter"
                treeDefaultExpandAll
                onChange={setTreeValue}
                allowClear
                icon={<FilterOutlined />}
                size="large"
              />
            </Col>
          </Row>
        </Col>

        {/* RIGHT SIDE: button */}
        <Col xs={24} md={6} style={{ textAlign: isMobile ? "left" : "right" }}>
          <Button
            type="primary"
            onClick={handleAddUser}
            style={{
              width: isMobile ? "100%" : 120,
              height: 40,
            }}
            icon={<UserAddOutlined />}
          >
            Add User
          </Button>
        </Col>
      </Row>

      {/* <Row gutter={[12, 12]} style={{ marginBottom: 20 }}>
        <Col xs={24} lg={12}>
          <Card title="Role Distribution" size="small">
            <SDMChart
              data={roleChartData}
              height={260}
              outerRadius={74}
              onClick={(data) => {
                if (!data?.name) return;
                setTreeValue(data.name);
              }}
            />
          </Card>
        </Col>

        <Col xs={24} lg={12}>
          <Card title="Account Status Distribution" size="small">
            <SDMChart
              data={statusChartData}
              height={260}
              outerRadius={74}
              onClick={(data) => {
                if (!data?.name) return;
                setTreeValue(data.name.toLowerCase());
              }}
            />
          </Card>
        </Col>
      </Row> */}
      <Divider />

      <UserTable
        headers={headers}
        data={filteredUsers}
        onEditUser={handleEditUser}
        onDeactivateUser={handleDeactivateUser}
        onReactivateUser={handleReactivateUser}
        onResendInvite={handleResendInvite}
        onExtendInvite={handleExtendInvite}
        onRevokeInvite={handleRevokeInvite}
        currentUserId={currentUserId}
        loading={loading}
      />

      <div style={{ marginTop: 15 }}>
        Showing {filteredUsers.length} of {allUsers.length} users
      </div>

      {showModal && (
        <UserForm
          visible={showModal}
          user={editingUser}
          onClose={handleModalClose}
          onUserSaved={handleUserSaved}
          allUsers={allUsers}
        />
      )}
    </div>
  );
}
