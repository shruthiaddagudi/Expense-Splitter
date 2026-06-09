// routes/expenseRoutes.js
const express = require("express");
const router = express.Router();

const {
  createExpense,
  getExpenses,
  getExpenseById,
  updateExpense,
  deleteExpense,
} = require("../controllers/expenseController");

const { protect } = require("../middleware/authMiddleware");

// All expense routes are protected — user must be logged in
router.use(protect);

// @route   POST   /api/expenses        — Create an expense
// @route   GET    /api/expenses        — Get all expenses (optional ?groupId=<id>)
router.route("/").post(createExpense).get(getExpenses);

// @route   GET    /api/expenses/:id    — Get single expense
// @route   PUT    /api/expenses/:id    — Update expense (payer only)
// @route   DELETE /api/expenses/:id    — Delete expense (payer only)
router.route("/:id").get(getExpenseById).put(updateExpense).delete(deleteExpense);

module.exports = router;