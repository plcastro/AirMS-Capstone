import React, { useState, useContext } from "react";
import { View, Text, TextInput, Modal, TouchableOpacity } from "react-native";
import { styles } from "../stylesheets/styles";
import Button from "../components/Button";
import FlightTable from "../components/FlightTable";

import Icon from "@mdi/react";
import { mdiGasStation, mdiOil, mdiMapMarkerDistance } from "@mdi/js";
import { AuthContext } from "../Context/AuthContext";
import FlightEntry from "../components/FlightLogEntry";

export default function FlightLog() {
  const { user } = useContext(AuthContext);

  const [searchQuery, setSearchQuery] = useState("");
  const [activeTab, setActiveTab] = useState("Defects");
  const [modalVisible, setModalVisible] = useState(false);

  const TLheaders = [
    { label: "#", key: "index" },
    { label: "Tail No.", key: "tailNum" },
    { label: "Date", key: "date" },
    { label: "Depart", key: "depart" },
    { label: "Arrive", key: "arrive" },
    { label: "Off Block", key: "offBlock" },
    { label: "On Block", key: "onBlock" },
    { label: "Block Time", key: "blockTime" },
    { label: "Flight Time", key: "flightTime" },
    { label: "Action", key: "technicalAction" },
  ];

  const Defheaders = [
    { label: "#", key: "index" },
    { label: "Date", key: "date" },
    { label: "Reported by", key: "fullname" },
    { label: "Aircraft", key: "aircraft" },
    { label: "Description", key: "destination" },
    { label: "Action", key: "defectAction" },
  ];

  const TL_COLUMN_WIDTHS = {
    index: 10,
    tailNum: 150,
    date: 150,
    depart: 150,
    arrive: 150,
    offBlock: 150,
    onBlock: 150,
    blockTime: 150,
    flightTime: 150,
    technicalAction: 350,
  };

  const DEF_COLUMN_WIDTHS = {
    index: 10,
    date: 150,
    fullname: 200,
    destination: 150,
    defectAction: 350,
  };

  return (
    <View style={{ flex: 1, padding: 16 }}>
      {/* Search */}
      <View style={[styles.searchRow, { maxWidth: 350 }]}>
        <TextInput
          placeholderTextColor="gray"
          placeholder="Search by date, origin, or destination..."
          style={styles.searchInput}
          value={searchQuery}
          onChangeText={setSearchQuery}
        />
      </View>

      {/* Tabs + New Entry */}
      <View
        style={{
          flexDirection: "row",
          justifyContent: "space-between",
          alignItems: "center",
        }}
      >
        <View style={{ flexDirection: "row" }}>
          <Button
            label="Defects"
            onPress={() => setActiveTab("Defects")}
            buttonStyle={[
              activeTab === "Defects"
                ? styles.alertConfirmBtn
                : styles.alertCancelBtn,
              { width: 150, marginRight: 10 },
            ]}
            buttonTextStyle={
              activeTab === "Defects"
                ? styles.alertConfirmBtnText
                : styles.alertCancelBtnText
            }
          />

          <Button
            label="Technical Log"
            onPress={() => setActiveTab("TechnicalLog")}
            buttonStyle={[
              activeTab === "TechnicalLog"
                ? styles.alertConfirmBtn
                : styles.alertCancelBtn,
              { width: 150 },
            ]}
            buttonTextStyle={
              activeTab === "TechnicalLog"
                ? styles.alertConfirmBtnText
                : styles.alertCancelBtnText
            }
          />
        </View>

        <Button
          label="+ New Entry"
          onPress={() => setModalVisible(true)}
          buttonStyle={[{ width: 150 }, styles.alertConfirmBtn]}
          buttonTextStyle={styles.alertConfirmBtnText}
        />
      </View>

      {/* Content */}
      <View style={{ marginTop: 10 }}>
        {activeTab === "Defects" && (
          <FlightTable headers={Defheaders} columnWidths={DEF_COLUMN_WIDTHS} />
        )}

        {activeTab === "TechnicalLog" && (
          <>
            <View style={{ flexDirection: "row", gap: 30, marginBottom: 10 }}>
              {[
                {
                  label: "Total Fuel Purchased",
                  icon: mdiGasStation,
                  value: "-",
                },
                {
                  label: "Total Fuel Burned",
                  icon: mdiOil,
                  value: "-",
                },
                {
                  label: "Total Leg Distance",
                  icon: mdiMapMarkerDistance,
                  value: "- NM",
                },
              ].map((card, i) => (
                <View
                  key={i}
                  style={{
                    backgroundColor: "#26866F",
                    borderRadius: 8,
                    alignItems: "center",
                    justifyContent: "center",
                    padding: 12,
                    width: 200,
                    height: 100,
                  }}
                >
                  <Text
                    style={{ color: "#fff", fontSize: 16, fontWeight: 500 }}
                  >
                    {card.label}
                  </Text>
                  <View style={{ flexDirection: "row", alignItems: "center" }}>
                    <Icon
                      path={card.icon}
                      size={1.5}
                      color="#fff"
                      style={{ marginRight: 5 }}
                    />
                    <Text
                      style={{ color: "#fff", fontSize: 21, fontWeight: 500 }}
                    >
                      {card.value}
                    </Text>
                  </View>
                </View>
              ))}
            </View>

            <FlightTable
              headers={TLheaders}
              columnWidths={TL_COLUMN_WIDTHS}
              userRole="pilot"
            />
          </>
        )}
      </View>

      {/* Modal */}
      <FlightEntry
        visible={modalVisible}
        onClose={() => setModalVisible(false)}
      />
    </View>
  );
}
