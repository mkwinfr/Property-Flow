import express from "express";
import "dotenv/config";
import cors from "cors";
import morgan from "morgan";

import authRoutes from "./routes/auth";
import userRoutes from "./routes/admin/users";
import departmentRoutes from "./routes/admin/departments";
import roleRoutes from "./routes/admin/roles";
import permissionRoutes from "./routes/admin/permissions";
//import workOrderRoutes from "./routes/workorders";
//import vendorRoutes from "./routes/vendors";
import apartmentRoutes from "./routes/apartments";
import makeReadyBoardRoutes from "./routes/makeReadyBoard";
import turnRoutes from "./routes/turns";
import buildingRoutes from "./routes/buildings";
import propertyRoutes from "./routes/properties";

const app = express();

app.use(express.json());

// CORS configuration for production and development
const corsOptions = {
  origin: [
    'http://localhost:5173',           // Local Tech app
    'http://localhost:5174',           // Local Desktop app
    'https://tech.propertysuite.net',  // Production Tech app
    'https://desktop.propertysuite.net', // Production Desktop app (if exists)
    'https://app.propertysuite.net',   // Any other production domains
  ],
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
};

// Apply CORS middleware
app.use(cors(corsOptions));
app.use(morgan("dev"));

// ----------------------
// ƒ-? MOUNT YOUR ROUTERS
// ----------------------

// Auth
app.use("/api/auth", authRoutes);

// Admin Routes
app.use("/api/admin/users", userRoutes);
app.use("/api/admin/departments", departmentRoutes);
app.use("/api/admin/roles", roleRoutes);
app.use("/api/admin/permissions", permissionRoutes);

// Work Orders
//app.use("/api/workorders", workOrderRoutes);

// ƒ-? NEW APARTMENT DETAIL ROUTE
app.use("/api/apartments", apartmentRoutes);
app.use("/api/buildings", buildingRoutes);
app.use("/api/properties", propertyRoutes);
app.use("/api/make-ready-board", makeReadyBoardRoutes);

// Turns (make-ready, tasks, etc.)
app.use("/api", turnRoutes);

// Vendors
//app.use("/api/vendors", vendorRoutes);

// Health check
app.get("/", (_req, res) => {
  res.send("Property Flow Backend Running");
});

// Lightweight health endpoint for uptime checks
app.get("/health", (_req, res) => {
  res.json({ ok: true, service: "Property Flow Backend" });
});

const PORT = Number(process.env.PORT) || 4000;

app.listen(PORT, "0.0.0.0", () => {
  console.log(`Server running on http://0.0.0.0:${PORT}`);
});
