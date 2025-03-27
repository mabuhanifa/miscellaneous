const mongoose = require("mongoose");
require('dotenv').config();
const mongo_uri = process.env.MONGO_URI;

const connectDB = async () => {
    try {
        await mongoose.connect(mongo_uri, {
        });
        console.log("MongoDB connected");
    } catch (err) {
        console.error("MongoDB connection error:", err);
    }
};

module.exports = connectDB;