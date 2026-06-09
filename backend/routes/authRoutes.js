// routes/authRoutes.js
const express = require("express");
const router = express.Router();

const { registerUser, loginUser, getUserProfile } = require("../controllers/authController");
const { protect } = require("../middleware/authMiddleware");

// @route   POST /api/auth/register  — Register new user
router.post("/register", registerUser);

// @route   POST /api/auth/login     — Login user, get token
router.post("/login", loginUser);

// @route   GET  /api/auth/profile   — Get logged-in user profile (protected)
router.get("/profile", protect, getUserProfile);

module.exports = router;