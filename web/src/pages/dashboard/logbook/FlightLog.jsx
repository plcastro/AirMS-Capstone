import React, { useState, useEffect, useContext } from "react";
import { Button, Input, Tabs, Space } from "antd";
import { DeleteOutlined, EditOutlined, PlusOutlined } from "@ant-design/icons";
import FLogTable from "../../../components/tables/FLogTable";
import { AuthContext } from "../../../context/AuthContext";

export default function FlightLog() {
  const { user } = useContext(AuthContext);
  const [searchQuery, setSearchQuery] = useState("");
  const [activeTab, setActiveTab] = useState("Defects");

  const [modalVisible, setModalVisible] = useState(false);
  const [editDefectModalVisible, setEditDefectModalVisible] = useState(false);
  const [editTechnicalModalVisible, setEditTechnicalModalVisible] =
    useState(false);

  const [selectedDefect, setSelectedDefect] = useState(null);
  const [selectedTechnicalLog, setSelectedTechnicalLog] = useState(null);
  const userJobTitle = user?.jobTitle?.toLowerCase() || "pilot";
  useEffect(() => {
    setActiveTab("Defects");
  }, []);

  const [defectsData, setDefectsData] = useState([
    {
      index: 1,
      date: "01/03/2026",
      fullname: "Max Verstappen",
      aircraft: "2810",
      destination: "Oxygen pressure lower than normal",
      defectAction: "Required - Ground inspection needed",
    },
  ]);

  const [technicalLogData, setTechnicalLogData] = useState([
    {
      index: 1,
      tailNum: "---",
      date: "15/03/2026",
      depart: "Pasay",
      arrive: "Mindanao",
      offBlock: "08:25",
      onBlock: "9:35",
      blockTime: "1:25",
      flightTime: "1:20",
      technicalAction: "Routine flight, no issues",
    },
  ]);

  const handleEditLog = (log) => {
    if (activeTab === "Defects") {
      setSelectedDefect(log);
      setEditDefectModalVisible(true);
    } else if (activeTab === "TechnicalLog") {
      setSelectedTechnicalLog(log);
      setEditTechnicalModalVisible(true);
    }
  };

  const handleDeleteLog = (log) => {
    if (activeTab === "Defects")
      setDefectsData((prev) => prev.filter((item) => item.index !== log.index));
    else if (activeTab === "TechnicalLog")
      setTechnicalLogData((prev) =>
        prev.filter((item) => item.index !== log.index),
      );
  };

  // Columns with Action buttons directly
  const defectColumns = [
    { title: "#", dataIndex: "index", key: "index", align: "center" },
    { title: "Date", dataIndex: "date", key: "date" },
    { title: "Reported By", dataIndex: "fullname", key: "fullname" },
    {
      title: "Aircraft",
      dataIndex: "aircraft",
      key: "aircraft",
      align: "center",
    },
    { title: "Description", dataIndex: "destination", key: "destination" },
    {
      title: "Action",
      key: "action",
      align: "center",
      render: (_, record) => (
        <Space>
          <Button
            type="primary"
            onClick={() => handleEditLog(record)}
            style={{ width: 100 }}
            icon={<EditOutlined />}
          >
            Edit
          </Button>
          <Button
            type="default"
            danger
            onClick={() => handleDeleteLog(record)}
            icon={<DeleteOutlined />}
            style={{ width: 100 }}
          >
            Delete
          </Button>
        </Space>
      ),
    },
  ];

  const technicalColumns = [
    { title: "#", dataIndex: "index", key: "index", align: "center" },
    { title: "Tail No.", dataIndex: "tailNum", key: "tailNum" },
    { title: "Date", dataIndex: "date", key: "date" },
    { title: "Depart", dataIndex: "depart", key: "depart" },
    { title: "Arrive", dataIndex: "arrive", key: "arrive" },
    { title: "Off Block", dataIndex: "offBlock", key: "offBlock" },
    { title: "On Block", dataIndex: "onBlock", key: "onBlock" },
    { title: "Block Time", dataIndex: "blockTime", key: "blockTime" },
    { title: "Flight Time", dataIndex: "flightTime", key: "flightTime" },
    {
      title: "Action",
      key: "action",
      align: "center",
      render: (_, record) => (
        <Button
          type="primary"
          style={{ width: 150 }}
          onClick={() => handleEditLog(record)}
          icon={<EditOutlined />}
        >
          Verify / Edit
        </Button>
      ),
    },
  ];

  return (
    <>
      <Input
        placeholder="Search logs"
        value={searchQuery}
        onChange={(e) => setSearchQuery(e.target.value)}
        style={{ marginBottom: 16, width: 300 }}
      />

      <Tabs
        activeKey={activeTab}
        onChange={(key) => setActiveTab(key)}
        items={[
          { key: "Defects", label: "Defects" },
          { key: "TechnicalLog", label: "Technical Log" },
        ]}
      />

      <div
        style={{
          justifyContent: "space-between",
          display: "flex",
        }}
      >
        <Button
          type="primary"
          onClick={() => setModalVisible(true)}
          style={{ marginBottom: 16, width: 150 }}
          icon={<PlusOutlined />}
        >
          New Entry
        </Button>
      </div>

      <div>
        {activeTab === "Defects" ? (
          <FLogTable
            headers={defectColumns}
            data={defectsData}
            userJobTitle={userJobTitle}
            onEditLog={handleEditLog}
            onDeleteLog={handleDeleteLog}
          />
        ) : (
          <FLogTable
            headers={technicalColumns}
            data={technicalLogData}
            userJobTitle={userJobTitle}
            onEditLog={handleEditLog}
            onDeleteLog={handleDeleteLog}
          />
        )}
      </div>
    </>
  );
}
