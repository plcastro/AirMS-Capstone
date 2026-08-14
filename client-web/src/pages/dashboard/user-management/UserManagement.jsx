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
import ResultPopup from "../../../components/common/ResultPopup";
import UserTable from "../../../components/tables/UserTable";
import UserForm from "../../../components/common/UserForm";
import { API_BASE } from "../../../utils/API_BASE";
import { UserAddOutlined, FilterOutlined } from "@ant-design/icons";
import { AuthContext } from "../../../context/AuthContext";
import { confirmAction } from "../../../utils/confirmAction";
import { matchesSearch } from "../../../utils/search";
const { Text } = Typography;
const { useBreakpoint } = Grid;

const accessLevelData = [
  {
    title: "Job Title",
    value: "pos-parent",
    selectable: false,
    children: [
      { title: "Superadmin", value: "Admin_job" },
      { title: "Maintenance Manager", value: "Maintenance Manager" },
      { title: "Pilot", value: "Pilot" },
      { title: "Officer-In-Charge", value: "Officer-In-Charge" },
      { title: "Mechanic", value: "Mechanic" },
      { title: "Warehouse Staff", value: "Warehouse Staff" },
    ],
  },
  {
    title: "Access Level",
    value: "access-parent",
    selectable: false,
    children: [
      { title: "Superadmin", value: "Admin_access" }, // Note: unique value if overlaps with jobTitle
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

  const [popup, setPopup] = useState({
    open: false,
    status: "success",
    title: "",
    subTitle: "",
  });

  const statusCounts = useMemo(() => {
    const counts = { active: 0, inactive: 0, deactivated: 0, unknown: 0 };

    allUsers.forEach((user) => {
      const status = (user.status || "unknown").toLowerCase();
      if (counts[status] !== undefined) counts[status]++;
      else counts.unknown++;
    });

    return counts;
  }, [allUsers]);

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
    dateCreated: u.dateCreated || null,
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
      setPopup({
        open: true,
        status: "error",
        title: "Operation failed!",
        subTitle: err.message || "Failed to load users",
      });
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
        if (treeValue === "Admin_job") return u.jobTitle === "Superadmin";
        if (treeValue === "Admin_access") return u.access === "Superadmin";

        return (
          u.jobTitle === treeValue ||
          u.access === treeValue ||
          u.status?.toLowerCase() === treeValue.toLowerCase()
        );
      });
    }

    if (searchQuery.trim()) {
      filtered = filtered.filter((u) => matchesSearch(searchQuery, u));
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
    const confirmed = await confirmAction({
      title: "Deactivate User",
      content: `Are you sure you want to deactivate ${user.username || user.fullname}?`,
      okText: "Deactivate",
      okType: "danger",
    });
    if (!confirmed) return;
    try {
      const token = await getValidToken();
      const response = await fetch(
        `${API_BASE}/api/user/update-user-status/${user._id}`,
        {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
            "x-action-confirmed": "true",
          },
          body: JSON.stringify({ status: "deactivated", confirmAction: true }),
        },
      );
      const data = await response.json().catch(() => ({}));

      if (!response.ok) {
        throw new Error(data.message || "Failed to deactivate user");
      }

      setPopup({
        open: true,
        status: "success",
        title: "User Deactivated!",
        subTitle: `User ${user.username || user.fullname} has been deactivated successfully.`,
      });
      fetchUsers();
    } catch (error) {
      setPopup({
        open: true,
        status: "error",
        title: "Operation failed!",
        subTitle: error.message || "Failed to deactivate user",
      });
    }
  };

  const runInviteAction = async (endpoint, method = "PUT", payload = null) => {
    const token = await getValidToken();
    const response = await fetch(`${API_BASE}${endpoint}`, {
      method,
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
        "x-action-confirmed": "true",
      },
      body: JSON.stringify({
        ...(payload || {}),
        confirmAction: true,
      }),
    });

    const data = await response.json().catch(() => ({}));
    if (!response.ok) {
      throw new Error(data.message || "Request failed");
    }

    return data;
  };

  const handleResendInvite = async (user) => {
    const confirmed = await confirmAction({
      title: "Resend Activation Invite",
      content: `Resend activation email to ${user.email}?`,
      okText: "Resend",
    });
    if (!confirmed) return;
    try {
      await runInviteAction(`/api/user/resend-activation/${user._id}`, "POST");
      setPopup({
        open: true,
        status: "success",
        title: "Email Sent!",
        subTitle: `An invitation email has been sent to ${user.email}.`,
      });
      fetchUsers();
    } catch (error) {
      setPopup({
        open: true,
        status: "error",
        title: "Operation failed!",
        subTitle: error.message || "Failed to resend invite",
      });
    }
  };

  const handleExtendInvite = async (user) => {
    const confirmed = await confirmAction({
      title: "Extend Invitation",
      content: `Extend invitation expiry for ${user.email} by 24 hours?`,
      okText: "Extend",
    });
    if (!confirmed) return;
    try {
      await runInviteAction(
        `/api/user/extend-invitation-expiry/${user._id}`,
        "PUT",
        {
          hours: 24,
        },
      );
      setPopup({
        open: true,
        status: "success",
        title: "Invitation Extended!",
        subTitle: "Invitation expiry has been extended by 24 hours.",
      });
      fetchUsers();
    } catch (error) {
      setPopup({
        open: true,
        status: "error",
        title: "Operation failed!",
        subTitle: error.message || "Failed to extend invitation",
      });
    }
  };

  const handleRevokeInvite = async (user) => {
    const confirmed = await confirmAction({
      title: "Revoke Invitation",
      content: `Revoke invitation for ${user.email}?`,
      okText: "Revoke",
      okType: "danger",
    });
    if (!confirmed) return;
    try {
      await runInviteAction(`/api/user/revoke-invitation/${user._id}`, "PUT");
      setPopup({
        open: true,
        status: "success",
        title: "Invitation Revoked!",
        subTitle: "The invitation has been revoked successfully.",
      });
      fetchUsers();
    } catch (error) {
      setPopup({
        open: true,
        status: "error",
        title: "Operation failed!",
        subTitle: error.message || "Failed to revoke invitation",
      });
    }
  };

  const handleUnlockUser = async (user) => {
    const confirmed = await confirmAction({
      title: "Unlock User",
      content: `Unlock ${user.username || user.fullname}? They will be able to try logging in again.`,
      okText: "Unlock",
    });
    if (!confirmed) return;
    try {
      const token = await getValidToken();
      const response = await fetch(
        `${API_BASE}/api/user/unlock-user/${user._id}`,
        {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
            "x-action-confirmed": "true",
          },
          body: JSON.stringify({ confirmAction: true }),
        },
      );
      const data = await response.json().catch(() => ({}));

      if (!response.ok) {
        throw new Error(data.message || "Failed to unlock user");
      }

      setPopup({
        open: true,
        status: "success",
        title: "User Unlocked!",
        subTitle: `User ${user.username || user.fullname} can log in again.`,
      });
      fetchUsers();
    } catch (error) {
      setPopup({
        open: true,
        status: "error",
        title: "Operation failed!",
        subTitle: error.message || "Failed to unlock user",
      });
    }
  };

  const handleReactivateUser = async (user) => {
    const confirmed = await confirmAction({
      title: "Reactivate User",
      content: `Reactivate ${user.username || user.fullname}?`,
      okText: "Reactivate",
    });
    if (!confirmed) return;
    try {
      const token = await getValidToken();
      const response = await fetch(
        `${API_BASE}/api/user/update-user-status/${user._id}`,
        {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
            "x-action-confirmed": "true",
          },
          body: JSON.stringify({ status: "active", confirmAction: true }),
        },
      );
      const data = await response.json().catch(() => ({}));

      if (!response.ok) {
        throw new Error(data.message || "Failed to reactivate user");
      }

      setPopup({
        open: true,
        status: "success",
        title: "User Reactivated!",
        subTitle: `User ${user.username || user.fullname} has been reactivated successfully.`,
      });
      fetchUsers();
    } catch (error) {
      setPopup({
        open: true,
        status: "error",
        title: "Operation failed!",
        subTitle: error.message || "Failed to reactivate user",
      });
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
        paddingTop: isMobile ? 12 : 20,
        paddingRight: isMobile ? 12 : 20,
        paddingLeft: isMobile ? 12 : 20,
        maxWidth: "100%",
        paddingBottom: 24,
      }}
    >
      <Row gutter={[12, 12]} style={{ marginBottom: 10 }}>
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

      <UserTable
        headers={headers}
        data={filteredUsers}
        onEditUser={handleEditUser}
        onDeactivateUser={handleDeactivateUser}
        onReactivateUser={handleReactivateUser}
        onResendInvite={handleResendInvite}
        onExtendInvite={handleExtendInvite}
        onRevokeInvite={handleRevokeInvite}
        onUnlockUser={handleUnlockUser}
        currentUserId={currentUserId}
        loading={loading}
      />

      <Row gutter={[10, 10]} style={{ marginTop: 8, marginBottom: 16 }}>
        <Col span={24} style={{ textAlign: "right" }}>
          <Text type="secondary">
            Showing <Text strong>{filteredUsers.length}</Text> of{" "}
            <Text strong>{allUsers.length}</Text> users
          </Text>
        </Col>
      </Row>

      {showModal && (
        <UserForm
          visible={showModal}
          user={editingUser}
          onClose={handleModalClose}
          onUserSaved={handleUserSaved}
          allUsers={allUsers}
          onShowPopup={setPopup}
        />
      )}

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
