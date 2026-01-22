import { StyleSheet } from "react-native";

export const styles = StyleSheet.create({
  formCard: {
    margin: "auto",
    display: "flex",
    width: "90%",
    backgroundColor: "#fff",
    alignItems: "center",
    justifyContent: "center",
    padding: 20,
    borderRadius: 15,
  },
  formContainer: {
    alignItems: "center",
    maxWidth: "90%",
    width: "100%",
  },
  formInput: {
    height: 50,
    width: "100%",
    border: "1px solid #e4e4e4",
    borderRadius: 15,
    marginTop: 10,
    marginBottom: 10,
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
    margin: 8,
  },
  button: {
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    width: "100%",
    height: 50,

    backgroundColor: "#244D3B",
    borderRadius: 15,
  },
  buttonText: {
    textAlign: "center",
    color: "#fff",
    fontSize: 16,
    fontWeight: 500,
  },
});
