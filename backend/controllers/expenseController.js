const mongoose = require("mongoose");
const Expense = require("../models/expense");
const Group = require("../models/Group");

// ─────────────────────────────────────────────
// @desc    Create a new expense in a group
// @route   POST /api/expenses
// @access  Private
// ─────────────────────────────────────────────
const createExpense = async (req, res) => {
  try {
    const { description, amount, groupId, paidBy, category } = req.body;

    // --- Validate required fields ---
    if (!description || !amount || !groupId) {
      return res.status(400).json({
        success: false,
        message: "description, amount, and groupId are required.",
      });
    }

    // --- Validate groupId format ---
    if (!mongoose.Types.ObjectId.isValid(groupId)) {
      return res.status(400).json({ success: false, message: "Invalid groupId." });
    }

    // --- Ensure the group exists ---
    const group = await Group.findById(groupId);
    if (!group) {
      return res.status(404).json({ success: false, message: "Group not found." });
    }

    // --- Ensure the requester is a group member ---
    const isMember = group.members.some(
      (m) => m.toString() === req.user._id.toString()
    );
    if (!isMember) {
      return res.status(403).json({ success: false, message: "You are not a member of this group." });
    }

    // paidBy defaults to the logged-in user if not supplied
    const payerId = paidBy || req.user._id;
    if (!mongoose.Types.ObjectId.isValid(payerId)) {
      return res.status(400).json({ success: false, message: "Invalid paidBy user ID." });
    }

    const expense = await Expense.create({
      description,
      amount,
      groupId,
      paidBy: payerId,
      category: category || "General",
    });

    // Populate references for a richer response
    const populated = await expense.populate([
      { path: "paidBy", select: "name email" },
      { path: "groupId", select: "groupName" },
    ]);

    res.status(201).json({
      success: true,
      message: "Expense created successfully.",
      expense: populated,
    });
  } catch (error) {
    if (error.name === "ValidationError") {
      const messages = Object.values(error.errors).map((e) => e.message);
      return res.status(400).json({ success: false, message: messages.join(", ") });
    }
    console.error("Create Expense Error:", error);
    res.status(500).json({ success: false, message: "Server error creating expense." });
  }
};

// ─────────────────────────────────────────────
// @desc    Get all expenses (optionally filter by groupId)
// @route   GET /api/expenses?groupId=<id>
// @access  Private
// ─────────────────────────────────────────────
const getExpenses = async (req, res) => {
  try {
    const filter = {};

    // Optional query filter: ?groupId=<id>
    if (req.query.groupId) {
      if (!mongoose.Types.ObjectId.isValid(req.query.groupId)) {
        return res.status(400).json({ success: false, message: "Invalid groupId query parameter." });
      }
      filter.groupId = req.query.groupId;
    }

    const expenses = await Expense.find(filter)
      .populate("paidBy", "name email")
      .populate("groupId", "groupName")
      .sort({ createdAt: -1 });

    res.status(200).json({
      success: true,
      count: expenses.length,
      expenses,
    });
  } catch (error) {
    console.error("Get Expenses Error:", error);
    res.status(500).json({ success: false, message: "Server error fetching expenses." });
  }
};

// ─────────────────────────────────────────────
// @desc    Get a single expense by ID
// @route   GET /api/expenses/:id
// @access  Private
// ─────────────────────────────────────────────
const getExpenseById = async (req, res) => {
  try {
    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
      return res.status(400).json({ success: false, message: "Invalid expense ID." });
    }

    const expense = await Expense.findById(req.params.id)
      .populate("paidBy", "name email")
      .populate("groupId", "groupName members");

    if (!expense) {
      return res.status(404).json({ success: false, message: "Expense not found." });
    }

    res.status(200).json({ success: true, expense });
  } catch (error) {
    console.error("Get Expense By ID Error:", error);
    res.status(500).json({ success: false, message: "Server error fetching expense." });
  }
};

// ─────────────────────────────────────────────
// @desc    Update an expense
// @route   PUT /api/expenses/:id
// @access  Private (creator only)
// ─────────────────────────────────────────────
const updateExpense = async (req, res) => {
  try {
    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
      return res.status(400).json({ success: false, message: "Invalid expense ID." });
    }

    const expense = await Expense.findById(req.params.id);

    if (!expense) {
      return res.status(404).json({ success: false, message: "Expense not found." });
    }

    // Only the user who paid (created) this expense can update it
    if (expense.paidBy.toString() !== req.user._id.toString()) {
      return res.status(403).json({ success: false, message: "Only the payer can update this expense." });
    }

    const { description, amount, category } = req.body;

    if (description) expense.description = description;
    if (amount) expense.amount = amount;
    if (category) expense.category = category;

    const updatedExpense = await expense.save();
    await updatedExpense.populate([
      { path: "paidBy", select: "name email" },
      { path: "groupId", select: "groupName" },
    ]);

    res.status(200).json({
      success: true,
      message: "Expense updated successfully.",
      expense: updatedExpense,
    });
  } catch (error) {
    if (error.name === "ValidationError") {
      const messages = Object.values(error.errors).map((e) => e.message);
      return res.status(400).json({ success: false, message: messages.join(", ") });
    }
    console.error("Update Expense Error:", error);
    res.status(500).json({ success: false, message: "Server error updating expense." });
  }
};

// ─────────────────────────────────────────────
// @desc    Delete an expense
// @route   DELETE /api/expenses/:id
// @access  Private (creator only)
// ─────────────────────────────────────────────
const deleteExpense = async (req, res) => {
  try {
    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
      return res.status(400).json({ success: false, message: "Invalid expense ID." });
    }

    const expense = await Expense.findById(req.params.id);

    if (!expense) {
      return res.status(404).json({ success: false, message: "Expense not found." });
    }

    // Only the user who paid can delete the expense
    if (expense.paidBy.toString() !== req.user._id.toString()) {
      return res.status(403).json({ success: false, message: "Only the payer can delete this expense." });
    }

    await expense.deleteOne();

    res.status(200).json({ success: true, message: "Expense deleted successfully." });
  } catch (error) {
    console.error("Delete Expense Error:", error);
    res.status(500).json({ success: false, message: "Server error deleting expense." });
  }
};

module.exports = { createExpense, getExpenses, getExpenseById, updateExpense, deleteExpense };
