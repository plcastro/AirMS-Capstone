import React, { useState, useEffect } from "react";
import { Input, Row, Col, Card, Button, Typography } from "antd";
import { SearchOutlined, ArrowLeftOutlined, PrinterOutlined } from "@ant-design/icons";
import MLogTable from "../../../components/tables/MLogTable";

const { Title, Text } = Typography;

export default function MaintenanceLog() {
  const [allEntries, setAllEntries] = useState([]);
  const [viewLevel, setViewLevel] = useState("dashboard"); // dashboard, aircraft, or report
  const [selectedAircraft, setSelectedAircraft] = useState(null);
  const [selectedWO, setSelectedWO] = useState(null);

  // Mock data matching your aviation theme
  const mockData = [
    { 
      id: "7247_02_19", 
      aircraft: "RP-C7247", 
      type: "AS350 B3",
      sn: "7247",
      dateDefectRectified: "03/18/2026",
      workDetails: [
        { description: "Carried out 48 Month Airframe Inspection in accordance with MSM RP-C7247." },
        { description: "Carried out 1200 FH/24 Months Airframe Inspection in accordance with MSM RP-C7247." },
        { description: "" }, { description: "" }, { description: "" }, { description: "" }, { description: "" }
      ]
    },
    { 
      id: "7507_05_21", 
      aircraft: "RP-C7507", 
      type: "AS340 B3",
      sn: "7057",
      dateDefectRectified: "03/18/2026",
      workDetails: [{ description: "General Engine Check" }, { description: "" }]
    }
  ];

  useEffect(() => {
    setAllEntries(mockData);
  }, []);

  const navigateToAircraft = (reg) => {
    const aircraftData = allEntries.find(e => e.aircraft === reg);
    const relatedEntries = allEntries.filter(e => e.aircraft === reg);
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

  // --- VIEW 1: DASHBOARD (2 Cards Per Row) ---
  if (viewLevel === "dashboard") {
    const uniqueAircraft = [...new Set(allEntries.map(e => e.aircraft))];
    return (
      <div style={{ padding: '40px 20px' }}>
        <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 40 }}>
          <Input placeholder="Search defect..." prefix={<SearchOutlined />} style={{ width: '50%', borderRadius: 10 }} />
        </div>
        <div style={{ maxWidth: 1000, margin: '0 auto' }}>
          <Title level={3} style={{ marginBottom: 20 }}>REMARKS</Title>
          <Row gutter={[16, 16]}>
            {uniqueAircraft.map(reg => (
              <Col span={12} key={reg}>
                <Card hoverable onClick={() => navigateToAircraft(reg)} bodyStyle={{ display: 'flex', padding: 0 }}>
                  <div style={{ width: 140, background: '#d1c4e9', borderRadius: '4px 0 0 4px' }} />
                  <div style={{ padding: 15 }}>
                    <Title level={5} style={{ margin: 0 }}>{reg}</Title>
                    <Text type="secondary">ACFT TYPE: AS350 B3</Text><br/>
                    <Text type="secondary">ACFT S/N: 7247</Text>
                  </div>
                </Card>
              </Col>
            ))}
          </Row>
        </div>
      </div>
    );
  }

  // --- VIEW 2: AIRCRAFT DETAILS (Split View) ---
  if (viewLevel === "aircraft") {
    return (
      <div style={{ padding: '20px' }}>
        <Button icon={<ArrowLeftOutlined />} type="text" onClick={goBack} style={{ marginBottom: 20 }} />
        <Row gutter={24} style={{ maxWidth: 1200, margin: '0 auto' }}>
          <Col span={14}>
            <Card bodyStyle={{ display: 'flex', padding: 0 }}>
              <div style={{ width: 250, background: '#d1c4e9' }} /> 
              <div style={{ padding: '20px' }}>
                <Title level={3}>{selectedAircraft?.aircraft}</Title>
                <Text type="secondary">Lightweight Utility Aircraft</Text>
                <Row style={{ marginTop: 25 }} gutter={[0, 12]}>
                  <Col span={12}><Text strong>ACFT TYPE:</Text> {selectedAircraft?.type}</Col>
                  <Col span={12}><Text strong>LANDING CYC:</Text> 2522</Col>
                </Row>
              </div>
            </Card>
          </Col>
          <Col span={10}>
            <MLogTable 
              headers={[{ title: "W.O. #", key: "id" }, { title: "DATE", key: "dateDefectRectified" }]}
              data={selectedAircraft?.entries || []}
              onRowClick={navigateToReport} 
              isSimple={true}
            />
          </Col>
        </Row>
      </div>
    );
  }

  // --- VIEW 3: WORK REPORT (Blank Fields + Grid Table) ---
  if (viewLevel === "report") {
    return (
      <div style={{ padding: '20px' }}>
        <Button icon={<ArrowLeftOutlined />} type="text" onClick={goBack} style={{ marginBottom: 10 }} />
        <div style={{ maxWidth: 950, margin: '0 auto' }}>
          <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 10 }}>
            <Button icon={<PrinterOutlined />} type="primary" style={{ backgroundColor: '#26866f', border: 'none' }}>Print</Button>
          </div>
          <Card style={{ marginBottom: 15 }}>
            <Row gutter={[16, 12]}>
              <Col span={12}><Input addonBefore="Aircraft Type:" value="" readOnly /></Col>
              <Col span={12}><Input addonBefore="Aircraft TT:" value="" readOnly /></Col>
              <Col span={12}><Input addonBefore="Aircraft Reg:" value="" readOnly /></Col>
              <Col span={12}><Input addonBefore="Landing Cyc:" value="" readOnly /></Col>
              <Col span={12}><Input addonBefore="Aircraft S/N:" value="" readOnly /></Col>
              <Col span={12}><Input addonBefore="Engine TT:" value="" readOnly /></Col>
              <Col span={12}><Input addonBefore="W.O. #:" value="" readOnly /></Col>
              <Col span={12}><Input addonBefore="Engine Cyc:" value="" readOnly /></Col>
            </Row>
          </Card>
          <Title level={5} style={{ marginBottom: 10 }}>WORK DONE REPORT/CERTIFICATE OF RETURN TO SERVICE</Title>
          <div style={{ border: '1px solid #d9d9d9', borderRadius: 4, overflow: 'hidden' }}>
            <div style={{ background: '#26866f', color: 'white', padding: '10px 15px', fontWeight: 'bold' }}>DESCRIPTION OF WORK</div>
            <MLogTable 
              headers={[{ title: "", key: "description" }]} 
              data={selectedWO?.workDetails || []}
              isSimple={true}
              isWorkReport={true}
            />
          </div>
        </div>
      </div>
    );
  }
}
