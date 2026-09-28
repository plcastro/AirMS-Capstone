import { Modal, Typography } from "antd";

const { Paragraph, Title } = Typography;

const termsSections = [
  {
    title: "Authorized Use",
    body: "AirMS is intended for authorized aviation maintenance, logistics, and administrative personnel only. Users must access only the modules, aircraft records, reports, and actions required for their assigned role.",
  },
  {
    title: "Account Responsibility",
    body: "You are responsible for keeping your username, password, PIN, verification codes, and trusted devices secure. Do not share credentials or allow another person to act under your account.",
  },
  {
    title: "Operational Records",
    body: "Entries, approvals, signatures, inspection notes, requisitions, logs, and uploaded files must be accurate, timely, and based on verified information. AirMS records may be used for operational review, audit, compliance, and safety tracking.",
  },
  {
    title: "Data Privacy",
    body: "AirMS may process account details, activity logs, device/session information, uploaded profile images, and maintenance-related records to operate the system, protect accounts, support audits, and improve reliability.",
  },
  {
    title: "Acceptable Conduct",
    body: "Do not misuse AirMS, bypass security controls, upload harmful content, alter records without authority, or use system information outside approved company operations.",
  },
  {
    title: "Maintenance Authority",
    body: "AirMS supports maintenance workflows but does not replace required professional judgment, approved manuals, regulatory requirements, or company procedures. Users remain responsible for following applicable standards.",
  },
  {
    title: "Updates",
    body: "These terms may be updated as AirMS features, company policies, or compliance requirements change. Continued use of AirMS means you agree to the current terms.",
  },
];

export default function TermsAndConditionsModal({ open, onClose }) {
  return (
    <Modal
      title="Terms and Conditions"
      open={open}
      onCancel={onClose}
      footer={null}
      width={720}
      centered
      styles={{
        body: {
          height: "min(62vh, 560px)",
          overflowY: "auto",
          paddingRight: 8,
        },
      }}
    >
      <Paragraph type="secondary">
        Please review these terms before using AirMS.
      </Paragraph>
      {termsSections.map((section) => (
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
