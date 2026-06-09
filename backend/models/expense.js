const mongoose = require("mongoose");

/**
 * Expense Schema
 * Represents a single expense within a group.
 * Tracks who paid, how much, and which group it belongs to.
 */
const expenseSchema = new mongoose.Schema(
  {
    description: {
      type: String,
      required: [true, "Description is required"],
      trim: true,
    },

    amount: {
      type: Number,
      required: [true, "Amount is required"],
      min: [0.01, "Amount must be greater than 0"],
    },

    // The user who paid for this expense
    paidBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: [true, "paidBy (user) is required"],
    },

    // The group this expense belongs to
    groupId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Group",
      required: [true, "groupId is required"],
    },

    // Optional: category tag for the expense
    category: {
      type: String,
      trim: true,
      default: "General",
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model("Expense", expenseSchema);