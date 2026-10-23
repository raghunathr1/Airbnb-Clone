
const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");
const dotenv = require("dotenv");
const dns = require("dns");

// ==========================================
// ENVIRONMENT CONFIGURATION
// ==========================================

dotenv.config();

// DNS configuration for MongoDB connection.
dns.setServers(["8.8.8.8", "8.8.4.4"]);

const app = express();

// ==========================================
// CORS CONFIGURATION
// ==========================================

const corsOptions = {
  origin: [
    "http://localhost:5173",
    "http://127.0.0.1:5173",
  ],

  methods: [
    "GET",
    "HEAD",
    "POST",
    "PUT",
    "PATCH",
    "DELETE",
    "OPTIONS",
  ],

  allowedHeaders: [
    "Content-Type",
    "Authorization",
  ],

  optionsSuccessStatus: 204,
  maxAge: 86400,
};

// Apply CORS before API routes and other middleware.
app.use(cors(corsOptions));

// Explicitly handle CORS preflight requests.
// The regular CORS middleware above also covers these.
app.options(/.*/, cors(corsOptions));

// ==========================================
// GENERAL MIDDLEWARE
// ==========================================

app.use(express.json({ limit: "1mb" }));

// ==========================================
// IMPORT ROUTES
// ==========================================

const listingRoutes = require("./routes/listingRoutes");
const bookingRoutes = require("./routes/bookingRoutes");
const reviewRoutes = require("./routes/reviewRoutes");
const authRoutes = require("./routes/authRoutes");

// ==========================================
// API ROUTES
// ==========================================

app.use("/api/listings", listingRoutes);
app.use("/api/bookings", bookingRoutes);
app.use("/api/reviews", reviewRoutes);
app.use("/api/auth", authRoutes);

// ==========================================
// ROOT ROUTE
// ==========================================

app.get("/", (req, res) => {
  return res.status(200).json({
    success: true,
    message: "Airbnb Clone API is running!",
  });
});

// ==========================================
// HANDLE UNKNOWN ROUTES
// ==========================================

app.use((req, res) => {
  return res.status(404).json({
    success: false,
    message: "API route not found",
  });
});

// ==========================================
// GLOBAL ERROR HANDLER
// ==========================================

app.use((err, req, res, next) => {
  console.error("Server error:", err);

  if (res.headersSent) {
    return next(err);
  }

  const statusCode = err.status || 500;

  return res.status(statusCode).json({
    success: false,
    message:
      statusCode < 500
        ? err.message
        : "Internal server error",
  });
});

// ==========================================
// CONNECT MONGODB AND START SERVER
// ==========================================

const PORT = process.env.PORT || 5000;

const startServer = async () => {
  try {
    if (!process.env.MONGO_URI) {
      throw new Error(
        "MONGO_URI is missing from the backend .env file"
      );
    }

    if (!process.env.JWT_SECRET) {
      throw new Error(
        "JWT_SECRET is missing from the backend .env file"
      );
    }

    await mongoose.connect(process.env.MONGO_URI);

    console.log("MongoDB connected successfully!");

    app.listen(PORT, () => {
      console.log(
        `Server running at http://localhost:${PORT}`
      );

      console.log(
        "CORS enabled for localhost:5173 and 127.0.0.1:5173"
      );
    });
  } catch (error) {
    console.error(
      "Failed to start server:",
      error.message
    );

    process.exit(1);
  }
};

startServer();
