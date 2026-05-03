import { Dimensions, StyleSheet } from "react-native";
import { COLORS } from "./colors";
const { width } = Dimensions.get("window");
const BODY_FONT_SIZE = 12;
const SUBHEADER_FONT_SIZE = 14;
const HEADER_FONT_SIZE = 18;
export const styles = StyleSheet.create({
  // PIN INPUT STYLE
  codeInputSection: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    marginVertical: 30,
  },
  hiddenTextInput: { position: "absolute", width: 1, height: 1, opacity: 0 },
  codeInputContainer: {
    flexDirection: "row",
    justifyContent: "space-between",
    gap: 10,
  },
  codeInput: {
    borderColor: COLORS.border,
    minWidth: "14%",
    maxWidth: "16%",
    width: "14%",
    height: 50,
    borderWidth: 1,
    borderRadius: 5,
    padding: 12,
  },
  codeInputText: {
    fontSize: BODY_FONT_SIZE,
    textAlign: "center",
    color: COLORS.black,
    fontFamily: "Arial",
  },
  codeInputFocused: {
    borderColor: COLORS.primaryLight,
    minWidth: "14%",
    maxWidth: "16%",
    width: "14%",
    height: 50,
    borderWidth: 2,
    borderRadius: 5,
    padding: 12,
  },
  //Screens
  container: {
    flex: 1,
    paddingHorizontal: 7,
    paddingVertical: 7,
  },
  // Login, Reset, Forgot password, Security Setup Screen Styles
  formCard: {
    marginHorizontal: "auto",
    marginVertical: "auto",
    maxWidth: "90%",
    maxHeight: "70%",
    width: 800,
    height: 500,
    backgroundColor: COLORS.white,
    alignItems: "center",
    justifyContent: "center",
    padding: 15,
    borderRadius: 15,
    elevation: 4, // Android
    shadowColor: COLORS.black, // iOS
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
    borderColor: COLORS.grayLight,
    borderRadius: 10,
    marginTop: 10,
    marginBottom: 10,
    padding: 10,
  },
  headerText: {
    fontSize: HEADER_FONT_SIZE,
    fontWeight: "500",
    textAlign: "center",
  },
  subHeaderText: {
    fontSize: SUBHEADER_FONT_SIZE,
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
    marginBottom: 10,
  },
  forgotPassLink: {
    alignItems: "center",
  },
  primaryBtn: {
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 12,
    width: "100%",
    height: 50,
    maxHeight: 40,
    backgroundColor: COLORS.primary,
    borderRadius: 10,
  },
  primaryBtnTxt: {
    textAlign: "center",
    color: COLORS.white,
    fontSize: BODY_FONT_SIZE,
    fontWeight: "500",
  },
  secondaryBtn: {
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 12,
    height: 50,
    maxHeight: 40,
    borderWidth: 1,
    borderColor: COLORS.grayMedium,
    backgroundColor: COLORS.white,
    borderRadius: 10,
  },
  secondaryBtnTxt: {
    textAlign: "center",
    color: COLORS.primaryLight,
    fontSize: BODY_FONT_SIZE,
    fontWeight: "500",
  },
  primaryAlertBtn: {
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 12,
    height: 50,
    maxHeight: 40,
    backgroundColor: COLORS.primaryLight,
    borderRadius: 10,
  },
  secondaryAlertBtn: {
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 12,
    height: 50,
    maxHeight: 40,
    borderColor: COLORS.grayMedium,
    backgroundColor: COLORS.grayLight,
    backgroundColor: COLORS.grayLight,
    borderRadius: 10,
  },
  secondaryAlertBtnTxt: {
    textAlign: "center",
    color: COLORS.primaryLight,
    fontSize: BODY_FONT_SIZE,
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
    fontSize: HEADER_FONT_SIZE,
    marginTop: 3,
    fontWeight: "bold",
  },
  caption: {
    fontSize: BODY_FONT_SIZE,
    lineHeight: 14,
    color: COLORS.grayDark,
  },
  drawerSection: {
    marginTop: 15,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.grayMedium,
  },
  bottomDrawerSection: {
    marginBottom: 15,
    borderTopWidth: 1,
    borderTopColor: COLORS.grayMedium,
  },
  profileCard: {
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: COLORS.white,
    borderRadius: 10,
    width: 700,
    maxWidth: "90%",
    height: 600,
    margin: "auto",
  },
  profileContent: { alignItems: "center", width: "100%" },
  label: {
    fontSize: BODY_FONT_SIZE,
    marginBottom: 4,
    color: COLORS.grayDark,
  },
  /* ===== ADD USER PANEL ===== */
  addUserOverlay: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: COLORS.overlayDark,
    justifyContent: "center",
    alignItems: "center",
    zIndex: 1000,
  },

  addUserCard: {
    width: "85%",
    maxWidth: 900,
    backgroundColor: COLORS.white,
    borderRadius: 16,
    padding: 20,
  },

  addUserTitle: {
    fontSize: 12,
    fontWeight: "700",
    marginBottom: 16,
  },

  addUserContent: {
    flexDirection: "row",
  },

  imageBox: {
    width: 120,
    height: 120,
    backgroundColor: COLORS.grayLight,
    borderRadius: 12,
    justifyContent: "center",
    alignItems: "center",
    marginTop: 6,
  },

  plus: {
    fontSize: 12,
    color: COLORS.grayDark,
  },

  form: {
    flex: 1,
    marginLeft: 20,
  },

  formRow: {
    marginBottom: 10,
  },

  label: {
    fontSize: BODY_FONT_SIZE,
    marginBottom: 4,
    color: COLORS.grayDark,
  },

  input: {
    backgroundColor: COLORS.grayLight,
    height: 36,
    borderRadius: 8,
    paddingHorizontal: 10,
  },

  buttonRow: {
    flexDirection: "row",
    justifyContent: "flex-end",
    marginTop: 16,
  },

  /* ===== SEARCH + ADD BUTTON ===== */
  searchRow: {
    flexDirection: "row",
    justifyContent: "flex-start",
    alignItems: "center",
    marginBottom: 8,
    width: "100%",
    flexWrap: "wrap",
  },
  searchInput: {
    width: 300,
    minWidth: width < 768 ? "100%" : 300,
    backgroundColor: COLORS.white,
    borderColor: COLORS.grayMedium,
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 12,
    height: 38,
    marginRight: 10,
    marginBottom: 4,
  },
  unifiedControlRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    marginBottom: 12,
  },
  unifiedSearchBox: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: COLORS.white,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: COLORS.grayMedium,
    height: 48,
    paddingHorizontal: 12,
  },
  unifiedSearchInput: {
    flex: 1,
    marginLeft: 10,
    fontSize: BODY_FONT_SIZE,
    color: COLORS.black,
    padding: 0,
  },
  unifiedActionButton: {
    backgroundColor: COLORS.primaryLight,
    borderRadius: 10,
    height: 48,
    paddingHorizontal: 16,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
  },
  unifiedActionButtonText: {
    color: COLORS.white,
    fontSize: BODY_FONT_SIZE,
    fontWeight: "600",
    marginLeft: 6,
  },
  unifiedFilterButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: COLORS.white,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: COLORS.grayMedium,
    height: 48,
    paddingHorizontal: 12,
  },
  unifiedFilterButtonText: {
    fontSize: BODY_FONT_SIZE,
    color: COLORS.black,
  },
  unifiedDropdownMenu: {
    position: "absolute",
    top: 52,
    left: 0,
    right: 0,
    backgroundColor: COLORS.white,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: COLORS.grayMedium,
    zIndex: 1000,
    elevation: 5,
  },
  unifiedDropdownItem: {
    paddingVertical: 12,
    paddingHorizontal: 14,
  },
  unifiedDropdownItemText: {
    fontSize: BODY_FONT_SIZE,
    color: COLORS.black,
  },
  tableCell: { color: COLORS.black },
  tableHeader: { backgroundColor: COLORS.primaryLight, borderRadius: 4 },
  tableHeaderText: { color: COLORS.white },
  statusActive: {
    backgroundColor: COLORS.successBg,
    borderColor: COLORS.successBorder,
    borderWidth: 1,
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  statusInactive: {
    backgroundColor: COLORS.infoBg,
    borderColor: COLORS.infoBorder,
    borderWidth: 1,
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  statusDeactivated: {
    backgroundColor: COLORS.dangerBg,
    borderColor: COLORS.dangerBorder,
    borderWidth: 1,
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  /* ROLE DROPDOWN */
  picker: {
    backgroundColor: COLORS.grayLight,
    height: 36,
    borderRadius: 8,
    marginTop: 4,
  },
  pickerItem: {
    fontSize: BODY_FONT_SIZE,
  },
  /* ===== ALERT COMPONENT STYLES ===== */
  alertOverlay: {
    flex: 1,
    backgroundColor: COLORS.overlayDark,
    justifyContent: "center",
    alignItems: "center",
    zIndex: 1000,
  },
  alertContainer: {
    backgroundColor: COLORS.white,
    padding: 20,
    borderRadius: 8,
    minWidth: 300,
    maxWidth: 500,
  },
  alertTitle: {
    fontSize: SUBHEADER_FONT_SIZE,
    fontWeight: "bold",
    marginBottom: 10,
    textAlign: "center",
  },
  alertMessage: {
    fontSize: BODY_FONT_SIZE,
    textAlign: "center",
    marginBottom: 20,
  },
  alertButtonRow: {
    flexDirection: "row",
    justifyContent: "center",
    gap: 12,
    marginTop: 10,
  },

  /* ===== FILTER STYLES ===== */
  filterContainer: {
    backgroundColor: COLORS.grayLight,
    borderColor: COLORS.grayMedium,
    borderWidth: 1,
    borderRadius: 8,
    marginRight: 10,
    marginBottom: 4,
    height: 38,
    justifyContent: "center",
    minWidth: 120, // Minimum width for filter dropdowns
    width: "100%",
  },
  filterPicker: {
    width: 120, // Slightly narrower to fit two filters
    height: 38,
    fontSize: BODY_FONT_SIZE,
  },
  /* ===== USER COUNT STYLES ===== */
  userCountContainer: {
    marginBottom: 12,
    paddingHorizontal: 4,
  },
  userCountText: {
    fontSize: BODY_FONT_SIZE,
    color: COLORS.grayDark,
    fontStyle: "italic",
  },
  /* ===== MAINTENANCE LOG STYLES ===== */
  maintenanceTableContainer: {
    flex: 1,
    padding: 16,
    backgroundColor: COLORS.white,
  },

  maintenanceSearchRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 12,
    gap: 10,
    flexWrap: "wrap",
  },

  maintenanceFilter: {
    backgroundColor: COLORS.grayLight,
    borderColor: COLORS.grayMedium,
    borderWidth: 1,
    borderRadius: 8,
    height: 38,
    justifyContent: "center",
    minWidth: 120,
  },
  maintenanceFilterPicker: {
    width: 120,
    height: 38,
    fontSize: BODY_FONT_SIZE,
  },
  maintenanceAircraftFilter: {
    backgroundColor: COLORS.grayLight,
    borderColor: COLORS.grayMedium,
    borderWidth: 1,
    borderRadius: 8,
    height: 38,
    justifyContent: "center",
    minWidth: 120,
  },
  maintenanceSearchDivider: {
    height: 1,
    backgroundColor: COLORS.grayMedium,
    marginBottom: 12,
  },
  maintenanceHistoryHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 12,
    paddingTop: 8,
  },
  maintenanceHistoryTitleWithBg: {
    backgroundColor: COLORS.primaryLight,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 4,
  },
  maintenanceHistoryTitle: {
    fontSize: SUBHEADER_FONT_SIZE,
    fontWeight: "600",
    color: "white",
  },

  maintenanceStatusUnverified: {
    backgroundColor: COLORS.dangerBg,
    borderColor: COLORS.dangerBorder,
    borderWidth: 1,
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 4,
    alignItems: "center",
  },
  maintenanceStatusVerified: {
    backgroundColor: COLORS.successBg,
    borderColor: COLORS.successBorder,
    borderWidth: 1,
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 4,
    alignItems: "center",
  },
  maintenanceTableCell: {
    color: COLORS.black,
    fontSize: BODY_FONT_SIZE,
  },
  maintenanceTableHeader: {
    backgroundColor: COLORS.primaryLight,
    borderRadius: 4,
  },
  maintenanceTableHeaderText: {
    color: COLORS.white,
    fontWeight: "600",
    textAlign: "center",
  },
  maintenanceLogCount: {
    marginBottom: 12,
    paddingHorizontal: 4,
  },
  maintenanceLogCountText: {
    fontSize: BODY_FONT_SIZE,
    color: COLORS.grayDark,
    fontStyle: "italic",
  },
  /* ===== NEW ENTRY MODAL STYLES ===== */
  newEntryOverlay: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: COLORS.overlayDark,
    justifyContent: "center",
    alignItems: "center",
    zIndex: 1000,
  },
  newEntryCard: {
    width: "85%",
    backgroundColor: COLORS.white,
    borderRadius: 16,
    padding: 20,
  },
  newEntryTitle: {
    fontSize: SUBHEADER_FONT_SIZE,
    fontWeight: "700",
    marginBottom: 16,
    color: COLORS.primaryLight,
  },
  newEntryField: {
    marginBottom: 16,
  },
  newEntryLabel: {
    fontSize: BODY_FONT_SIZE,
    marginBottom: 4,
    color: COLORS.grayDark,
    fontWeight: "500",
  },
  newEntryInput: {
    backgroundColor: COLORS.grayLight,
    height: 36,
    borderRadius: 8,
    paddingHorizontal: 10,
    borderWidth: 1,
    borderColor: COLORS.grayMedium,
  },
  newEntryTextArea: {
    backgroundColor: COLORS.grayLight,
    height: 80,
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderWidth: 1,
    borderColor: COLORS.grayMedium,
    textAlignVertical: "top",
  },
  newEntryButtonRow: {
    flexDirection: "row",
    justifyContent: "flex-end",
    marginTop: 20,
    gap: 10,
  },

  /* ===== VERIFICATION ALERT STYLES ===== */
  verificationAlertContainer: {
    backgroundColor: COLORS.white,
    padding: 24,
    borderRadius: 12,
    alignItems: "center",
    minWidth: 400,
    maxWidth: 500,
    marginHorizontal: 20,
    elevation: 5,
    shadowColor: COLORS.black,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
  },
  verificationAlertTitle: {
    fontSize: SUBHEADER_FONT_SIZE,
    fontWeight: "700",
    marginBottom: 16,
    color: COLORS.primaryLight,
    textAlign: "center",
  },
  verificationAlertMessage: {
    fontSize: BODY_FONT_SIZE,
    textAlign: "center",
    marginBottom: 24,
    color: COLORS.grayDark,
    lineHeight: 22,
  },
  verificationField: {
    width: "100%",
    marginBottom: 20,
  },
  verificationLabel: {
    fontSize: SUBHEADER_FONT_SIZE,
    fontWeight: "600",
    marginBottom: 8,
    color: COLORS.grayDark,
  },
  verificationInput: {
    backgroundColor: COLORS.grayLight,
    borderWidth: 1,
    borderColor: COLORS.grayMedium,
    borderRadius: 8,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: BODY_FONT_SIZE,
    color: COLORS.grayDark,
  },
  verificationButtonRow: {
    flexDirection: "row",
    justifyContent: "center",
    gap: 16,
    marginTop: 8,
    width: "100%",
  },

  // FLIGHT LOG
  flightFormInput: {
    backgroundColor: COLORS.grayLight,
    height: 36,
    borderRadius: 8,
    paddingHorizontal: 10,
    borderWidth: 1,
    borderColor: COLORS.grayMedium,
    marginBottom: 5,
  },

  scrollContent: {
    flexGrow: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingVertical: 40,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: COLORS.overlayLight,
    justifyContent: "center",
    alignItems: "center",
  },

  newFlightEntryCard: {
    minWidth: "95%",
    maxWidth: 500,
    width: 500,
    backgroundColor: COLORS.white,
    borderRadius: 16,
    padding: 20,
    position: "relative",
  },
  /* ===== FLIGHT LOG APPROVAL STYLES ===== */

  flightTwoColumn: {
    flexDirection: "row",
    gap: 24,
    width: "100%",
  },

  flightColumn: {
    flex: 1,
  },

  flightSectionTitle: {
    fontSize: SUBHEADER_FONT_SIZE,
    fontWeight: "600",
    marginBottom: 8,
    marginTop: 16,
    color: COLORS.black,
  },

  mmelGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-between",
  },

  mmelItem: {
    width: "48%",
    marginBottom: 10,
  },

  signatureWrapper: {
    position: "relative",
  },

  clearSignatureBtn: {
    position: "absolute",
    right: 12,
    top: 12,
  },
  /* Top Row */
  topRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 15,
  },

  exportButton: {
    backgroundColor: COLORS.primaryLight,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 10,
    marginLeft: 10,
    elevation: 3,
  },

  exportText: {
    color: COLORS.white,
    fontWeight: "600",
    fontSize: BODY_FONT_SIZE,
  },

  /* Filters */
  filterContainer: {
    marginBottom: 20,
  },

  filterInput: {
    backgroundColor: COLORS.white,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: BODY_FONT_SIZE,
    marginBottom: 8,
    elevation: 1,
  },

  /* Cards */
  cardRow: {
    flexDirection: width < 768 ? "column" : "row",
    justifyContent: "space-between",
    marginBottom: 20,
  },

  card: {
    backgroundColor: COLORS.white,
    borderRadius: 14,
    padding: 16,
    width: width < 768 ? "100%" : "31%",
    marginBottom: width < 400 ? 12 : 0,
    elevation: 3,
  },

  cardTitle: {
    fontSize: SUBHEADER_FONT_SIZE,
    color: COLORS.grayMedium,
    marginBottom: 8,
  },

  cardValue: {
    fontSize: 12,
    fontWeight: "bold",
    color: COLORS.grayDark,
  },

  /* Performance Section */
  performanceContainer: {
    backgroundColor: COLORS.white,
    borderRadius: 14,
    padding: 16,
    marginBottom: 20,
    elevation: 3,
  },

  sectionTitle: {
    fontSize: SUBHEADER_FONT_SIZE,
    fontWeight: "600",
    marginBottom: 12,
  },

  chartPlaceholder: {
    height: 180,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: COLORS.grayLight,
    borderRadius: 12,
  },

  /* List */
  listItem: {
    backgroundColor: COLORS.white,
    padding: 15,
    borderRadius: 10,
    marginBottom: 10,
    elevation: 1,
  },

  listTitle: {
    fontSize: SUBHEADER_FONT_SIZE,
    fontWeight: "600",
  },

  listSub: {
    fontSize: BODY_FONT_SIZE,
    color: COLORS.grayDark,
    marginTop: 4,
  },

  // Task Assigment Styles
  taskTable: {
    flex: 1,
  },
  taskTableHeader: {
    backgroundColor: COLORS.primaryLight,
    height: 35,
    width: "100%",
    justifyContent: "center",
    paddingHorizontal: 20,
    borderTopEndRadius: 4,
    borderTopStartRadius: 4,
    marginTop: 10,
  },
  rowTaskContainer: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 10,
  },
  taskCard: {
    backgroundColor: COLORS.grayLight,
    maxWidth: 500,
    minWidth: "100%",
    height: "auto",
    borderBottomEndRadius: 4,
    borderBottomStartRadius: 4,
    borderWidth: 1,
    borderColor: COLORS.grayMedium,
    padding: 10,
    marginBottom: 10,
  },
  statusIndicator: {
    padding: 2,
    width: 100,
    height: 25,
    borderRadius: 4,
  },
  statusTxt: {
    textAlign: "center",
    color: COLORS.white,
    fontWeight: 500,
  },
  dangerBtn: {
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 12,
    width: "100%",
    height: 50,
    maxHeight: 40,
    backgroundColor: COLORS.dangerBorder,
    borderRadius: 10,
  },
  neutralBtn: {
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 12,
    width: "100%",
    height: 50,
    maxHeight: 40,
    backgroundColor: COLORS.infoBorder,
    borderRadius: 10,
  },
});
