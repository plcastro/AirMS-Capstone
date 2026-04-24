import React, { useState, useEffect } from "react";
import {
  Input,
  Row,
  Col,
  Card,
  Button,
  Typography,
  Space,
  Divider,
  Tag,
} from "antd";
import {
  SearchOutlined,
  ArrowLeftOutlined,
  PrinterOutlined,
} from "@ant-design/icons";
import MLogTable from "../../../components/tables/MLogTable";

const { Title, Text } = Typography;

export default function MaintenanceLog() {
  const [allEntries, setAllEntries] = useState([]);
  const [viewLevel, setViewLevel] = useState("dashboard"); // dashboard, aircraft, or report
  const [selectedAircraft, setSelectedAircraft] = useState(null);
  const [selectedWO, setSelectedWO] = useState(null);

  const compactAddonStyle = {
    border: "1px solid #d9d9d9",
    borderRight: 0,
    background: "#fafafa",
    padding: "0 11px",
    lineHeight: "30px",
    whiteSpace: "nowrap",
  };

  // Mock data matching your aviation theme
  const mockData = [
    {
      id: "7247_02_19",
      aircraft: "RP-C7247",
      type: "AS350 B3",
      sn: "7247",
      dateDefectRectified: "03/18/2026",
      workDetails: [
        {
          description:
            "Carried out 48 Month Airframe Inspection in accordance with MSM RP-C7247.",
        },
        {
          description:
            "Carried out 1200 FH/24 Months Airframe Inspection in accordance with MSM RP-C7247.",
        },
        { description: "" },
        { description: "" },
        { description: "" },
        { description: "" },
        { description: "" },
      ],
    },
    {
      id: "7507_05_21",
      aircraft: "RP-C7507",
      type: "AS340 B3",
      sn: "7057",
      dateDefectRectified: "03/18/2026",
      workDetails: [
        { description: "General Engine Check" },
        { description: "" },
      ],
    },
  ];

  useEffect(() => {
    setAllEntries(mockData);
  }, []);

  const navigateToAircraft = (reg) => {
    const aircraftData = allEntries.find((e) => e.aircraft === reg);
    const relatedEntries = allEntries.filter((e) => e.aircraft === reg);
    setSelectedAircraft({ ...aircraftData, entries: relatedEntries });
    setViewLevel("aircraft");
  };

  const navigateToReport = (record) => {
    setSelectedWO(record);
    setViewLevel("report");
  };

  const goBack = () => {
    if (viewLevel === "report") setViewLevel("aircraft");
    else if (viewLevel === "aircraft") setViewLevel("dashboard");
  };

  const renderLabeledInput = (label, value = "") => (
    <Space.Compact style={{ width: "100%" }}>
      <span style={compactAddonStyle}>{label}</span>
      <Input value={value} readOnly />
    </Space.Compact>
  );

  // --- VIEW 1: DASHBOARD (Aircraft Cards) ---
  if (viewLevel === "dashboard") {
    const uniqueAircraft = [...new Set(allEntries.map((e) => e.aircraft))];
    return (
      <div style={{ padding: 20 }}>
        <Row gutter={[12, 12]} align="middle">
          <Col xs={24} md={8}>
            <Input
              size="large"
              placeholder="Search defect..."
              prefix={<SearchOutlined />}
              allowClear
            />
          </Col>
          <Col xs={24} md={16} style={{ textAlign: "right" }}>
            <Text type="secondary">
              Showing <Text strong>{uniqueAircraft.length}</Text> aircraft
            </Text>
          </Col>
        </Row>

        <Title level={4} style={{ marginBottom: 14 }}>
          Maintenance Remarks
        </Title>
        <Row gutter={[16, 16]}>
          {uniqueAircraft.map((reg) => {
            const aircraftEntry = allEntries.find(
              (entry) => entry.aircraft === reg,
            );
            return (
              <Col xs={24} md={12} key={reg}>
                <Card
                  hoverable
                  onClick={() => navigateToAircraft(reg)}
                  styles={{ body: { padding: 0 } }}
                  style={{ borderRadius: 12, overflow: "hidden" }}
                >
                  <div style={{ display: "flex", minHeight: 120 }}>
                    <div
                      style={{
                        width: 10,
                        background: "#26866f",
                      }}
                    />
                    <div style={{ padding: 16, flex: 1 }}>
                      <Space size={[8, 8]} wrap>
                        <Tag color="green">AIRCRAFT</Tag>
                        <Text type="secondary">Tap to view work orders</Text>
                      </Space>
                      <Title level={5} style={{ margin: "10px 0 6px" }}>
                        {reg}
                      </Title>
                      <Text type="secondary">
                        ACFT TYPE: {aircraftEntry?.type || "-"}
                      </Text>
                      <br />
                      <Text type="secondary">
                        ACFT S/N: {aircraftEntry?.sn || "-"}
                      </Text>
                    </div>
                  </div>
                </Card>
              </Col>
            );
          })}
        </Row>
      </div>
    );
  }

  // --- VIEW 2: AIRCRAFT DETAILS (Split View) ---
  if (viewLevel === "aircraft") {
    return (
      <div style={{ padding: 20 }}>
        <Button
          icon={<ArrowLeftOutlined />}
          type="text"
          onClick={goBack}
          style={{ marginBottom: 12 }}
        >
          Back
        </Button>

        <Row gutter={[16, 16]}>
          <Col xs={24} lg={14}>
            <Card>
              <Space orientation="vertical" size={10} style={{ width: "100%" }}>
                <Tag color="green" style={{ width: "fit-content" }}>
                  AIRCRAFT PROFILE
                </Tag>
                <Title level={3} style={{ margin: 0 }}>
                  {selectedAircraft?.aircraft}
                </Title>
                <Text type="secondary">Lightweight Utility Aircraft</Text>
                <Divider style={{ margin: "8px 0" }} />
                <Row gutter={[16, 10]}>
                  <Col xs={24} sm={12}>
                    <Text strong>ACFT TYPE:</Text> {selectedAircraft?.type}
                  </Col>
                  <Col xs={24} sm={12}>
                    <Text strong>LANDING CYC:</Text> 2522
                  </Col>
                  <Col xs={24} sm={12}>
                    <Text strong>ACFT S/N:</Text> {selectedAircraft?.sn}
                  </Col>
                  <Col xs={24} sm={12}>
                    <Text strong>WORK ORDERS:</Text>{" "}
                    {selectedAircraft?.entries?.length || 0}
                  </Col>
                </Row>
              </Space>
            </Card>
          </Col>

          <Col xs={24} lg={10}>
            <Card title="Work Orders" styles={{ body: { padding: 0 } }}>
              <MLogTable
                headers={[
                  { title: "W.O. #", key: "id" },
                  { title: "DATE", key: "dateDefectRectified" },
                ]}
                data={selectedAircraft?.entries || []}
                onRowClick={navigateToReport}
                isSimple={true}
              />
            </Card>
          </Col>
        </Row>
      </div>
    );
  }

  // --- VIEW 3: WORK REPORT (Blank Fields + Grid Table) ---
  if (viewLevel === "report") {
    return (
      <div style={{ padding: "20px" }}>
        <Row
          justify="space-between"
          align="middle"
          style={{ marginBottom: 10 }}
        >
          <Col>
            <Button icon={<ArrowLeftOutlined />} type="text" onClick={goBack}>
              Back
            </Button>
          </Col>
          <Col>
            <Button
              icon={<PrinterOutlined />}
              type="primary"
              style={{ backgroundColor: "#26866f", border: "none" }}
            >
              Print
            </Button>
          </Col>
        </Row>

        <Card style={{ marginBottom: 15 }}>
          <Row gutter={[16, 12]}>
            <Col xs={24} md={12}>
              {renderLabeledInput(
                "Aircraft Type:",
                selectedAircraft?.type || "",
              )}
            </Col>
            <Col xs={24} md={12}>
              {renderLabeledInput("Aircraft TT:", "")}
            </Col>
            <Col xs={24} md={12}>
              {renderLabeledInput(
                "Aircraft Reg:",
                selectedAircraft?.aircraft || "",
              )}
            </Col>
            <Col xs={24} md={12}>
              {renderLabeledInput("Landing Cyc:", "2522")}
            </Col>
            <Col xs={24} md={12}>
              {renderLabeledInput("Aircraft S/N:", selectedAircraft?.sn || "")}
            </Col>
            <Col xs={24} md={12}>
              {renderLabeledInput("Engine TT:", "")}
            </Col>
            <Col xs={24} md={12}>
              {renderLabeledInput("W.O. #:", selectedWO?.id || "")}
            </Col>
            <Col xs={24} md={12}>
              {renderLabeledInput("Engine Cyc:", "")}
            </Col>
          </Row>
        </Card>

        <Card
          title="WORK DONE REPORT/CERTIFICATE OF RETURN TO SERVICE"
          styles={{
            header: {
              background: "#26866f",
              color: "#fff",
              fontWeight: 700,
            },
            body: { padding: 0 },
          }}
        >
          <MLogTable
            headers={[{ title: "DESCRIPTION OF WORK", key: "description" }]}
            data={selectedWO?.workDetails || []}
            isSimple={true}
            isWorkReport={true}
          />
        </Card>
      </div>
    );
  }
}
