import React from "react";
import { Row, Button, message } from "antd";
import { ExportOutlined } from "@ant-design/icons";
export default function ComponentUsage() {
  const exportDocument = () => {
    message.success("Exported successfully");
  };
  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        gap: 20,
        marginBottom: 300,
      }}
    >
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
