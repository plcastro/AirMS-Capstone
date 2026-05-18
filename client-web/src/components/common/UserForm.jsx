import React, { useState, useEffect, useMemo, useContext } from "react";
import {
  Modal,
  Upload,
  Input,
  Button,
  Select,
  Divider,
  message as antMessage,
  Col,
  Row,
  Typography,
  Grid,
  Space,
  Form,
  Descriptions,
  Avatar,
} from "antd";
import { PlusOutlined, UserOutlined } from "@ant-design/icons";
import ImgCrop from "antd-img-crop";
import { API_BASE } from "../../utils/API_BASE";
import { AuthContext } from "../../context/AuthContext";

const { Text } = Typography;
const { useBreakpoint } = Grid;

const ROLE_MAP = {
  Admin: "Admin",
  Pilot: "User",
  "Maintenance Manager": "Superuser",
  "Officer-In-Charge": "Superuser",
  Mechanic: "User",
  "Warehouse Department": "User",
};

export default function UserForm({
  visible,
  onClose,
  onUserSaved,
  user,
  allUsers,
}) {
  const screens = useBreakpoint();
  const isMobile = !screens.md;
  const { getValidToken } = useContext(AuthContext);
  const [form] = Form.useForm();

  const [joinedDate, setJoinedDate] = useState(new Date());
  const [imageUrl, setImageUrl] = useState(null);
  const [file, setFile] = useState(null);
  const [loading, setLoading] = useState(false);
  const [previewOpen, setPreviewOpen] = useState(false);
  const [previewData, setPreviewData] = useState(null);

  const firstNameValue = Form.useWatch("firstName", form) || "";
  const lastNameValue = Form.useWatch("lastName", form) || "";
  const jobTitleValue = Form.useWatch("jobTitle", form) || "";

  const getUserInitials = (firstName = "", lastName = "", fallback = "U") => {
    const initials =
      `${String(firstName).charAt(0)}${String(lastName).charAt(0)}`
        .toUpperCase()
        .trim();
    return initials || fallback;
  };

  useEffect(() => {
    if (!visible) return;

    if (user) {
      form.setFieldsValue({
        firstName: user.firstName || "",
        lastName: user.lastName || "",
        email: user.email || "",
        username: user.username || "",
        jobTitle: user.jobTitle || undefined,
        base: user.base || undefined,
        access: user.access || ROLE_MAP[user.jobTitle] || "",
        licenseNo: user.licenseNo || "",
      });
      setJoinedDate(user.dateCreated ? new Date(user.dateCreated) : new Date());
      setImageUrl(user.image || null);
      setFile(null);
    } else {
      form.resetFields();
      form.setFieldsValue({
        firstName: "",
        lastName: "",
        email: "",
        username: "",
        jobTitle: undefined,
        base: undefined,
        access: "",
        licenseNo: "",
      });
      setJoinedDate(new Date());
      setImageUrl(null);
      setFile(null);
    }
  }, [visible, user, form]);

  useEffect(() => {
    if (user) return;
    if (!firstNameValue || !lastNameValue || !allUsers) return;

    const base = `${lastNameValue}${firstNameValue[0]}`
      .toLowerCase()
      .replace(/\s+/g, "")
      .replace(/[^a-z0-9]/g, "");

    let counter = 1;
    let finalUsername = base;
    const usernameExists = (name) => allUsers.some((u) => u.username === name);

    while (usernameExists(finalUsername)) {
      counter += 1;
      finalUsername = `${base}${counter}`;
    }

    form.setFieldValue("username", finalUsername);
  }, [firstNameValue, lastNameValue, user, allUsers, form]);

  useEffect(() => {
    form.setFieldValue("access", ROLE_MAP[jobTitleValue] || "");
    if (
      ![
        "maintenance manager",
        "pilot",
        "mechanic",
        "officer-in-charge",
      ].includes(jobTitleValue.toLowerCase())
    ) {
      form.setFieldValue("licenseNo", "");
    }
  }, [jobTitleValue, form]);

  const handleSave = async (values) => {
    setLoading(true);

    try {
      const token = await getValidToken();
      let body;
      const headers = {
        Authorization: `Bearer ${token}`,
        "x-action-confirmed": "true",
      };

      if (file) {
        body = new FormData();
        body.append("firstName", values.firstName.trim());
        body.append("lastName", values.lastName.trim());
        body.append("email", values.email.trim());
        body.append("username", values.username.trim());
        body.append("jobTitle", values.jobTitle);
        body.append("base", values.base);
        body.append("access", values.access);
        body.append("dateCreated", joinedDate.toISOString());
        body.append("confirmAction", "true");
        body.append("image", file);
        if (
          [
            "maintenance manager",
            "pilot",
            "mechanic",
            "officer-in-charge",
          ].includes(values.jobTitle.toLowerCase())
        ) {
          body.append("licenseNo", values.licenseNo || "");
        }
      } else {
        headers["Content-Type"] = "application/json";
        body = JSON.stringify({
          confirmAction: true,
          firstName: values.firstName.trim(),
          lastName: values.lastName.trim(),
          email: values.email.trim(),
          username: values.username.trim(),
          jobTitle: values.jobTitle,
          base: values.base,
          access: values.access,
          dateCreated: joinedDate.toISOString(),
          licenseNo: values.licenseNo || "",
        });
      }

      const url = user
        ? `${API_BASE}/api/user/update-user/${user._id}`
        : `${API_BASE}/api/user/create`;

      const res = await fetch(url, {
        method: user ? "PUT" : "POST",
        headers,
        body,
      });

      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}));
        throw new Error(errorData.message || "Operation failed");
      }

      const savedUser = await res.json();
      const savedUserData = savedUser?.data || savedUser?.user || null;

      antMessage.success(
        user ? "User updated successfully!" : "User added successfully!",
      );

      if (!user) {
        Modal.success({
          title: "Email Sent",
          content: `An invitation email has been sent to ${values.email}.`,
        });
      }

      const updatedUser = {
        _id: savedUserData?._id || user?._id,
        firstName: values.firstName.trim(),
        lastName: values.lastName.trim(),
        email: values.email.trim(),
        username: values.username,
        jobTitle: values.jobTitle,
        base: values.base,
        access: values.access,
        dateCreated: joinedDate.toISOString(),
        image: savedUserData?.image || imageUrl,
        status: savedUserData?.status || "inactive",
        invitationStatus: savedUserData?.invitationStatus || "pending",
        invitationExpiresAt: savedUserData?.invitationExpiresAt || null,
        licenseNo: savedUserData?.licenseNo || values.licenseNo || "",
      };

      setPreviewOpen(false);
      onUserSaved?.(updatedUser);
      onClose();
    } catch (err) {
      console.error("Error saving user:", err);
      antMessage.error(err.message || "Server error. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const handlePreview = async () => {
    try {
      const values = await form.validateFields();
      setPreviewData(values);
      setPreviewOpen(true);
    } catch {
      // validation errors are displayed by Form
    }
  };

  const requiresLicense = useMemo(
    () =>
      [
        "maintenance manager",
        "pilot",
        "mechanic",
        "officer-in-charge",
      ].includes(jobTitleValue.toLowerCase()),
    [jobTitleValue],
  );

  return (
    <>
      <Modal
        open={visible}
        title={user ? "Edit User" : "Add User"}
        onCancel={onClose}
        width={isMobile ? "96vw" : 760}
        centered
        styles={{
          header: {
            padding: "8px 24px",
          },
          body: {
            maxHeight: isMobile ? "76vh" : "80vh",
            padding: "4px 24px 24px",
          },
        }}
        footer={[
          <Button
            key="cancel"
            onClick={onClose}
            style={{ width: isMobile ? "48%" : "auto" }}
          >
            Cancel
          </Button>,
          <Button
            key="preview"
            type="primary"
            onClick={handlePreview}
            loading={loading}
            style={{ width: isMobile ? "48%" : "auto" }}
          >
            {user ? "Update" : "Create"}
          </Button>,
        ]}
      >
        <Divider style={{ marginTop: 0 }} />
        <Form form={form} layout="vertical" requiredMark={true}>
          <Space orientation="vertical" size={14} style={{ width: "100%" }}>
            <Row justify="center">
              <Col style={{ textAlign: "center" }}>
                <ImgCrop rotationSlider aspect={1 / 1}>
                  <Upload
                    listType="picture-card"
                    showUploadList={false}
                    beforeUpload={(nextFile) => {
                      setFile(nextFile);
                      setImageUrl(URL.createObjectURL(nextFile));
                      return false;
                    }}
                  >
                    {imageUrl ? (
                      <img
                        src={imageUrl}
                        alt="avatar"
                        style={{ width: "100%" }}
                      />
                    ) : (
                      <PlusOutlined />
                    )}
                  </Upload>
                </ImgCrop>
                <Text type="secondary" style={{ fontSize: 12 }}>
                  Upload profile photo
                </Text>
              </Col>
            </Row>

            <Row gutter={[16, 14]}>
              <Col xs={24} md={12}>
                <Form.Item
                  label="First Name"
                  name="firstName"
                  rules={[
                    { required: true, message: "First name is required" },
                    {
                      pattern: /^[a-zA-Z'\-\s]+$/,
                      message:
                        "First name can only contain letters, hyphens, or apostrophes",
                    },
                  ]}
                >
                  <Input
                    maxLength={128}
                    size="large"
                    placeholder="Enter first name"
                    onChange={(e) => {
                      const value = e.target.value.replace(
                        /[^a-zA-Z'\-\s]/g,
                        "",
                      );
                      form.setFieldValue("firstName", value);
                    }}
                  />
                </Form.Item>
              </Col>

              <Col xs={24} md={12}>
                <Form.Item
                  label="Last Name"
                  name="lastName"
                  rules={[
                    { required: true, message: "Last name is required" },
                    {
                      pattern: /^[a-zA-Z'\-\s]+$/,
                      message:
                        "Last name can only contain letters, hyphens, or apostrophes",
                    },
                  ]}
                >
                  <Input
                    maxLength={128}
                    size="large"
                    placeholder="Enter last name"
                    onChange={(e) => {
                      const value = e.target.value.replace(
                        /[^a-zA-Z'\-\s]/g,
                        "",
                      );
                      form.setFieldValue("lastName", value);
                    }}
                  />
                </Form.Item>
              </Col>

              <Col xs={24} md={24}>
                <Form.Item
                  label="Email Address"
                  name="email"
                  rules={[
                    { required: true, message: "Email is required" },
                    { type: "email", message: "Invalid email format" },
                  ]}
                >
                  <Input
                    placeholder="Enter email address"
                    size="large"
                    maxLength={256}
                  />
                </Form.Item>
              </Col>

              <Col xs={24} md={12}>
                <Form.Item label="Generated Username" name="username">
                  <Input size="large" disabled />
                </Form.Item>
              </Col>

              <Col xs={24} md={12}>
                <Form.Item
                  label="Job Title"
                  name="jobTitle"
                  rules={[{ required: true, message: "Job Title is required" }]}
                >
                  <Select
                    size="large"
                    options={[
                      { label: "Admin", value: "Admin" },
                      {
                        label: "Maintenance Manager",
                        value: "Maintenance Manager",
                      },
                      { label: "Pilot", value: "Pilot" },
                      {
                        label: "Officer-In-Charge",
                        value: "Officer-In-Charge",
                      },
                      { label: "Mechanic", value: "Mechanic" },
                      {
                        label: "Warehouse Department",
                        value: "Warehouse Department",
                      },
                    ]}
                  />
                </Form.Item>
              </Col>

              <Col xs={24} md={12}>
                <Form.Item
                  label="Base"
                  name="base"
                  rules={[{ required: true, message: "Base is required" }]}
                >
                  <Select
                    size="large"
                    placeholder="Select user base"
                    options={[
                      { label: "MANILA", value: "MANILA" },
                      { label: "CEBU", value: "CEBU" },
                      { label: "CDO", value: "CDO" },
                    ]}
                  />
                </Form.Item>
              </Col>

              {/* <Col xs={24} md={12}>
                <Form.Item label="Access Level" name="access">
                  <Input size="large" disabled />
                </Form.Item>
              </Col> */}

              {requiresLicense ? (
                <Col xs={24} md={12}>
                  <Form.Item
                    label="License No."
                    name="licenseNo"
                    rules={[
                      { required: true, message: "License number is required" },
                      {
                        pattern: /^\d{6}$/,
                        message: "License number must be 6 digits",
                      },
                    ]}
                  >
                    <Input
                      placeholder="Enter license number"
                      size="large"
                      maxLength={6}
                      onChange={(e) =>
                        form.setFieldValue(
                          "licenseNo",
                          e.target.value.replace(/\D/g, ""),
                        )
                      }
                    />
                  </Form.Item>
                </Col>
              ) : null}
            </Row>
          </Space>
        </Form>
      </Modal>

      <Modal
        open={previewOpen}
        title={user ? "Preview Updated User" : "Preview New User"}
        onCancel={() => setPreviewOpen(false)}
        width={isMobile ? "94vw" : 640}
        centered
        footer={[
          <Button key="back" onClick={() => setPreviewOpen(false)}>
            Back
          </Button>,
          <Button
            key="save"
            type="primary"
            loading={loading}
            onClick={() => previewData && handleSave(previewData)}
          >
            {user ? "Save Changes" : "Create User"}
          </Button>,
        ]}
      >
        <Space orientation="vertical" size={16} style={{ width: "100%" }}>
          <Row justify="center">
            <Col style={{ textAlign: "center" }}>
              {imageUrl ? (
                <Avatar size={84} src={imageUrl} />
              ) : (
                <div
                  style={{
                    width: 100,
                    height: 100,
                    borderRadius: "50%",
                    marginRight: 5,
                    backgroundColor: "#E9F4F1",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    userSelect: "none",
                  }}
                >
                  <span
                    style={{
                      color: "#26866F",
                      fontWeight: 700,
                      fontSize: 32,
                    }}
                  >
                    {getUserInitials(user?.firstName, user?.lastName)}
                  </span>
                </div>
              )}
            </Col>
          </Row>

          <Descriptions bordered column={isMobile ? 1 : 2} size="middle">
            <Descriptions.Item label="First Name">
              {previewData?.firstName || "-"}
            </Descriptions.Item>
            <Descriptions.Item label="Last Name">
              {previewData?.lastName || "-"}
            </Descriptions.Item>
            <Descriptions.Item label="Email">
              {previewData?.email || "-"}
            </Descriptions.Item>
            <Descriptions.Item label="Username">
              {previewData?.username || "-"}
            </Descriptions.Item>
            <Descriptions.Item label="Job Title">
              {previewData?.jobTitle || "-"}
            </Descriptions.Item>
            <Descriptions.Item label="Base">
              {previewData?.base || "-"}
            </Descriptions.Item>
            <Descriptions.Item label="Access Level">
              {previewData?.access || "-"}
            </Descriptions.Item>
            {previewData?.licenseNo ? (
              <Descriptions.Item label="License No.">
                {previewData.licenseNo}
              </Descriptions.Item>
            ) : null}
          </Descriptions>
        </Space>
      </Modal>
    </>
  );
}
