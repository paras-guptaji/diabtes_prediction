require("dotenv").config();
const express = require("express");
const cors = require("cors");
const authRoutes = require("./routes/authRoutes");

const app = express();

app.use(
  cors({
    origin(origin, callback) {
      const allowedOrigins = [
        process.env.CLIENT_URL || "http://localhost:5173",
        "http://127.0.0.1:5173",
        "http://localhost:5173",
      ];

      // Allow browserless tools and same-machine local app origins.
      if (!origin || allowedOrigins.includes(origin)) {
        return callback(null, true);
      }

      return callback(new Error("CORS blocked for this origin."));
    },
  })
);

// Parse incoming JSON bodies from the React frontend.
app.use(express.json());

app.get("/", (_request, response) => {
  response.json({
    message: "Diabetes Type-2 Detection & Prevention auth server is running.",
  });
});

app.use("/api/auth", authRoutes);

// Centralized error handler keeps API responses consistent.
app.use((error, _request, response, _next) => {
  console.error(error);
  response.status(error.statusCode || 500).json({
    message: error.message || "Internal server error.",
  });
});

module.exports = app;
