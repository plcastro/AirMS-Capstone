import React, { useState, useEffect } from "react";
import { Input, Button, Tabs, message as AntMessage } from "antd";
import { PlusOutlined } from "@ant-design/icons";
import { API_BASE } from "../../../utils/API_BASE";
import InventoryTable from "../../../components/tables/InventoryTable";
import {
  AddComponent,
  EditComponent,
} from "../../../components/pagecomponents/InventoryEntryModal";

export default function Inventory() {
  const [activeTab, setActiveTab] = useState("Parts");
  const [inventory, setInventory] = useState([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [componentToEdit, setComponentToEdit] = useState(null);

  const fetchComponents = async () => {
    try {
      const res = await fetch(`${API_BASE}/api/component-inventory/components`);
      const data = await res.json();
      if (data.success) {
        const formatted = data.data.map((item, index) => ({
          id: item._id,
          index: index + 1,
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
          headers: { "Content-Type": "application/json" },
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

  const handleEditComponent = (component) => {
    setComponentToEdit(component);
    setShowEditModal(true);
  };

  const handleComponentEdited = async (updatedComponent) => {
    try {
      const res = await fetch(
        `${API_BASE}/api/component-inventory/update-component/${componentToEdit.id}`,
        {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
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

  const handleDeleteComponent = (id) => {
    fetch(`${API_BASE}/api/component-inventory/delete-component/${id}`, {
      method: "DELETE",
    })
      .then((res) => res.json())
      .then((data) => {
        if (data.success) {
          fetchComponents();
          AntMessage.success("Component deleted");
        } else AntMessage.error("Delete failed");
      })
      .catch(() => AntMessage.error("Delete failed"));
  };

  const filteredInventory = inventory.filter(
    (item) =>
      !searchQuery ||
      item.partName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.partLoc.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.stockLevel.toLowerCase().includes(searchQuery.toLowerCase()),
  );

  const headers = [
    { label: "#", key: "index", numeric: true },
    { label: "Part Name", key: "partName" },
    { label: "Part Location", key: "partLoc" },
    { label: "Current Quantity", key: "currQty", numeric: true },
    { label: "Price/Unit", key: "pricePerUnit", numeric: true },
    { label: "Parts Consumed", key: "partsConsumed", numeric: true },
    { label: "Stock Level", key: "stockLevel" },
    { label: "Actions", key: "actions" },
  ];

  return (
    <div>
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          marginBottom: 16,
        }}
      >
        <Input
          placeholder="Search by Part Name, Location, Stock Level..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          style={{ width: 300 }}
        />
        {activeTab === "Parts" && (
          <Button
            type="primary"
            icon={<PlusOutlined />}
            onClick={() => setShowAddModal(true)}
          >
            Add Component
          </Button>
        )}
      </div>

      <Tabs
        activeKey={activeTab}
        onChange={setActiveTab}
        items={[
          {
            key: "Parts",
            label: "Parts",
            children: (
              <InventoryTable
                headers={headers}
                data={filteredInventory}
                onEditComponent={handleEditComponent}
                onDeleteComponent={handleDeleteComponent}
              />
            ),
          },
          {
            key: "Important",
            label: "Important",
            children: (
              <InventoryTable
                headers={headers}
                data={filteredInventory.filter(
                  (c) => c.stockLevel.toLowerCase() === "critical",
                )}
                onEditComponent={handleEditComponent}
                onDeleteComponent={handleDeleteComponent}
              />
            ),
          },
        ]}
      />

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
