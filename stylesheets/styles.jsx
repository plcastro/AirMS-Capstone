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
});
