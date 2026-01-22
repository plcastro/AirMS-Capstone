import { StyleSheet } from "react-native";

export const styles = StyleSheet.create({
  formCard: {
    margin: "auto",
    display: "flex",
    maxWidth: "90%",
    maxHeight: "70%",
    width: 800,
    height: 500,
    backgroundColor: "#fff",
    alignItems: "center",
    justifyContent: "center",
    padding: 15,
    borderRadius: 15,
    boxShadow: "0 4px 8px rgba(0, 0, 0, 0.1)",
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
    border: "1px solid #e4e4e4",
    borderRadius: 10,
    marginTop: 10,
    marginBottom: 10,
    padding: 10,
  },
  headerText: {
    fontSize: 32,
    fontWeight: 500,
  },
  subHeaderText: {
    fontSize: 24,
    textAlign: "center",
  },
  loginHelper: {
    width: "100%",
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  checkBox: {
    flexDirection: "row",
    alignItems: "center",
    margin: 7,
    gap: 5,
  },
  button: {
    display: "flex",
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
    fontWeight: 500,
  },
});
