import React, { useState } from "react";
import {
  View,
  Text,
  FlatList,
  TextInput,
  TouchableOpacity,
  Dimensions,
} from "react-native";
import MechanicAssignment from "./MechanicAssignment";
import { styles } from "../../stylesheets/styles";
import { COLORS } from "../../stylesheets/colors";

const { width } = Dimensions.get("window");

// Mock data for mechanics
const MECHANICS_DATA = [
  { id: "1", name: "John Doe", status: "Available", avatar: null },
  { id: "2", name: "Clara Bang", status: "Available", avatar: null },
  { id: "3", name: "Joe Bloggs", status: "Available", avatar: null },
  { id: "4", name: "Max Miller", status: "Available", avatar: null },
  { id: "5", name: "Liam Brown", status: "Busy", avatar: null },
  { id: "6", name: "Dilan Wolf", status: "Busy", avatar: null },
  { id: "7", name: "Bob Rosfield", status: "Busy", avatar: null },
];

export default function MechanicList() {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedMechanic, setSelectedMechanic] = useState(null);

  const filteredMechanics = MECHANICS_DATA.filter((mechanic) => {
    if (
      searchQuery &&
      !mechanic.name.toLowerCase().includes(searchQuery.toLowerCase())
    ) {
      return false;
    }
    return true;
  });

  const getStatusColor = (status) => {
    return status === "Available" ? "#34A853" : "#FF6B6B";
  };

  const renderMechanicItem = ({ item }) => (
    <TouchableOpacity
      onPress={() => setSelectedMechanic(item)}
      style={{
        flexDirection: "row",
        alignItems: "center",
        padding: 15,
        backgroundColor: "#fff",
        borderRadius: 10,
        marginBottom: 10,
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.1,
        shadowRadius: 2,
        elevation: 2,
      }}
    >
      {/* Avatar Placeholder */}
      <View
        style={{
          width: 50,
          height: 50,
          borderRadius: 25,
          backgroundColor: COLORS.primaryLight,
          justifyContent: "center",
          alignItems: "center",
          marginRight: 15,
        }}
      >
        <Text style={{ color: "#fff", fontSize: 20, fontWeight: "bold" }}>
          {item.name.charAt(0)}
        </Text>
      </View>

      {/* Mechanic Info */}
      <View style={{ flex: 1 }}>
        <Text style={{ fontSize: 16, fontWeight: "600", marginBottom: 4 }}>
          {item.name}
        </Text>
        <Text style={{ color: getStatusColor(item.status), fontWeight: "500" }}>
          {item.status}
        </Text>
      </View>

      {/* Arrow Icon */}
      <Text style={{ fontSize: 20, color: COLORS.grayDark }}>›</Text>
    </TouchableOpacity>
  );

  if (selectedMechanic) {
    return (
      <MechanicAssignment 
        mechanic={selectedMechanic} 
        onBack={() => setSelectedMechanic(null)} 
      />
    );
  }

  // Otherwise show the list
  return (
    <View style={[styles.container, { paddingHorizontal: 15 }]}>
      {/* Search Bar */}
      <View
        style={{
          flexDirection: "row",
          alignItems: "center",
          marginBottom: 15,
          gap: 10,
        }}
      >
        <TextInput
          placeholder="Search by mechanic"
          placeholderTextColor={COLORS.grayDark}
          style={[
            styles.searchInput,
            {
              flex: 1,
              backgroundColor: COLORS.grayLight,
              borderRadius: 8,
              paddingHorizontal: 12,
              height: 40,
            },
          ]}
          value={searchQuery}
          onChangeText={setSearchQuery}
        />
      </View>

      {/* Mechanics List */}
      <FlatList
        data={filteredMechanics}
        keyExtractor={(item) => item.id}
        renderItem={renderMechanicItem}
        showsVerticalScrollIndicator={false}
        ListEmptyComponent={
          <View style={{ alignItems: "center", marginTop: 50 }}>
            <Text style={{ color: COLORS.grayDark, fontSize: 16 }}>
              No mechanics found
            </Text>
          </View>
        }
      />
    </View>
  );
}