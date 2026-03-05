import React, { useState } from "react";
import { View, TextInput, Dimensions } from "react-native";
import TaskTabs from "../../components/TaskAssignment.jsx/TaskTabs";
import TaskChecklist from "../../components/TaskAssignment.jsx/TaskChecklist";
import { Picker } from "@react-native-picker/picker";
import { styles } from "../../stylesheets/styles";
import TaskInfo from "../../components/TaskAssignment.jsx/TaskInfo";
const { width } = Dimensions.get("window");

export default function MechanicTaskScreen() {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedAircraft, setSelectedAircraft] = useState("all");
  const [modalVisible, setModalVisible] = useState(false);
  const [selectedTask, setSelectedTask] = useState(null);
  const [tasks, setTasks] = useState(TaskInfo);
  
  const aircraftOptions = [
    { id: "all", name: "All Aircraft" },
    { id: "2810", name: "Aircraft 2810" },
    { id: "2811", name: "Aircraft 2811" },
    { id: "2812", name: "Aircraft 2812" },
  ];

  const filteredTasks = tasks.filter((task) => {
    if (
      searchQuery &&
      !task.title.toLowerCase().includes(searchQuery.toLowerCase())
    )
      return false;

    if (selectedAircraft !== "all") {
      if (task.aircraft !== selectedAircraft) {
        return false;
      }
    }

    return true;
  });

  const handleTaskPress = (task) => {
    setSelectedTask(task);
    setModalVisible(true);
  };

  const handleStartTask = (task) => {
    const now = new Date();
    const formattedDate = now.toLocaleDateString('en-US', {
      month: '2-digit',
      day: '2-digit',
      year: 'numeric'
    });
    const formattedTime = now.toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit',
      hour12: true
    });

    const updatedTasks = tasks.map(t => {
      if (t.id === task.id) {
        return {
          ...t,
          status: "Ongoing",
          startDateTime: `${formattedDate} ${formattedTime}`
        };
      }
      return t;
    });

    setTasks(updatedTasks);
    setSelectedTask({ 
      ...task, 
      status: "Ongoing", 
      startDateTime: `${formattedDate} ${formattedTime}`,
      findings: task.findings || ""
    });
  };

  const handleSaveDraft = (task, checklistState, findings) => {
    const updatedTasks = tasks.map(t => {
      if (t.id === task.id) {
        return {
          ...t,
          checklistState: checklistState,
          findings: findings
        };
      }
      return t;
    });
    setTasks(updatedTasks);
    
    setSelectedTask(prev => ({
      ...prev,
      checklistState: checklistState,
      findings: findings
    }));
  };

  const handleTurnIn = (task, checklistState, findings, options = {}) => {
    const now = new Date();
    const formattedDate = now.toLocaleDateString('en-US', {
      month: '2-digit',
      day: '2-digit',
      year: 'numeric'
    });
    const formattedTime = now.toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit',
      hour12: true
    });

    const updatedTasks = tasks.map(t => {
      if (t.id === task.id) {
        if (options.undo) {
          return {
            ...t,
            status: options.newStatus || "Ongoing",
            endDateTime: "",
            checklistState: checklistState,
            findings: findings
          };
        } else {
          return {
            ...t,
            status: "Turned in",
            endDateTime: `${formattedDate} ${formattedTime}`,
            checklistState: checklistState,
            findings: findings
          };
        }
      }
      return t;
    });
    setTasks(updatedTasks);
  };

  return (
    <View style={styles.container}>
      {/* Search and Filter Row */}
      <View style={[styles.searchRow, { 
        flexDirection: "row", 
        alignItems: "center",
        gap: 10,
        maxWidth: 550,
        marginBottom: 10,
        width: "100%"
      }]}>
        <View style={{ flex: 0.7 }}>
          <TextInput
            placeholder="Search tasks"
            placeholderTextColor="gray"
            style={[styles.searchInput, { 
              height: 40,
              width: "100%",
              backgroundColor: "#fff",
              borderWidth: 1,
              borderColor: "#d4d4d4",
              borderRadius: 8,
              paddingHorizontal: 12,
            }]}
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
        </View>
        
        <View style={{ 
          flex: 0.3,
          height: 40,
          backgroundColor: "#fff",
          borderWidth: 1,
          borderColor: "#d4d4d4",
          borderRadius: 8,
          overflow: "hidden",
          justifyContent: "center",
        }}>
          <Picker
            selectedValue={selectedAircraft}
            onValueChange={(itemValue) => setSelectedAircraft(itemValue)}
            style={[
              styles.filterPicker,
              {
                height: 40,
                width: "100%",
                color: "#333",
              }
            ]}
            dropdownIconColor="#666"
            mode="dropdown"
          >
            {aircraftOptions.map((aircraft) => (
              <Picker.Item
                key={aircraft.id}
                label={aircraft.name}
                value={aircraft.id}
              />
            ))}
          </Picker>
        </View>
      </View>
      <View style={styles.maintenanceSearchDivider} />

      <TaskTabs
        tasks={filteredTasks}
        onTaskPress={handleTaskPress}
      />

      <TaskChecklist
        visible={modalVisible}
        onClose={() => setModalVisible(false)}
        task={selectedTask}
        onStartTask={handleStartTask}
        onSaveDraft={handleSaveDraft}
        onTurnIn={handleTurnIn}
      />
    </View>
  );
}