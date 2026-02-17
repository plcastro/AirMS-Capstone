import React, { useState, useEffect } from "react";
import {
  View,
  TextInput,
  Text,
  TouchableOpacity,
  Platform,
} from "react-native";
import { styles } from "../../stylesheets/styles";

import InventoryTableComp from "../../components/InventoryComps/InventoryTableComp";
import Button from "../../components/Button";
import AddComponent from "../../components/InventoryComps/AddComponent";
import EditComponent from "../../components/InventoryComps/EditComponent";

export default function Inventory() {
  const [activeTab, setActiveTab] = useState("Parts");
  const [inventory, setInventory] = useState([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [aircraftFilter, setAircraftFilter] = useState("all");

  const [showAddComponent, setShowAddComponent] = useState(false);
  const [showEditComponent, setShowEditComponent] = useState(false);
  const [componentToEdit, setComponentToEdit] = useState(null);

  // Sample initial data
  useEffect(() => {
    const sampleInventoryData = [
      {
        id: 1,
        partName: "Hydraulic Pump",
        partLoc: "Hangar A - Shelf 1",
        currQty: 3,
        pricePerUnit: 2500,
        invValue: 7500,
        partConsumptionCost: 500,
        stockLevel: "Critical",
      },
      {
        id: 2,
        partName: "Landing Gear Tire",
        partLoc: "Hangar B - Shelf 4",
        currQty: 10,
        pricePerUnit: 800,
        invValue: 8000,
        partConsumptionCost: 1200,
        stockLevel: "Adequate",
      },
      {
        id: 3,
        partName: "Avionics Display Unit",
        partLoc: "Hangar C - Shelf 2",
        currQty: 1,
        pricePerUnit: 12000,
        invValue: 12000,
        partConsumptionCost: 0,
        stockLevel: "Low",
      },
      {
        id: 4,
        partName: "Fuel Pump",
        partLoc: "Hangar A - Shelf 3",
        currQty: 0,
        pricePerUnit: 1500,
        invValue: 0,
        partConsumptionCost: 1500,
        stockLevel: "Critical",
      },
      {
        id: 5,
        partName: "Oxygen Mask Assembly",
        partLoc: "Hangar D - Shelf 1",
        currQty: 15,
        pricePerUnit: 200,
        invValue: 3000,
        partConsumptionCost: 400,
        stockLevel: "Adequate",
      },
      {
        id: 6,
        partName: "Brake Assembly",
        partLoc: "Hangar B - Shelf 5",
        currQty: 2,
        pricePerUnit: 1800,
        invValue: 3600,
        partConsumptionCost: 800,
        stockLevel: "Low",
      },
      {
        id: 7,
        partName: "Navigation Antenna",
        partLoc: "Hangar C - Shelf 3",
        currQty: 5,
        pricePerUnit: 950,
        invValue: 4750,
        partConsumptionCost: 200,
        stockLevel: "Adequate",
      },
      {
        id: 8,
        partName: "Cabin Light Panel",
        partLoc: "Hangar D - Shelf 2",
        currQty: 0,
        pricePerUnit: 300,
        invValue: 0,
        partConsumptionCost: 100,
        stockLevel: "Critical",
      },
      {
        id: 9,
        partName: "Pitot Tube",
        partLoc: "Hangar A - Shelf 2",
        currQty: 7,
        pricePerUnit: 150,
        invValue: 1050,
        partConsumptionCost: 50,
        stockLevel: "Adequate",
      },
      {
        id: 10,
        partName: "Flight Control Cable",
        partLoc: "Hangar B - Shelf 1",
        currQty: 1,
        pricePerUnit: 500,
        invValue: 500,
        partConsumptionCost: 300,
        stockLevel: "Low",
      },
      {
        id: 11,
        partName: "Emergency Locator Transmitter",
        partLoc: "Hangar E - Shelf 3",
        currQty: 4,
        pricePerUnit: 4500,
        invValue: 18000,
        partConsumptionCost: 0,
        stockLevel: "Adequate",
      },
      {
        id: 12,
        partName: "Fuel Filter",
        partLoc: "Hangar A - Shelf 6",
        currQty: 12,
        pricePerUnit: 120,
        invValue: 1440,
        partConsumptionCost: 200,
        stockLevel: "Adequate",
      },
      {
        id: 13,
        partName: "Turbine Blade",
        partLoc: "Hangar C - Shelf 1",
        currQty: 0,
        pricePerUnit: 5000,
        invValue: 0,
        partConsumptionCost: 5000,
        stockLevel: "Critical",
      },
      {
        id: 14,
        partName: "Cockpit Seat Cushion",
        partLoc: "Hangar D - Shelf 4",
        currQty: 6,
        pricePerUnit: 350,
        invValue: 2100,
        partConsumptionCost: 50,
        stockLevel: "Low",
      },
      {
        id: 15,
        partName: "Hydraulic Hose",
        partLoc: "Hangar B - Shelf 2",
        currQty: 8,
        pricePerUnit: 220,
        invValue: 1760,
        partConsumptionCost: 100,
        stockLevel: "Adequate",
      },
    ];

    setInventory(sampleInventoryData);
  }, []);

  // Column definitions
  const headers = [
    { label: "#", key: "index" },
    { label: "Part Name", key: "partName" },
    { label: "Part Location", key: "partLoc" },
    { label: "Current Quantity", key: "currQty" },
    { label: "Price/Unit", key: "pricePerUnit" },
    { label: "Total Inventory Value", key: "invValue" },
    { label: "Total Parts Consumption Cost", key: "partConsumptionCost" },
    { label: "Stock Level", key: "stockLevel" },
    { label: "Actions", key: "actions" },
  ];

  const importantHeaders = [
    { label: "#", key: "index" },
    { label: "Part Name", key: "partName" },
    { label: "Current Quantity", key: "currQty" },
    { label: "Stock Level", key: "stockLevel" },
  ];
  const COLUMN_WIDTHS = {
    index: 10,
    partName: 200,
    partLoc: 170,
    currQty: 100,
    pricePerUnit: 150,
    invValue: 200,
    partConsumptionCost: 200,
    stockLevel: 100,
    actions: 150,
  };
  const importantColumnWidths = {
    index: 10,
    partName: 200,
    currQty: 120,
    stockLevel: 120,
  };

  // Handlers
  const handleAddComponent = (newComponent) => {
    setInventory((prev) => [
      ...prev,
      { ...newComponent, id: prev.length ? prev[prev.length - 1].id + 1 : 1 },
    ]);
    setShowAddComponent(false);
  };

  const handleEditComponent = (component) => {
    setComponentToEdit(component);
    setShowEditComponent(true);
  };

  const handleComponentUpdated = (updatedComponent) => {
    setInventory((prev) =>
      prev.map((comp) =>
        comp.id === updatedComponent.id ? updatedComponent : comp,
      ),
    );
    setShowEditComponent(false);
    setComponentToEdit(null);
  };

  const handleDeleteComponent = (id) => {
    setInventory((prev) => prev.filter((comp) => comp.id !== id));
  };

  const filteredInventory = inventory
    .filter((item) =>
      searchQuery
        ? item.partName.toLowerCase().includes(searchQuery.toLowerCase()) ||
          item.partLoc.toLowerCase().includes(searchQuery.toLowerCase()) ||
          item.stockLevel.toLowerCase().includes(searchQuery.toLowerCase())
        : true,
    )
    .filter((item) =>
      aircraftFilter !== "all" ? item.aircraft === aircraftFilter : true,
    );

  // Tab-specific data
  const importantInventory = filteredInventory.filter(
    (item) => item.stockLevel === "Critical",
  );

  return (
    <View style={{ flex: 1, padding: 16 }}>
      {/* Search & Filter */}
      <View style={[styles.searchRow, { minWidth: "100%" }]}>
        <TextInput
          placeholder="Search by Part Name, Location, Stock Level..."
          style={styles.searchInput}
          value={searchQuery}
          onChangeText={setSearchQuery}
        />
      </View>

      <View
        style={{
          flexDirection: "row",
          flexWrap: "wrap",
          alignItems: "center",
          marginBottom: 16,
        }}
      >
        {/* Tabs */}
        {["Parts", "Important"].map((tab) => (
          <TouchableOpacity
            key={tab}
            onPress={() => setActiveTab(tab)}
            style={{
              flex: 1,
              maxWidth: 200,
              minWidth: 100, // ensures buttons don’t get too small on mobile
              padding: 10,
              backgroundColor: activeTab === tab ? "#26866F" : "#ccc",
              marginHorizontal: 4,
              borderRadius: 6,
              marginBottom: 4, // space when wrapping
            }}
          >
            <Text
              style={{
                textAlign: "center",
                color: activeTab === tab ? "#fff" : "#000",
                fontWeight: "bold",
              }}
            >
              {tab}
            </Text>
          </TouchableOpacity>
        ))}

        {/* Add Component Button */}
        {activeTab === "Parts" && (
          <View
            style={{
              minWidth: 100,
              marginLeft: "auto",
            }}
          >
            <Button
              iconName="add"
              label={Platform.OS === "web" ? "Add Component" : ""}
              buttonStyle={[
                styles.button,
                {
                  backgroundColor: "#26866F",
                  width: Platform.OS === "web" ? "100%" : 50,
                  paddingHorizontal: Platform.OS === "web" ? 7 : 0,
                },
              ]}
              buttonTextStyle={{ color: "#fff" }}
              onPress={() => setShowAddComponent(true)}
            />
          </View>
        )}
      </View>
      {/* Modals */}
      <AddComponent
        visible={showAddComponent}
        onClose={() => setShowAddComponent(false)}
        onUserAdded={handleAddComponent}
      />
      {componentToEdit && (
        <EditComponent
          visible={showEditComponent}
          onClose={() => setShowEditComponent(false)}
          onComponentEdited={handleComponentUpdated}
          initialData={componentToEdit}
        />
      )}

      {/* Table */}
      <InventoryTableComp
        headers={activeTab === "Parts" ? headers : importantHeaders}
        columnWidths={
          activeTab === "Parts" ? COLUMN_WIDTHS : importantColumnWidths
        }
        data={
          activeTab === "Parts"
            ? filteredInventory.map((item, i) => ({ ...item, index: i + 1 }))
            : importantInventory.map((item, i) => ({
                index: i + 1,
                partName: item.partName,
                currQty: item.currQty,
                stockLevel: item.stockLevel,
              }))
        }
        onEditComponent={handleEditComponent}
        onDeleteComponent={handleDeleteComponent}
      />
    </View>
  );
}
