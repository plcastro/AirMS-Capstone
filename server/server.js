const express = require("express");
const cors = require("cors");
const mongoose = require("mongoose");
const userRoutes = require("../server/routes/userRoute");
const { watch } = require("./models/userModel");

const app = express();

app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

mongoose
  .connect("mongodb://localhost:27017/test")
  .then(() => console.log("Connected to MongoDB"));

app.use("/api/user", userRoutes);

app.get("/get-all-user", async (req, res) => {
  try {
    const data = await mongoose.model("User").find({});
    res.send({ status: "Ok", data: data });
  } catch (error) {
    res.status(500).json({ error: error });
  }
});
const PORT = process.env.PORT || 8000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
