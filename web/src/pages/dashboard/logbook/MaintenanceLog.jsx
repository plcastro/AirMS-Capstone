import React, { useState, useEffect } from "react";
import { Input, Button, Tag, Row, Col } from "antd";
import MLogTable from "../../../components/tables/MLogTable";
import { PlusOutlined, SearchOutlined } from "@ant-design/icons";
import MaintenanceEntryModal from "../../../components/pagecomponents/MaintenanceEntryModal";

const mockData = [
  {
    id: 1,
    aircraft: "2810",
    defects: "Oxygen pressure low in main cabin supply system",
    dateDefectDiscovered: "01/04/2026",
    correctiveActionDone: "Fixed area and replaced seal",
    dateDefectRectified: "01/05/2026",
    status: "Verified",
  },
  {
    id: 2,
    aircraft: "2810",
    defects: "Aileron control surface failure during pre-flight check",
    dateDefectDiscovered: "01/08/2026",
    correctiveActionDone: "N/A",
    dateDefectRectified: "N/A",
    status: "Unverified",
  },
  {
    id: 3,
    aircraft: "2810",
    defects: "Airframe dented on left wing due to ground equipment contact",
    dateDefectDiscovered: "01/03/2026",
    correctiveActionDone: "Inspected and scheduled for repair",
    dateDefectRectified: "01/10/2026",
    status: "Verified",
  },
  {
    id: 4,
    aircraft: "2811",
    defects: "Engine oil leak detected during post-flight inspection",
    dateDefectDiscovered: "02/15/2026",
    correctiveActionDone: "Replaced main oil seal and tested",
    dateDefectRectified: "02/20/2026",
    status: "Verified",
  },
  {
    id: 5,
    aircraft: "2812",
    defects: "Landing gear sensor intermittent failure readings",
    dateDefectDiscovered: "01/01/2026",
    correctiveActionDone: "N/A",
    dateDefectRectified: "N/A",
    status: "Unverified",
  },
];

export default function MaintenanceLog() {
  const [allEntries, setAllEntries] = useState([]);
  const [filteredEntries, setFilteredEntries] = useState([]);
  const [showNewEntry, setShowNewEntry] = useState(false);
  const [showEditEntry, setShowEditEntry] = useState(false);
  const [selectedEntry, setSelectedEntry] = useState(null);
  const [searchQuery, setSearchQuery] = useState("");

  const headers = [
    { title: "Aircraft", key: "aircraft" },
    { title: "Defects", key: "defects" },
    { title: "Date Defect Discovered", key: "dateDefectDiscovered" },
    { title: "Corrective Action Done", key: "correctiveActionDone" },
    { title: "Date Defect Rectified", key: "dateDefectRectified" },
    { title: "Action", key: "action" },
    { title: "Status", key: "status" },
  ];

  const calculateStatus = (entry) => {
    const hasRealCorrectiveAction =
      entry.correctiveActionDone &&
      entry.correctiveActionDone !== "N/A" &&
      entry.correctiveActionDone.trim() !== "";
    const hasRealRectifiedDate =
      entry.dateDefectRectified &&
      entry.dateDefectRectified !== "N/A" &&
      entry.dateDefectRectified.trim() !== "";

    return hasRealCorrectiveAction && hasRealRectifiedDate
      ? "Verified"
      : "Unverified";
  };

  useEffect(() => {
    const fetchEntries = async () => {
      const entriesWithCalculatedStatus = mockData.map((entry) => ({
        ...entry,
        status: calculateStatus(entry),
      }));

      setAllEntries(entriesWithCalculatedStatus);
      setFilteredEntries(entriesWithCalculatedStatus);
    };
    fetchEntries();
  }, []);

  useEffect(() => {
    let filtered = [...allEntries];

    if (searchQuery.trim() !== "") {
      const query = searchQuery.toLowerCase().trim();
      filtered = filtered.filter(
        (entry) =>
          (entry.aircraft && entry.aircraft.toLowerCase().includes(query)) ||
          (entry.defects && entry.defects.toLowerCase().includes(query)) ||
          (entry.correctiveActionDone &&
            entry.correctiveActionDone.toLowerCase().includes(query)) ||
          (entry.dateDefectDiscovered &&
            entry.dateDefectDiscovered.toLowerCase().includes(query)) ||
          (entry.dateDefectRectified &&
            entry.dateDefectRectified.toLowerCase().includes(query)),
      );
    }

    setFilteredEntries(filtered);
  }, [allEntries, searchQuery]);

  const handleEditEntry = (entry) => {
    setSelectedEntry(entry);
    setShowEditEntry(true);
  };

  const handleUpdateEntry = (updatedEntry) => {
    const finalEntry = {
      ...updatedEntry,
      status: calculateStatus(updatedEntry),
    };

    setAllEntries((prev) =>
      prev.map((entry) => (entry.id === finalEntry.id ? finalEntry : entry)),
    );
    setShowEditEntry(false);
    setSelectedEntry(null);
  };

  const handleSaveNewEntry = (MaintenanceNewEntry) => {
    const today = new Date();
    const todayFormatted = `${(today.getMonth() + 1)
      .toString()
      .padStart(
        2,
        "0",
      )}/${today.getDate().toString().padStart(2, "0")}/${today.getFullYear()}`;

    const entryToAdd = {
      id: allEntries.length + 1,
      aircraft: MaintenanceNewEntry.aircraft,
      defects: MaintenanceNewEntry.defectDescription,
      dateDefectDiscovered:
        MaintenanceNewEntry.dateDefectDiscovered || todayFormatted,
      correctiveActionDone: "N/A",
      dateDefectRectified: "N/A",
      status: "Unverified",
    };

    setAllEntries((prev) => [...prev, entryToAdd]);
    setShowNewEntry(false);
  };

  const handleSearchChange = (text) => setSearchQuery(text);

  return (
    <div style={{ padding: 20 }}>
      <Row>
        <Col xs={24} md={8}>
          <Input
            placeholder="Search by aircraft, defect, or date"
            value={searchQuery}
            size="large"
            onChange={(e) => handleSearchChange(e.target.value)}
            prefix={<SearchOutlined />}
            allowClear
          />
        </Col>
      </Row>

      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          height: 40,
          marginTop: 10,
          marginBottom: 10,
        }}
      >
        <Tag
          color="#26866f"
          style={{
            height: 40,
            width: 300,
            fontSize: 16,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            textAlign: "center",
            borderRadius: 4,
          }}
        >
          Maintenance History
        </Tag>
        <Button
          type="primary"
          icon={<PlusOutlined />}
          style={{ width: 150 }}
          onClick={() => setShowNewEntry(true)}
        >
          New Entry
        </Button>
      </div>

      <MLogTable
        headers={headers}
        data={filteredEntries}
        onEditEntry={handleEditEntry}
      />

      <MaintenanceEntryModal
        visible={showNewEntry}
        entry={null}
        onClose={() => setShowNewEntry(false)}
        onSave={handleSaveNewEntry}
      />

      <MaintenanceEntryModal
        visible={showEditEntry}
        entry={selectedEntry}
        onClose={() => {
          setShowEditEntry(false);
          setSelectedEntry(null);
        }}
        onSave={handleUpdateEntry}
      />
    </div>
  );
}
