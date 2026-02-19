import React, { useState } from "react";
import {
  View,
  Text,
  Modal,
  Alert,
  TextInput,
  Platform,
  Dimensions,
} from "react-native";
import DateTimePicker from "@react-native-community/datetimepicker";
import { Picker } from "@react-native-picker/picker";
import Button from "../Button";
import { styles } from "../../stylesheets/styles";

const { width } = Dimensions.get("window");

export default function AddTask({
  visible,
  onClose,
  onAddTask,
  employees,
  taskOptions,
}) {
  const [selectedEmployee, setSelectedEmployee] = useState("");
  const [selectedTask, setSelectedTask] = useState("");
  const [dueDate, setDueDate] = useState(new Date());
  const [startDate, setStartDate] = useState(new Date());
  const [endDate, setEndDate] = useState(new Date());

  const confirmAdd = () => {
    onClose();
  };

  const confirmDiscard = () => {
    onClose();
  };

  return (
    <Modal visible={visible} animationType="slide" transparent>
      <View style={styles.alertOverlay}>
        <View
          style={[
            styles.alertContainer,
            {
              width: width > 425 ? 600 : "95%",
              gap: 10,
            },
          ]}
        >
          <Text style={[styles.alertTitle, { textAlign: "left" }]}>
            Add Task
          </Text>

          {/* Pick Employee */}
          <Text>Pick Employee</Text>
          <Picker
            style={[styles.formInput, { borderRadius: 0 }]}
            selectedValue={selectedEmployee}
            onValueChange={(itemValue) => setSelectedEmployee(itemValue)}
          >
            <Picker.Item label="Select Employee" value="" />
            {employees.map((emp) => (
              <Picker.Item key={emp.id} label={emp.name} value={emp.id} />
            ))}
          </Picker>

          {/* Pick Task */}
          <Text>Pick Task</Text>
          <Picker
            style={[styles.formInput, { borderRadius: 0 }]}
            selectedValue={selectedTask}
            onValueChange={(itemValue) => setSelectedTask(itemValue)}
          >
            <Picker.Item label="Select Task" value="" />
            {taskOptions.map((task) => (
              <Picker.Item key={task.id} label={task.name} value={task.id} />
            ))}
          </Picker>

          {/* Date Due */}
          <Text>Date Due</Text>
          <DateTimePicker
            value={dueDate}
            mode="date"
            display="default"
            onChange={(e, date) => setDueDate(date || dueDate)}
          />

          {/* Start Date & Time */}
          <Text>Start Date & Time</Text>
          <DateTimePicker
            value={startDate}
            mode="datetime"
            display="default"
            onChange={(e, date) => setStartDate(date || startDate)}
          />

          {/* End Date & Time */}
          <Text>End Date & Time</Text>
          <DateTimePicker
            value={endDate}
            mode="datetime"
            display="default"
            onChange={(e, date) => setEndDate(date || endDate)}
          />

          {/* Buttons */}
          <View
            style={{
              marginTop: 20,
              flexDirection: "row",
              justifyContent: "space-between",
              width: "100%",
              gap: 10,
            }}
          >
            <Button
              label="Discard Task"
              onPress={confirmDiscard}
              buttonStyle={[styles.secondaryAlertBtn, { width: "48%" }]}
              buttonTextStyle={styles.secondaryAlertBtnTxt}
            />
            <Button
              label="Add Task"
              onPress={confirmAdd}
              buttonStyle={[styles.primaryAlertBtn, { width: "48%" }]}
              buttonTextStyle={styles.primaryBtnTxt}
            />
          </View>
        </View>
      </View>
    </Modal>
  );
}
