import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  Image,
  Platform,
} from "react-native";
import React from "react";
import styles from "../stylesheets/styles";

export default function EditUser({ visible, onClose }) {
  if (!visible) return null;

  const Content = (
    <View style={styles.addUserOverlay}>
      <View style={styles.addUserCard}>
        <Text style={styles.addUserTitle}>EDIT USER</Text>

        <View style={styles.addUserContent}>
          {/* LEFT */}
          <View>
            <Text style={styles.label}>Image:</Text>
            <TouchableOpacity style={styles.imageBox}>
              <Text style={styles.plus}>＋</Text>
            </TouchableOpacity>
          </View>

          {/* RIGHT */}
          <View style={styles.form}>
            <View style={styles.formRow}>
              <Text style={styles.label}>Full Name:</Text>
              <TextInput style={styles.input} />
            </View>

            <View style={styles.formRow}>
              <Text style={styles.label}>Email:</Text>
              <TextInput style={styles.input} />
            </View>

            <View style={styles.formRow}>
              <Text style={styles.label}>Username:</Text>
              <TextInput style={styles.input} />
            </View>

            <View style={styles.formRow}>
              <Text style={styles.label}>Role:</Text>
              <TextInput style={styles.input} />
            </View>

            <View style={styles.buttonRow}>
              <TouchableOpacity style={styles.saveBtn}>
                <Text style={styles.btnText}>UPDATE</Text>
              </TouchableOpacity>

              <TouchableOpacity style={styles.cancelBtn} onPress={onClose}>
                <Text style={styles.btnText}>CANCEL</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </View>
    </View>
  );

  if (Platform.OS === "web") {
    return Content;
  }

  return (
    <Modal transparent animationType="fade" visible={visible}>
      {Content}
    </Modal>
  );
}
