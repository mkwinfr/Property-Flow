"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
require("dotenv/config");
const cors_1 = __importDefault(require("cors"));
const morgan_1 = __importDefault(require("morgan"));
const auth_1 = __importDefault(require("./routes/auth"));
const users_1 = __importDefault(require("./routes/admin/users"));
const departments_1 = __importDefault(require("./routes/admin/departments"));
const roles_1 = __importDefault(require("./routes/admin/roles"));
const permissions_1 = __importDefault(require("./routes/admin/permissions"));
//import workOrderRoutes from "./routes/workorders";
//import vendorRoutes from "./routes/vendors";
const apartments_1 = __importDefault(require("./routes/apartments"));
const makeReadyBoard_1 = __importDefault(require("./routes/makeReadyBoard"));
const turns_1 = __importDefault(require("./routes/turns"));
const turnWorkflow_1 = __importDefault(require("./routes/turnWorkflow"));
const buildings_1 = __importDefault(require("./routes/buildings"));
const properties_1 = __importDefault(require("./routes/properties"));
const app = (0, express_1.default)();
app.use(express_1.default.json());
// CORS configuration for production and development
const corsOptions = {
    origin: [
        'http://localhost:5173', // Local Tech app
        'http://localhost:5174', // Local Desktop app
        'https://tech.propertysuite.net', // Production Tech app
        'https://desktop.propertysuite.net', // Production Desktop app (if exists)
        'https://app.propertysuite.net', // Any other production domains
    ],
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
};
// Apply CORS middleware
app.use((0, cors_1.default)(corsOptions));
app.use((0, morgan_1.default)("dev"));
// ----------------------
// ƒ-? MOUNT YOUR ROUTERS
// ----------------------
// Auth
app.use("/api/auth", auth_1.default);
// Admin Routes
app.use("/api/admin/users", users_1.default);
app.use("/api/admin/departments", departments_1.default);
app.use("/api/admin/roles", roles_1.default);
app.use("/api/admin/permissions", permissions_1.default);
// Work Orders
//app.use("/api/workorders", workOrderRoutes);
// ƒ-? NEW APARTMENT DETAIL ROUTE
app.use("/api/apartments", apartments_1.default);
app.use("/api/buildings", buildings_1.default);
app.use("/api/properties", properties_1.default);
app.use("/api/make-ready-board", makeReadyBoard_1.default);
// Turns (make-ready, tasks, etc.)
app.use("/api", turns_1.default);
app.use("/api", turnWorkflow_1.default);
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
//# sourceMappingURL=index.js.map