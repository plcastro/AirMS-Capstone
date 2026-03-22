import React from "react";
import { Row, message, Button } from "antd";
import { ExportOutlined } from "@ant-design/icons";
export default function MaintenanceSummary() {
  const exportDocument = () => {
    message.success("Exported successfully");
  };
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
      <Row style={{ justifyContent: "flex-end" }}>
        <div>
          <Button
            type="primary"
            icon={<ExportOutlined />}
            onClick={() => exportDocument()}
          >
            Export
          </Button>
        </div>
      </Row>
    </div>
  );
}
