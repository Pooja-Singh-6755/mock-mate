import express from "express";
import dotenv from "dotenv";
import cors from "cors";
import http from "http"; 
import connectDB from "./config/db.js";
import mongoose from "mongoose";

import interviewRoutes from "./routes/interviewRoutes.js"; 
import { initSocket } from "./config/socket.js"; 

// Load env variables
dotenv.config();

// Connect DB
connectDB();

const app = express();

// Middleware
app.use(cors());
app.use(express.json());

const testSchema = new mongoose.Schema({
  name: { type: String, required: true },
  email: { type: String, required: true },
  createdAt: { type: Date, default: Date.now },
});

const TestItem = mongoose.model("TestItem", testSchema);

app.post("/api/test", async (req, res) => {
  try {
    const { name, email } = req.body;

    if (!name || !email) {
      return res.status(400).json({ success: false, message: "Please provide both name and email" });
    }

    const newItem = await TestItem.create({ name, email });

    res.status(201).json({
      success: true,
      message: "Data successfully saved to database!",
      data: newItem,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Failed to save data",
      error: error.message,
    });
  }
});

app.use("/api/interview", interviewRoutes);

// Route
app.get("/", (req, res) => {
  res.send("API is running...");
});

const PORT = process.env.PORT || 5001;


const httpServer = http.createServer(app);
initSocket(httpServer);


httpServer.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});