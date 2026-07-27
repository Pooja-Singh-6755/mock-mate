<<<<<<< HEAD
//test
=======
import express from "express";
import dotenv from "dotenv";
import cors from "cors";
import connectDB from "./config/db";

// Load env variables
dotenv.config();

// Connect DB
connectDB();

const app = express();

// Middleware
app.use(cors());
app.use(express.json());

// Route
app.get("/", (req, res) => {
  res.send("API is running...");
});

const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
>>>>>>> 01113c70506f8270e5a61c8fe53e1ad683182b93
