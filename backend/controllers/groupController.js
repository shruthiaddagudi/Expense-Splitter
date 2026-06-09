const mongoose = require("mongoose");
const Group = require("../models/Group");
const User  = require("../models/User");

// ─────────────────────────────────────────────
// @desc    Create a new group
// @route   POST /api/groups
// @access  Private
// ─────────────────────────────────────────────
const createGroup = async (req, res) => {
  try {
    const { groupName, members, description } = req.body;

    if (!groupName) {
      return res.status(400).json({ success: false, message: "Group name is required." });
    }

    // The authenticated user is automatically a member
    const memberList = members ? [...new Set([...members, req.user._id.toString()])] : [req.user._id];

    const group = await Group.create({
      groupName,
      description: description || "",
      members: memberList,
      createdBy: req.user._id,
    });

    // Populate member names for the response
    const populated = await group.populate("members", "name email");

    res.status(201).json({
      success: true,
      message: "Group created successfully.",
      group: populated,
    });
  } catch (error) {
    if (error.name === "ValidationError") {
      const messages = Object.values(error.errors).map((e) => e.message);
      return res.status(400).json({ success: false, message: messages.join(", ") });
    }
    console.error("Create Group Error:", error);
    res.status(500).json({ success: false, message: "Server error creating group." });
  }
};

// ─────────────────────────────────────────────
// @desc    Get all groups for the logged-in user
// @route   GET /api/groups
// @access  Private
// ─────────────────────────────────────────────
const getGroups = async (req, res) => {
  try {
    // Return only groups where the user is a member
    const groups = await Group.find({ members: req.user._id })
      .populate("members", "name email")
      .populate("createdBy", "name email")
      .sort({ createdAt: -1 });

    res.status(200).json({
      success: true,
      count: groups.length,
      groups,
    });
  } catch (error) {
    console.error("Get Groups Error:", error);
    res.status(500).json({ success: false, message: "Server error fetching groups." });
  }
};

// ─────────────────────────────────────────────
// @desc    Get a single group by ID
// @route   GET /api/groups/:id
// @access  Private
// ─────────────────────────────────────────────
const getGroupById = async (req, res) => {
  try {
    // Validate ObjectId format
    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
      return res.status(400).json({ success: false, message: "Invalid group ID." });
    }

    const group = await Group.findById(req.params.id)
      .populate("members", "name email")
      .populate("createdBy", "name email");

    if (!group) {
      return res.status(404).json({ success: false, message: "Group not found." });
    }

    // Ensure the requester is a member of the group
    const isMember = group.members.some(
      (m) => m._id.toString() === req.user._id.toString()
    );
    if (!isMember) {
      return res.status(403).json({ success: false, message: "Access denied. You are not a member of this group." });
    }

    res.status(200).json({ success: true, group });
  } catch (error) {
    console.error("Get Group By ID Error:", error);
    res.status(500).json({ success: false, message: "Server error fetching group." });
  }
};

// ─────────────────────────────────────────────
// @desc    Update a group (name, description, members)
// @route   PUT /api/groups/:id
// @access  Private (creator only)
// ─────────────────────────────────────────────
const updateGroup = async (req, res) => {
  try {
    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
      return res.status(400).json({ success: false, message: "Invalid group ID." });
    }

    const group = await Group.findById(req.params.id);

    if (!group) {
      return res.status(404).json({ success: false, message: "Group not found." });
    }

    // Only the creator can update the group
    if (group.createdBy.toString() !== req.user._id.toString()) {
      return res.status(403).json({ success: false, message: "Only the group creator can update this group." });
    }

    const { groupName, description, members } = req.body;

    if (groupName) group.groupName = groupName;
    if (description !== undefined) group.description = description;
    if (members) group.members = members;

    const updatedGroup = await group.save();
    await updatedGroup.populate("members", "name email");

    res.status(200).json({
      success: true,
      message: "Group updated successfully.",
      group: updatedGroup,
    });
  } catch (error) {
    if (error.name === "ValidationError") {
      const messages = Object.values(error.errors).map((e) => e.message);
      return res.status(400).json({ success: false, message: messages.join(", ") });
    }
    console.error("Update Group Error:", error);
    res.status(500).json({ success: false, message: "Server error updating group." });
  }
};

// ─────────────────────────────────────────────
// @desc    Delete a group
// @route   DELETE /api/groups/:id
// @access  Private (creator only)
// ─────────────────────────────────────────────
const deleteGroup = async (req, res) => {
  try {
    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
      return res.status(400).json({ success: false, message: "Invalid group ID." });
    }

    const group = await Group.findById(req.params.id);

    if (!group) {
      return res.status(404).json({ success: false, message: "Group not found." });
    }

    // Only the creator can delete the group
    if (group.createdBy.toString() !== req.user._id.toString()) {
      return res.status(403).json({ success: false, message: "Only the group creator can delete this group." });
    }

    await group.deleteOne();

    res.status(200).json({ success: true, message: "Group deleted successfully." });
  } catch (error) {
    console.error("Delete Group Error:", error);
    res.status(500).json({ success: false, message: "Server error deleting group." });
  }
};

// ─────────────────────────────────────────────
// @desc    Add a member to a group by email
// @route   POST /api/groups/:id/members
// @access  Private (creator only)
// ─────────────────────────────────────────────
const addMember = async (req, res) => {
  try {
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({ success: false, message: "Email is required." });
    }

    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
      return res.status(400).json({ success: false, message: "Invalid group ID." });
    }

    // Find the group
    const group = await Group.findById(req.params.id);
    if (!group) {
      return res.status(404).json({ success: false, message: "Group not found." });
    }

    // Only the creator can add members
    if (group.createdBy.toString() !== req.user._id.toString()) {
      return res.status(403).json({ success: false, message: "Only the group creator can add members." });
    }

    // Find the user to add by email
    const userToAdd = await User.findOne({ email: email.toLowerCase() });
    if (!userToAdd) {
      return res.status(404).json({ success: false, message: `No registered user found with email: ${email}` });
    }

    // Check if already a member
    const alreadyMember = group.members.some(
      (m) => m.toString() === userToAdd._id.toString()
    );
    if (alreadyMember) {
      return res.status(400).json({ success: false, message: `${userToAdd.name} is already a member of this group.` });
    }

    // Add the new member
    group.members.push(userToAdd._id);
    await group.save();

    // Return fully populated group
    const updated = await Group.findById(group._id)
      .populate("members", "name email")
      .populate("createdBy", "name email");

    res.status(200).json({
      success: true,
      message: `${userToAdd.name} added to the group successfully.`,
      group: updated,
    });
  } catch (error) {
    console.error("Add Member Error:", error);
    res.status(500).json({ success: false, message: "Server error adding member." });
  }
};

// ─────────────────────────────────────────────
// @desc    Remove a member from a group
// @route   DELETE /api/groups/:id/members/:userId
// @access  Private (creator only)
// ─────────────────────────────────────────────
const removeMember = async (req, res) => {
  try {
    if (!mongoose.Types.ObjectId.isValid(req.params.id) || !mongoose.Types.ObjectId.isValid(req.params.userId)) {
      return res.status(400).json({ success: false, message: "Invalid ID." });
    }

    const group = await Group.findById(req.params.id);
    if (!group) {
      return res.status(404).json({ success: false, message: "Group not found." });
    }

    // Only creator can remove members
    if (group.createdBy.toString() !== req.user._id.toString()) {
      return res.status(403).json({ success: false, message: "Only the group creator can remove members." });
    }

    // Cannot remove the creator
    if (req.params.userId === group.createdBy.toString()) {
      return res.status(400).json({ success: false, message: "Cannot remove the group creator." });
    }

    group.members = group.members.filter(
      (m) => m.toString() !== req.params.userId
    );
    await group.save();

    const updated = await Group.findById(group._id)
      .populate("members", "name email")
      .populate("createdBy", "name email");

    res.status(200).json({
      success: true,
      message: "Member removed successfully.",
      group: updated,
    });
  } catch (error) {
    console.error("Remove Member Error:", error);
    res.status(500).json({ success: false, message: "Server error removing member." });
  }
};

module.exports = { createGroup, getGroups, getGroupById, updateGroup, deleteGroup, addMember, removeMember };
