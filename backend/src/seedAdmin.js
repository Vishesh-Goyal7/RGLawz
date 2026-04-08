require("dotenv").config();

const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");
const User = require("./models/User");

const seedAdmin = async () => {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log("MongoDB connected for admin seeding.");

    const email = "visheshvishu1@outlook.com";
    const existingAdmin = await User.findOne({ email });

    if (existingAdmin) {
      console.log("Admin already exists.");
      process.exit(0);
    }

    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash("Admin@123", salt);

    const adminUser = await User.create({
      name: "Super Admin",
      email,
      passwordHash,
      role: "admin",
      phone: "",
      isActive: true,
    });

    console.log("Admin seeded successfully:");
    console.log({
      id: adminUser._id,
      email: adminUser.email,
      password: "Admin@123",
    });

    process.exit(0);
  } catch (error) {
    console.error("Failed to seed admin:", error.message);
    process.exit(1);
  }
};

seedAdmin();
