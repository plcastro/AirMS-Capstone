import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
} from "react-native";
import { COLORS } from "../../stylesheets/colors";
import { MaterialCommunityIcons } from "@expo/vector-icons";

export default function FlightLogModalDestinations({
  legData,
  onUpdateLeg,
  isEditable = true,
  userRole,
}) {
  const [stations, setStations] = useState(legData.stations || [{ from: "", to: "" }]);
  const [legs, setLegs] = useState(legData.legs || [{
    stations: [{ from: "", to: "" }],
    blockTimeOn: "", blockTimeOff: "", flightTimeOn: "", flightTimeOff: "", totalTimeOn: "", totalTimeOff: "",
    date: "", passengers: ""
  }]);

  useEffect(() => {
    setStations(legData.stations || [{ from: "", to: "" }]);
    setLegs(legData.legs || [{
      stations: [{ from: "", to: "" }],
      blockTimeOn: "", blockTimeOff: "", flightTimeOn: "", flightTimeOff: "", totalTimeOn: "", totalTimeOff: "",
      date: "", passengers: ""
    }]);
  }, [legData]);

  const handleFromChange = (legIdx, stationIdx, text) => {
    if (!isEditable) return;
    const newLegs = [...legs];
    const newStations = [...newLegs[legIdx].stations];
    newStations[stationIdx].from = text;
    if (stationIdx > 0) {
      newStations[stationIdx - 1].to = text;
    }
    newLegs[legIdx].stations = newStations;
    setLegs(newLegs);
    onUpdateLeg({ ...legData, legs: newLegs });
  };

  const handleToChange = (legIdx, stationIdx, text) => {
    if (!isEditable) return;
    const newLegs = [...legs];
    const newStations = [...newLegs[legIdx].stations];
    newStations[stationIdx].to = text;
    if (stationIdx < newStations.length - 1) {
      newStations[stationIdx + 1].from = text;
    }
    newLegs[legIdx].stations = newStations;
    setLegs(newLegs);
    onUpdateLeg({ ...legData, legs: newLegs });
  };

  const addStation = (legIdx) => {
    if (!isEditable) return;
    const newLegs = [...legs];
    const lastStation = newLegs[legIdx].stations[newLegs[legIdx].stations.length - 1];
    const newStations = [...newLegs[legIdx].stations, { from: lastStation.to, to: "" }];
    newLegs[legIdx].stations = newStations;
    setLegs(newLegs);
    onUpdateLeg({ ...legData, legs: newLegs });
  };

  const removeStation = (legIdx, stationIdx) => {
    if (!isEditable) return;
    const newLegs = [...legs];
    if (newLegs[legIdx].stations.length > 1) {
      const newStations = [...newLegs[legIdx].stations];
      newStations.splice(stationIdx, 1);
      if (stationIdx > 0 && newStations[stationIdx]) {
        newStations[stationIdx].from = newStations[stationIdx - 1].to;
      }
      newLegs[legIdx].stations = newStations;
      setLegs(newLegs);
      onUpdateLeg({ ...legData, legs: newLegs });
    }
  };

  const addLeg = () => {
    if (!isEditable) return;
    const newLeg = {
      stations: [{ from: "", to: "" }],
      blockTimeOn: "", blockTimeOff: "", flightTimeOn: "", flightTimeOff: "", totalTimeOn: "", totalTimeOff: "",
      date: "", passengers: ""
    };
    const newLegs = [...legs, newLeg];
    setLegs(newLegs);
    onUpdateLeg({ ...legData, legs: newLegs });
  };

  const removeLeg = (legIdx) => {
    if (!isEditable) return;
    if (legs.length > 1) {
      const newLegs = [...legs];
      newLegs.splice(legIdx, 1);
      setLegs(newLegs);
      onUpdateLeg({ ...legData, legs: newLegs });
    }
  };

  const renderInput = (legIdx, label, fieldKey) => (
    <View style={{ marginBottom: 16 }}>
      <Text style={{ fontSize: 12, color: COLORS.black, marginBottom: 4, fontWeight: "500" }}>
        {label}
      </Text>
      <TextInput
        style={{
          backgroundColor: isEditable ? "#F2F2F2" : "#E8E8E8",
          borderRadius: 4,
          height: 38,
          paddingHorizontal: 10,
          fontSize: 12,
          color: isEditable ? COLORS.black : COLORS.grayDark,
        }}
        value={legs[legIdx][fieldKey] || ""}
        onChangeText={(text) => {
          if (!isEditable) return;
          const newLegs = [...legs];
          newLegs[legIdx][fieldKey] = text;
          setLegs(newLegs);
          onUpdateLeg({ ...legData, legs: newLegs });
        }}
        editable={isEditable}
      />
    </View>
  );

  const getOrdinalSuffix = (num) => {
    const j = num % 10;
    const k = num % 100;
    if (j === 1 && k !== 11) return "st";
    if (j === 2 && k !== 12) return "nd";
    if (j === 3 && k !== 13) return "rd";
    return "th";
  };

  return (
    <ScrollView showsVerticalScrollIndicator={false}>
      <Text style={{ fontSize: 14, fontWeight: "600", color: COLORS.grayDark, marginBottom: 16}}>
        Destination/s
      </Text>

      {legs.map((leg, legIdx) => {
        const legNumber = legIdx + 1;
        const suffix = getOrdinalSuffix(legNumber);
        
        return (
          <View key={legIdx} style={{
            backgroundColor: COLORS.white,
            borderRadius: 12,
            borderWidth: 1,
            borderColor: COLORS.grayMedium,
            shadowColor: COLORS.black,
            shadowOffset: { width: 0, height: 2 },
            shadowOpacity: 0.05,
            shadowRadius: 6,
            elevation: 2,
            overflow: "hidden",
            marginBottom: 20,
          }}>
            <View style={{ 
              backgroundColor: COLORS.primaryLight, 
              paddingVertical: 14, 
              paddingHorizontal: 16,
              flexDirection: "row",
              justifyContent: "space-between",
              alignItems: "center",
            }}>
              <Text style={{ fontSize: 14, color: COLORS.white, fontWeight: "600"}}>
                {legNumber}{suffix} Leg
              </Text>
              {isEditable && legs.length > 1 && (
                <TouchableOpacity onPress={() => removeLeg(legIdx)}>
                  <MaterialCommunityIcons name="close" size={20} color={COLORS.white} />
                </TouchableOpacity>
              )}
            </View>

            <View style={{ padding: 20 }}>
              <Text style={{ fontSize: 12, color: COLORS.black, marginBottom: 8, fontWeight: "500" }}>
                Station *
              </Text>

              {/* Stations List */}
              {leg.stations.map((station, stationIdx) => (
                <View key={stationIdx} style={{ flexDirection: "row", alignItems: "center", marginBottom: 10 }}>
                  <TextInput
                    style={{
                      flex: 1,
                      backgroundColor: isEditable ? "#F2F2F2" : "#E8E8E8",
                      borderRadius: 4,
                      height: 38,
                      paddingHorizontal: 10,
                      fontSize: 12,
                      color: isEditable ? COLORS.black : COLORS.grayDark,
                    }}
                    value={station.from}
                    onChangeText={(text) => handleFromChange(legIdx, stationIdx, text)}
                    placeholder="From"
                    placeholderTextColor={COLORS.grayDark}
                    editable={isEditable}
                  />
                  <Text style={{ marginHorizontal: 8, fontSize: 12, color: COLORS.black }}>-</Text>
                  <TextInput
                    style={{
                      flex: 1,
                      backgroundColor: isEditable ? "#F2F2F2" : "#E8E8E8",
                      borderRadius: 4,
                      height: 38,
                      paddingHorizontal: 10,
                      fontSize: 12,
                      color: isEditable ? COLORS.black : COLORS.grayDark,
                    }}
                    value={station.to}
                    onChangeText={(text) => handleToChange(legIdx, stationIdx, text)}
                    placeholder="To"
                    placeholderTextColor={COLORS.grayDark}
                    editable={isEditable}
                  />
                  {isEditable && leg.stations.length > 1 && (
                    <TouchableOpacity
                      onPress={() => removeStation(legIdx, stationIdx)}
                      style={{
                        marginLeft: 10,
                        width: 38,
                        height: 38,
                        backgroundColor: "#D9534F",
                        borderRadius: 4,
                        alignItems: "center",
                        justifyContent: "center",
                      }}
                    >
                      <MaterialCommunityIcons name="close" size={20} color={COLORS.white} />
                    </TouchableOpacity>
                  )}
                </View>
              ))}

              {isEditable && (
                <TouchableOpacity
                  onPress={() => addStation(legIdx)}
                  style={{
                    backgroundColor: COLORS.primaryLight,
                    borderRadius: 4,
                    paddingVertical: 10,
                    alignItems: "center",
                    justifyContent: "center",
                    marginBottom: 20,
                  }}
                >
                  <Text style={{ color: COLORS.white, fontSize: 12, fontWeight: "500" }}>+ Add Station</Text>
                </TouchableOpacity>
              )}

              <View style={{ marginTop: 10 }}>
                <Text style={{ fontSize: 14, fontWeight: "600", color: COLORS.black, marginBottom: 12}}>
                  Time Information
                </Text>
                {renderInput(legIdx, "Block Time (ON)", "blockTimeOn")}
                {renderInput(legIdx, "Block Time (OFF)", "blockTimeOff")}
                {renderInput(legIdx, "Flight Time (ON)", "flightTimeOn")}
                {renderInput(legIdx, "Flight Time (OFF)", "flightTimeOff")}
                {renderInput(legIdx, "Total Time (ON)", "totalTimeOn")}
                {renderInput(legIdx, "Total Time (OFF)", "totalTimeOff")}
              </View>

              <View style={{ marginTop: 10 }}>
                {renderInput(legIdx, "Date", "date")}
                {renderInput(legIdx, "Passengers", "passengers")}
              </View>
            </View>
          </View>
        );
      })}

      {isEditable && (
        <TouchableOpacity
          onPress={addLeg}
          style={{
            backgroundColor: COLORS.primaryLight,
            borderRadius: 4,
            paddingVertical: 10,
            alignItems: "center",
            justifyContent: "center",
            marginBottom: 20,
          }}
        >
          <Text style={{ color: COLORS.white, fontSize: 12, fontWeight: "500" }}>+ Add Leg</Text>
        </TouchableOpacity>
      )}
    </ScrollView>
  );
}
