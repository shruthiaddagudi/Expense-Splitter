// routes/settlementRoutes.js
const express = require("express");
const router = express.Router();

const { getSettlements } = require("../controllers/settlementController");
const { protect } = require("../middleware/authMiddleware");

// @route   GET /api/settlements/:groupId   — Get settlement balances for a group (protected)
router.get("/:groupId", protect, getSettlements);

module.exports = router;
