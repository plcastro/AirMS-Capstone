import React from "react";
import { Card, Checkbox, Col, Row, Space, Typography } from "antd";
import {
  B412_PRE_INSPECTION_SECTION_BY_KEY,
  B412_PRE_INSPECTION_SECTIONS,
  createEmptyB412PreInspectionData,
} from "../../utils/b412PreInspection";

const { Text } = Typography;

const ChecklistCaution = ({ text }) => (
  <Col span={24}>
    <div
      role="note"
      style={{
        border: "1px solid #d46b08",
        borderRadius: 6,
        backgroundColor: "#fff7e6",
        color: "#873800",
        fontWeight: 600,
        padding: "8px 12px",
        textAlign: "center",
      }}
    >
      {text}
    </div>
  </Col>
);

export default function PreInspectionB412Checklist({
  value = {},
  onChange,
  disabled = false,
  sectionKey,
}) {
  const normalizedData = createEmptyB412PreInspectionData(value);
  const checks = normalizedData.checks;
  const sections = sectionKey
    ? [B412_PRE_INSPECTION_SECTION_BY_KEY[sectionKey]].filter(Boolean)
    : B412_PRE_INSPECTION_SECTIONS;

  const emitChecks = (nextChecks) => {
    if (disabled) return;

    const sourceData =
      value && typeof value === "object" && !Array.isArray(value) ? value : {};
    onChange?.({
      ...sourceData,
      checks: {
        ...checks,
        ...nextChecks,
      },
    });
  };

  const setSectionChecked = (section, checked) => {
    emitChecks(
      Object.fromEntries(section.items.map((item) => [item.key, checked])),
    );
  };

  return (
    <Space orientation="vertical" size={14} style={{ width: "100%" }}>
      {sections.map((section) => {
        const checkedCount = section.items.reduce(
          (count, item) => count + (checks[item.key] ? 1 : 0),
          0,
        );
        const allChecked = checkedCount === section.items.length;
        const partiallyChecked = checkedCount > 0 && !allChecked;

        return (
          <Card
            key={section.key}
            size="small"
            title={section.title}
            extra={
              <Checkbox
                checked={allChecked}
                indeterminate={partiallyChecked}
                disabled={disabled}
                onChange={(event) =>
                  setSectionChecked(section, event.target.checked)
                }
              >
                Select All
              </Checkbox>
            }
            styles={{
              header: { backgroundColor: "#0A7D37", color: "#fff" },
            }}
          >
            <Row gutter={[12, 12]}>
              {section.items.map((item, index) => (
                <React.Fragment key={item.key}>
                  {item.cautionBefore ? (
                    <ChecklistCaution text={item.cautionBefore} />
                  ) : null}
                  <Col xs={24} md={12}>
                    <Card size="small" styles={{ body: { padding: 10 } }}>
                      <Space
                        orientation="vertical"
                        size={6}
                        style={{ width: "100%" }}
                      >
                        <Text strong>
                          {index + 1}. {item.title}
                        </Text>
                        <Checkbox
                          checked={checks[item.key]}
                          disabled={disabled}
                          onChange={(event) =>
                            emitChecks({ [item.key]: event.target.checked })
                          }
                        >
                          {item.description}
                        </Checkbox>
                      </Space>
                    </Card>
                  </Col>
                  {item.cautionAfter ? (
                    <ChecklistCaution text={item.cautionAfter} />
                  ) : null}
                </React.Fragment>
              ))}
            </Row>
          </Card>
        );
      })}
    </Space>
  );
}
