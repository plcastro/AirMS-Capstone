import { Dimensions, StyleSheet } from "react-native";
const { width } = Dimensions.get("window");
export const styles = StyleSheet.create({
  // Login, Reset, Forgot password, Security Setup Screen Styles
  formCard: {
    marginHorizontal: "auto",
    marginVertical: "auto",
    maxWidth: "90%",
    maxHeight: "70%",
    width: 800,
    height: 500,
    backgroundColor: "#fff",
    alignItems: "center",
    justifyContent: "center",
    padding: 15,
    borderRadius: 15,
    elevation: 4, // Android
    shadowColor: "#000", // iOS
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
  },
  formContainer: {
    alignItems: "center",
    width: 500,
    maxWidth: "100%",
    maxHeight: 600,
  },
  formInput: {
    height: 50,
    width: "100%",
    borderWidth: 1,
    borderColor: "#e4e4e4",
    borderRadius: 10,
    marginTop: 10,
    marginBottom: 10,
    padding: 10,
  },
  headerText: {
    fontSize: Math.min(Math.max(width * 0.04, 24), 32),
    fontWeight: "500",
  },
  subHeaderText: {
    fontSize: Math.min(Math.max(width * 0.02, 16), 20),
    textAlign: "center",
  },
  loginHelper: {
    width: "100%",
    flexDirection: "row",
    justifyContent: "space-between",
  },
  checkBox: {
    flexDirection: "row",
    alignItems: "center",
    marginRight: 2,
    marginBottom: 30,
  },
  forgotPassLink: {
    alignItems: "center",
    marginBottom: 30,
  },
  button: {
    alignItems: "center",
    justifyContent: "center",
    width: "100%",
    height: 50,
    maxHeight: 40,
    backgroundColor: "#244D3B",
    borderRadius: 10,
  },
  buttonText: {
    textAlign: "center",
    color: "#fff",
    fontSize: 16,
    fontWeight: "500",
  },
  error: {
    alignSelf: "flex-start",
    marginBottom: 10,
    color: "red",
  },
  drawerContent: {
    flex: 1,
  },
  userInfoSection: {
    paddingLeft: 5,
  },
  title: {
    fontSize: 16,
    marginTop: 3,
    fontWeight: "bold",
  },
  caption: {
    fontSize: 13,
    lineHeight: 14,
    color: "#6e6e6e",
  },
  drawerSection: {
    marginTop: 15,
    borderBottomWidth: 1,
    borderBottomColor: "#dedede",
  },
  bottomDrawerSection: {
    marginBottom: 15,
    borderTopWidth: 1,
    borderTopColor: "#dedede",
  },
  profileCard: {
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#ffffff",
    borderRadius: 10,
    width: "90%",
    height: "80%",
    margin: "auto",
  },
  label: {
    fontSize: 12,
    marginBottom: 4,
    color: "#333",
  },
  /* ===== ADD USER PANEL ===== */
  addUserOverlay: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: "rgba(0,0,0,0.6)",
    justifyContent: "center",
    alignItems: "center",
    zIndex: 1000,
  },

  addUserCard: {
    width: "85%",
    maxWidth: 900,
    backgroundColor: "#fff",
    borderRadius: 16,
    padding: 20,
  },

  addUserTitle: {
    fontSize: 18,
    fontWeight: "700",
    marginBottom: 16,
  },

  addUserContent: {
    flexDirection: "row",
  },

  imageBox: {
    width: 120,
    height: 120,
    backgroundColor: "#EEE",
    borderRadius: 12,
    justifyContent: "center",
    alignItems: "center",
    marginTop: 6,
  },

  plus: {
    fontSize: 36,
    color: "#AAA",
  },

  form: {
    flex: 1,
    marginLeft: 20,
  },

  formRow: {
    marginBottom: 10,
  },

  label: {
    fontSize: 12,
    marginBottom: 4,
    color: "#333",
  },

  input: {
    backgroundColor: "#F1F1F1",
    height: 36,
    borderRadius: 8,
    paddingHorizontal: 10,
  },

  buttonRow: {
    flexDirection: "row",
    justifyContent: "flex-end",
    marginTop: 16,
  },

  saveBtn: {
    backgroundColor: "#26866F",
    paddingHorizontal: 22,
    paddingVertical: 10,
    borderRadius: 8,
    marginRight: 10,
  },

  cancelBtn: {
    backgroundColor: "#26866F",
    paddingHorizontal: 22,
    paddingVertical: 10,
    borderRadius: 8,
  },

  btnText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "600",
  },

  /* ===== SEARCH + ADD BUTTON ===== */
  searchRow: {
    flexDirection: "row",
    justifyContent: "flex-end",
    alignItems: "center",
    marginBottom: 8,
    width: 650,
  },
  searchInput: {
    flex: 1,
    width: 200,
    backgroundColor: "#f7f6f6",
    borderColor: "#CCCCCC",
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 12,
    height: 38,
    marginRight: 10,
    marginBottom: 4,
  },
  addButton: {
    backgroundColor: "#26866F",
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 8,
  },
  addButtonText: {
    color: "#fff",
    fontWeight: "600",
    fontSize: 12,
  },
  tableCell: { color: "#181717" },
  tableHeader: { backgroundColor: "#26866F", borderRadius: 4 },
  tableHeaderText: { color: "#FFFFFF" },
  statusActive: {
    backgroundColor: "#d4edda",
    borderColor: "#28a745",
    borderWidth: 1,
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  statusInactive: {
    backgroundColor: "#d1ecf1",
    borderColor: "#17a2b8",
    borderWidth: 1,
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  statusDeactivated: {
    backgroundColor: "#f8d7da",
    borderColor: "#dc3545",
    borderWidth: 1,
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  /* ROLE DROPDOWN */
  picker: {
    backgroundColor: "#F1F1F1",
    height: 36,
    borderRadius: 8,
    marginTop: 4,
  },
  pickerItem: {
    fontSize: 14,
  },
  /* ===== ALERT COMPONENT STYLES ===== */
  alertOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.4)",
    justifyContent: "center",
    alignItems: "center",
    zIndex: 2000,
  },
  alertContainer: {
    backgroundColor: "#fff",
    padding: 20,
    borderRadius: 8,
    minWidth: 300,
    maxWidth: 400,
  },
  alertTitle: {
    fontSize: 18,
    fontWeight: "bold",
    marginBottom: 10,
    textAlign: "left",
  },
  alertMessage: {
    fontSize: 14,
    textAlign: "center",
    marginBottom: 20,
  },
  alertButtonRow: {
    flexDirection: "row",
    justifyContent: "center",
    gap: 12,
    marginTop: 10,
  },
  alertConfirmBtn: {
    backgroundColor: "#26866F",
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 6,
    minWidth: 80,
    alignItems: "center",
  },
  alertCancelBtn: {
    backgroundColor: "#6c757d",
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 6,
    minWidth: 80,
    alignItems: "center",
  },
  alertConfirmBtnText: {
    color: "#fff",
    fontWeight: "600",
    fontSize: 14,
  },
  alertCancelBtnText: {
    color: "#fff",
    fontWeight: "600",
    fontSize: 14,
  },
  /* ===== FILTER STYLES ===== */
  filterContainer: {
    backgroundColor: "#EDEDED",
    borderColor: "#CCCCCC",
    borderWidth: 1,
    borderRadius: 8,
    marginRight: 10,
    marginBottom: 4,
    height: 38,
    justifyContent: "center",
    minWidth: 120, // Minimum width for filter dropdowns
  },
  filterPicker: {
    width: 120, // Slightly narrower to fit two filters
    height: 38,
    fontSize: 12,
  },
  addButton: {
    backgroundColor: "#26866F",
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 8,
    marginBottom: 4,
  },
  addButtonText: {
    color: "#fff",
    fontWeight: "600",
    fontSize: 12,
  },
  /* ===== USER COUNT STYLES ===== */
  userCountContainer: {
    marginBottom: 12,
    paddingHorizontal: 4,
  },
  userCountText: {
    fontSize: 12,
    color: "#666",
    fontStyle: "italic",
  },
});
