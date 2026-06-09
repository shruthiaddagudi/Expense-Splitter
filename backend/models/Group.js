const mongoose = require("mongoose");

/**
 * Group Schema
 * Represents a group of users who share expenses.
 * Each group has a name, a list of member user IDs, and a creator.
 */
const groupSchema = new mongoose.Schema(
  {
    groupName: {
      type: String,
      required: [true, "Group name is required"],
      trim: true,
    },

    // Array of User ObjectIds who are members of this group
    members: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
      },
    ],

    // The user who created this group
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },

    description: {
      type: String,
      trim: true,
      default: "",
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model("Group", groupSchema);