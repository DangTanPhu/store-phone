const mongoose = require('mongoose');
require('dotenv').config(); // Nạp biến môi trường từ file .env

const connectDB = async () => {
  try {
    const uri = process.env.MONGO_URI;
    if (!uri) {
      throw new Error("❌ MONGO_URI is not defined in .env file");
    }

    await mongoose.connect(uri); // Xóa các tùy chọn không cần thiết

    console.log("✅ MongoDB connected successfully!");
  } catch (err) {
    console.error("❌ MongoDB connection error:", err);
    process.exit(1);
  }
};

module.exports = connectDB;