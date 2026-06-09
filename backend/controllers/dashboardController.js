const Group = require("../models/Group");
const Expense = require("../models/Expense");

// ─────────────────────────────────────────────
// @desc    Get dashboard summary for the logged-in user
// @route   GET /api/dashboard
// @access  Private
// ─────────────────────────────────────────────
const getDashboard = async (req, res) => {
  try {
    const userId = req.user._id;

    // --- Total groups the user belongs to ---
    const totalGroups = await Group.countDocuments({ members: userId });

    // --- Get all group IDs for this user ---
    const userGroups = await Group.find({ members: userId }).select("_id");
    const groupIds = userGroups.map((g) => g._id);

    // --- Total expenses across all user's groups ---
    const totalExpenses = await Expense.countDocuments({ groupId: { $in: groupIds } });

    // --- Total amount spent across all user's groups ---
    const totalAmountResult = await Expense.aggregate([
      { $match: { groupId: { $in: groupIds } } },
      { $group: { _id: null, total: { $sum: "$amount" } } },
    ]);
    const totalAmount = totalAmountResult.length > 0 ? totalAmountResult[0].total : 0;

    // --- Recent 5 expenses across all user's groups ---
    const recentExpenses = await Expense.find({ groupId: { $in: groupIds } })
      .populate("paidBy", "name email")
      .populate("groupId", "groupName")
      .sort({ createdAt: -1 })
      .limit(5);

    res.status(200).json({
      success: true,
      dashboard: {
        totalGroups,
        totalExpenses,
        totalAmount: parseFloat(totalAmount.toFixed(2)),
        recentExpenses,
      },
    });
  } catch (error) {
    console.error("Dashboard Error:", error);
    res.status(500).json({ success: false, message: "Server error fetching dashboard data." });
  }
};

module.exports = { getDashboard };
