import express from "express";
import "dotenv/config";
import cors from "cors";
import morgan from "morgan";

//import authRoutes from "./routes/auth";
//import userRoutes from "./routes/user";
//import workOrderRoutes from "./routes/workorders";
//import turnRoutes from "./routes/turns";
//import vendorRoutes from "./routes/vendors";
import apartmentRoutes from "./routes/apartments";   // ⭐ ADD THIS LINE
import makeReadyBoardRoutes from "./routes/makeReadyBoard";

const app = express();

app.use(express.json());
app.use(cors());
app.use(morgan("dev"));

// ----------------------
// ⭐ MOUNT YOUR ROUTERS
// ----------------------

// Auth
//app.use("/api/auth", authRoutes);

// Users
//app.use("/api/users", userRoutes);

// Work Orders
//app.use("/api/workorders", workOrderRoutes);

// Turns
//app.use("/api/turns", turnRoutes);

// Vendors
//app.use("/api/vendors", vendorRoutes);

// ⭐ NEW APARTMENT DETAIL ROUTE
app.use("/api/apartments", apartmentRoutes);
app.use("/api/make-ready-board", makeReadyBoardRoutes);

// Health check
app.get("/", (req, res) => {
  res.send("Property Flow Backend Running");
});

const PORT = process.env.PORT || 3001;

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
