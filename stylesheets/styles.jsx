import { Dimensions, StyleSheet } from "react-native";
const { width } = Dimensions.get("window");
export const styles = StyleSheet.create({
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
  /* ===== TABLE ===== */
  tableCard: {
    backgroundColor: "#fff",
    borderRadius: 12,
    marginTop: 8,
    overflow: "visible",
    flex: 0.8,
  },
  tableHeader: {
    flexDirection: "row",
    backgroundColor: "#26866F",
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderTopRightRadius: 12,
    borderTopLeftRadius: 12,
  },
  headerCell: {
    flex: 1,
    justifyContent: "center",
    alignItems: "flex-start", // Changed from 'center' to 'flex-start'
    marginRight: 8,
  },
  lastHeaderCell: {
    flex: 0.5, // Make the last column narrower
    marginRight: 0,
    alignItems: "flex-end", // Align dots to the right
  },
  tableHeaderText: {
    color: "#fff",
    fontWeight: "600",
    fontSize: 12,
    textAlign: "left", // Default to left
  },
  tableBody: {
    flex: 1,
    position: "relative",
    zIndex: 1,
  },
  tableRowContainer: {
    position: "relative",
    borderBottomWidth: 1,
    borderColor: "#EEE",
  },
  tableRow: {
    flexDirection: "row",
    paddingVertical: 12,
    paddingHorizontal: 16,
    alignItems: "center",
    backgroundColor: "#fff",
  },
  cell: {
    flex: 1,
    justifyContent: "center",
    alignItems: "flex-start", // Changed from 'center' to 'flex-start'
    marginRight: 8,
  },
  lastCell: {
    flex: 0.5, // Make the last column narrower
    marginRight: 0,
    alignItems: "flex-end", // Align dots to the right
  },
  tableCell: {
    fontSize: 12,
    color: "#333",
    textAlign: "left", // Default to left
    paddingVertical: 4,
  },
  dotsButton: {
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  dots: {
    fontSize: 18,
    fontWeight: "bold",
  },
});
