const mongoose = require("mongoose");
const Group = require("../models/Group");
const Expense = require("../models/Expense");
const User = require("../models/User");

// ─────────────────────────────────────────────────────────────────
// @desc    Calculate settlement balances for a group
// @route   GET /api/settlements/:groupId
// @access  Private
//
// Algorithm:
//   1. Sum total expenses in the group.
//   2. Calculate equal share per member.
//   3. For each member, compute how much they paid vs their share.
//   4. Positive net = they are owed money; Negative net = they owe money.
//   5. Use a greedy two-pointer approach to settle debts efficiently.
// ─────────────────────────────────────────────────────────────────
const getSettlements = async (req, res) => {
  try {
    const { groupId } = req.params;

    // --- Validate ObjectId ---
    if (!mongoose.Types.ObjectId.isValid(groupId)) {
      return res.status(400).json({ success: false, message: "Invalid group ID." });
    }

    // --- Fetch group with populated members ---
    const group = await Group.findById(groupId).populate("members", "name email");

    if (!group) {
      return res.status(404).json({ success: false, message: "Group not found." });
    }

    // --- Ensure requester is a group member ---
    const isMember = group.members.some(
      (m) => m._id.toString() === req.user._id.toString()
    );
    if (!isMember) {
      return res.status(403).json({ success: false, message: "Access denied." });
    }

    const members = group.members;

    if (members.length === 0) {
      return res.status(200).json({
        success: true,
        groupName: group.groupName,
        balances: [],
        settlements: [],
        message: "No members in this group.",
      });
    }

    // --- Fetch all expenses for this group ---
    const expenses = await Expense.find({ groupId }).populate("paidBy", "name");

    if (expenses.length === 0) {
      return res.status(200).json({
        success: true,
        groupName: group.groupName,
        totalAmount: 0,
        equalShare: 0,
        balances: members.map((m) => ({ user: m.name, userId: m._id, paid: 0, share: 0, net: 0 })),
        settlements: [],
        message: "No expenses found in this group.",
      });
    }

    // --- Calculate total amount spent ---
    const totalAmount = expenses.reduce((sum, e) => sum + e.amount, 0);
    const equalShare = totalAmount / members.length;

    // --- Build a map of how much each member has paid ---
    const paidMap = {};
    members.forEach((m) => (paidMap[m._id.toString()] = 0));

    expenses.forEach((expense) => {
      const payerId = expense.paidBy._id.toString();
      if (paidMap[payerId] !== undefined) {
        paidMap[payerId] += expense.amount;
      }
    });

    // --- Calculate net balance per member ---
    // Positive: owed money | Negative: owes money
    const balances = members.map((member) => {
      const paid = paidMap[member._id.toString()] || 0;
      const net = parseFloat((paid - equalShare).toFixed(2));
      return {
        userId: member._id,
        user: member.name,
        email: member.email,
        paid: parseFloat(paid.toFixed(2)),
        share: parseFloat(equalShare.toFixed(2)),
        net, // positive = gets money back, negative = owes
        owes: net < 0 ? parseFloat(Math.abs(net).toFixed(2)) : 0,
      };
    });

    // ─── Greedy Settlement Algorithm ────────────────────────────
    // Separate creditors (net > 0) and debtors (net < 0)
    const creditors = balances
      .filter((b) => b.net > 0)
      .map((b) => ({ ...b, amount: b.net }));
    const debtors = balances
      .filter((b) => b.net < 0)
      .map((b) => ({ ...b, amount: Math.abs(b.net) }));

    const settlements = [];

    let i = 0; // creditor pointer
    let j = 0; // debtor pointer

    while (i < creditors.length && j < debtors.length) {
      const credit = creditors[i].amount;
      const debt = debtors[j].amount;
      const transfer = parseFloat(Math.min(credit, debt).toFixed(2));

      settlements.push({
        from: debtors[j].user,
        fromId: debtors[j].userId,
        to: creditors[i].user,
        toId: creditors[i].userId,
        amount: transfer,
      });

      creditors[i].amount = parseFloat((credit - transfer).toFixed(2));
      debtors[j].amount = parseFloat((debt - transfer).toFixed(2));

      if (creditors[i].amount < 0.01) i++;
      if (debtors[j].amount < 0.01) j++;
    }

    res.status(200).json({
      success: true,
      groupName: group.groupName,
      totalAmount: parseFloat(totalAmount.toFixed(2)),
      equalShare: parseFloat(equalShare.toFixed(2)),
      memberCount: members.length,
      balances,      // who paid what vs their share
      settlements,   // who pays whom to settle up
    });
  } catch (error) {
    console.error("Settlement Error:", error);
    res.status(500).json({ success: false, message: "Server error calculating settlements." });
  }
};

module.exports = { getSettlements };
