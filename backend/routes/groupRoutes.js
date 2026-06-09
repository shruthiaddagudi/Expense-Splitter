// routes/groupRoutes.js
const express = require("express");
const router  = express.Router();

const {
  createGroup,
  getGroups,
  getGroupById,
  updateGroup,
  deleteGroup,
  addMember,
  removeMember,
} = require("../controllers/groupController");

const { protect } = require("../middleware/authMiddleware");

// All group routes are protected
router.use(protect);

// @route   POST   /api/groups        — Create a group
// @route   GET    /api/groups        — Get all groups for current user
router.route("/").post(createGroup).get(getGroups);

// @route   GET    /api/groups/:id    — Get single group
// @route   PUT    /api/groups/:id    — Update group (creator only)
// @route   DELETE /api/groups/:id    — Delete group (creator only)
router.route("/:id").get(getGroupById).put(updateGroup).delete(deleteGroup);

// @route   POST   /api/groups/:id/members              — Add a member by email (creator only)
// @route   DELETE /api/groups/:id/members/:userId      — Remove a member (creator only)
router.post("/:id/members",              addMember);
router.delete("/:id/members/:userId",    removeMember);

module.exports = router;