import React, { useState, useEffect } from "react";
import {
  Input,
  Button,
  Space,
  Table,
  Tag,
  message as AntMessage,
  Tabs,
  Modal,
} from "antd";
import {
  EditComponent,
  AddComponent,
} from "../../../components/pagecomponents/InventoryEntryModal";
import { API_BASE } from "../../../utils/API_BASE";

export default function Inventory() {
  const [activeTab, setActiveTab] = useState("Parts");
  const [inventory, setInventory] = useState([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [componentToEdit, setComponentToEdit] = useState(null);

  // Sample data
  // useEffect(() => {
  //   const sampleData = [
  //     {
  //       id: 1,
  //       partName: "Hydraulic Pump",
  //       partLoc: "Hangar A - Shelf 1",
  //       currQty: 3,
  //       pricePerUnit: 2500,
  //       partsConsumed: 500,
  //       stockLevel: "Critical",
  //     },
  //     {
  //       id: 2,
  //       partName: "Landing Gear Tire",
  //       partLoc: "Hangar B - Shelf 4",
  //       currQty: 10,
  //       pricePerUnit: 800,
  //       partsConsumed: 1200,
  //       stockLevel: "Adequate",
  //     },
  //     {
  //       id: 3,
  //       partName: "Avionics Display Unit",
  //       partLoc: "Hangar C - Shelf 2",
  //       currQty: 1,
  //       pricePerUnit: 12000,
  //       partsConsumed: 0,
  //       stockLevel: "Low",
  //     },
  //   ];
  //   setInventory(sampleData);
  // }, []);

  const fetchComponents = async () => {
    try {
      const res = await fetch(`${API_BASE}/api/component-inventory/components`);
      console.log("Fetch response:", res);
      const data = await res.json();
      console.log("Data received:", data);

      if (data.success) {
        const formatted = data.data.map((item) => ({
          id: item._id,
          partName: item.name,
          partLoc: item.source,
          currQty: item.quantity_in_stock,
          pricePerUnit: item.pricePerUnit || 0,
          partsConsumed: item.partsConsumed || 0,
          stockLevel: item.status,
        }));

        setInventory(formatted);
      }
    } catch (error) {
      AntMessage.error("Failed to load components");
    }
  };
  useEffect(() => {
    fetchComponents();
  }, []);

  const handleAddComponent = async (newComponent) => {
    try {
      const res = await fetch(
        `${API_BASE}/api/component-inventory/add-component`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(newComponent),
        },
      );

      const data = await res.json();

      if (data.success) {
        fetchComponents();
        setShowAddModal(false);
        AntMessage.success("Component added successfully");
      }
    } catch (error) {
      AntMessage.error("Failed to add component");
    }
  };

  const handleEditClick = (component) => {
    setComponentToEdit(component);
    setShowEditModal(true);
  };

  const handleComponentEdited = async (updatedComponent) => {
    try {
      const res = await fetch(
        `${API_BASE}/api/component-inventory/update-component/${componentToEdit.id}`,
        {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(updatedComponent),
        },
      );

      const data = await res.json();

      if (data.success) {
        fetchComponents();
        setShowEditModal(false);
        setComponentToEdit(null);
        AntMessage.success("Component updated successfully");
      }
    } catch (error) {
      AntMessage.error("Update failed");
    }
  };

  const handleDeleteClick = (id) => {
    Modal.confirm({
      title: "Delete Component",
      content: "Are you sure you want to delete this component?",
      okText: "Yes, delete",
      cancelText: "Cancel",
      okType: "danger",
      onOk: async () => {
        try {
          const res = await fetch(
            `${API_BASE}/api/component-inventory/delete-component/${id}`,
            {
              method: "DELETE",
            },
          );

          const data = await res.json();

          if (data.success) {
            fetchComponents();
            AntMessage.success("Component deleted");
          }
        } catch (error) {
          AntMessage.error("Delete failed");
        }
      },
    });
  };

  const columns = [
    { title: "#", key: "index", render: (_, __, idx) => idx + 1, width: 50 },
    { title: "Part Name", dataIndex: "partName", key: "partName" },
    { title: "Part Location", dataIndex: "partLoc", key: "partLoc" },
    { title: "Current Quantity", dataIndex: "currQty", key: "currQty" },
    { title: "Price/Unit", dataIndex: "pricePerUnit", key: "pricePerUnit" },
    {
      title: "Parts Consumed",
      dataIndex: "partsConsumed",
      key: "partsConsumed",
    },
    {
      title: "Stock Level",
      dataIndex: "stockLevel",
      key: "stockLevel",
      render: (text) => {
        let color = "green";
        if (text.toLowerCase() === "critical") color = "red";
        else if (text.toLowerCase() === "low") color = "orange";
        return <Tag color={color}>{text}</Tag>;
      },
    },
    {
      title: "Actions",
      key: "actions",
      render: (_, record) => (
        <Space>
          <Button type="primary" onClick={() => handleEditClick(record)}>
            Edit
          </Button>
          <Button danger onClick={() => handleDeleteClick(record.id)}>
            Delete
          </Button>
        </Space>
      ),
    },
  ];

  const filteredInventory = inventory.filter((item) =>
    searchQuery
      ? item.partName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        item.partLoc.toLowerCase().includes(searchQuery.toLowerCase()) ||
        item.stockLevel.toLowerCase().includes(searchQuery.toLowerCase())
      : true,
  );

  return (
    <div style={{ justifyContent: "space-between" }}>
      <Input
        placeholder="Search by Part Name, Location, Stock Level..."
        value={searchQuery}
        onChange={(e) => setSearchQuery(e.target.value)}
        style={{ width: 300 }}
      />
      {activeTab === "Parts" && (
        <Button type="primary" onClick={() => setShowAddModal(true)}>
          Add Component
        </Button>
      )}

      <Tabs activeKey={activeTab} onChange={setActiveTab}>
        <Tabs.TabPane tab="Parts" key="Parts" />
        <Tabs.TabPane tab="Important" key="Important" />
      </Tabs>

      <Table rowKey="id" columns={columns} dataSource={filteredInventory} />

      <AddComponent
        visible={showAddModal}
        onClose={() => setShowAddModal(false)}
        onComponentAdded={handleAddComponent}
      />

      {componentToEdit && (
        <EditComponent
          visible={showEditModal}
          onClose={() => setShowEditModal(false)}
          onComponentEdited={handleComponentEdited}
          initialData={componentToEdit}
        />
      )}
    </div>
  );
}
