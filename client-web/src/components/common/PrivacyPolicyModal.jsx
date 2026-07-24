import { Modal, Typography } from "antd";

const { Paragraph, Title } = Typography;

const privacySections = [
  {
    title: "Information We Collect",
    body: "AirMS may collect account profile details, login and session activity, assigned role and base, profile images, device or browser information, notification preferences, uploaded files, and maintenance workflow records created through the system.",
  },
  {
    title: "How Information Is Used",
    body: "Information is used to authenticate users, provide authorized access, maintain operational records, support inspections and approvals, send relevant notifications, protect accounts, troubleshoot issues, and support audit or compliance reviews.",
  },
  {
    title: "Maintenance and Audit Records",
    body: "AirMS stores activity logs, timestamps, signatures, approvals, inspection entries, requisitions, messages, and related records to preserve accountability and traceability across maintenance operations.",
  },
  {
    title: "Sharing and Access",
    body: "Information is available only to authorized personnel based on role, operational need, administrative responsibility, or compliance requirement. AirMS information should not be disclosed outside approved company processes.",
  },
  {
    title: "Security",
    body: "AirMS uses access controls, authentication, session management, and activity tracking to help protect user accounts and operational data. Users must also protect their credentials and devices.",
  },
  {
    title: "Retention",
    body: "Records may be retained as needed for aviation maintenance history, audit trails, legal obligations, company policy, safety review, and system administration.",
  },
  {
    title: "User Responsibilities",
    body: "Users should keep profile information current where permitted, report suspicious account activity, avoid uploading unnecessary personal information, and contact an administrator for access or data concerns.",
  },
  {
    title: "Policy Updates",
    body: "This Privacy Policy may be updated as AirMS features, operational processes, or compliance requirements change. Continued use of AirMS means you acknowledge the current policy.",
  },
];

export default function PrivacyPolicyModal({ open, onClose }) {
  return (
    <Modal
      title="Privacy Policy"
      open={open}
      onCancel={onClose}
      footer={null}
      width={720}
      centered
    >
      <Paragraph type="secondary">
        This policy explains how AirMS handles user and operational information.
      </Paragraph>
      {privacySections.map((section) => (
        <section key={section.title} style={{ marginTop: 16 }}>
          <Title level={5} style={{ marginBottom: 4 }}>
            {section.title}
          </Title>
          <Paragraph style={{ marginBottom: 0 }}>{section.body}</Paragraph>
        </section>
      ))}
    </Modal>
  );
}
