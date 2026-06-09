const express = require("express");
const dotenv = require("dotenv");
const cors = require("cors");

// Load environment variables from .env file
dotenv.config();

const app = express();
const connectDB = require("./config/db");

// ── Import Routes ──────────────────────────────────────
const authRoutes       = require("./routes/authRoutes");
const groupRoutes      = require("./routes/groupRoutes");
const expenseRoutes    = require("./routes/expenseRoutes");
const dashboardRoutes  = require("./routes/dashboardRoutes");
const settlementRoutes = require("./routes/settlementRoutes");

// ── Connect to MongoDB ─────────────────────────────────
connectDB();

// ── Global Middleware ──────────────────────────────────
// Allow requests from the browser including file:// (origin = null) for local dev
app.use(cors({
    origin: (origin, callback) => callback(null, true), // allow all origins incl. null (file://)
    methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"],
    credentials: true,
}));
app.use(express.json());            // Parse incoming JSON request bodies
app.use(express.urlencoded({ extended: true })); // Parse URL-encoded bodies

// ── API Routes ─────────────────────────────────────────
app.use("/api/auth",        authRoutes);        // POST /api/auth/register  /login  GET /api/auth/profile
app.use("/api/groups",      groupRoutes);       // CRUD /api/groups
app.use("/api/expenses",    expenseRoutes);     // CRUD /api/expenses
app.use("/api/dashboard",   dashboardRoutes);   // GET  /api/dashboard
app.use("/api/settlements", settlementRoutes);  // GET  /api/settlements/:groupId

// ── Health Check Route ─────────────────────────────────
app.get("/", (req, res) => {
    res.json({
        success: true,
        message: "Expense Splitter API is running 🚀",
        version: "1.0.0",
        endpoints: {
            auth:        "/api/auth",
            groups:      "/api/groups",
            expenses:    "/api/expenses",
            dashboard:   "/api/dashboard",
            settlements: "/api/settlements/:groupId",
        },
    });
});

// ── 404 Handler — Unmatched routes ────────────────────
app.use((req, res) => {
    res.status(404).json({ success: false, message: `Route ${req.originalUrl} not found.` });
});

// ── Global Error Handler ───────────────────────────────
app.use((err, req, res, next) => {
    console.error("Unhandled Error:", err.stack);
    res.status(err.status || 500).json({
        success: false,
        message: err.message || "Internal Server Error",
    });
});

// ── Start Server ───────────────────────────────────────
const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
    console.log(`✅ Server running on http://localhost:${PORT}`);
    console.log(`📦 Environment: ${process.env.NODE_ENV || "development"}`);
});