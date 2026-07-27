import mongoose from "mongoose";
import dns from "dns";

// Force Node to use public DNS servers to resolve Atlas SRV records
dns.setServers(["8.8.8.8", "8.8.4.4"]);

const connectDB = async () => {
  try {
    const conn = await mongoose.connect(process.env.MONGO_URI);
    console.log(`MongoDB Connected: ${conn.connection.host}`);
  } catch (error) {
    console.error("DB error:", error.message);
    process.exit(1);
  }
};

export default connectDB;