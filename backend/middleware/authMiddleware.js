const jwt = require("jsonwebtoken");
const User = require("../models/User");

/**
 * protect middleware
 * Verifies the JWT token sent in the Authorization header.
 * Attaches the authenticated user to req.user for downstream use.
 *
 * Expected header format:
 *   Authorization: Bearer <token>
 */
const protect = async (req, res, next) => {
  let token;

  // Check for token in the Authorization header
  if (
    req.headers.authorization &&
    req.headers.authorization.startsWith("Bearer ")
  ) {
    token = req.headers.authorization.split(" ")[1];
  }

  // If no token found, reject the request
  if (!token) {
    return res.status(401).json({
      success: false,
      message: "Not authorized. No token provided.",
    });
  }

  try {
    // Verify token signature and expiry
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    // Attach the user (without password) to the request object
    req.user = await User.findById(decoded.id).select("-password");

    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: "Not authorized. User no longer exists.",
      });
    }

    next();
  } catch (error) {
    // Handle expired or malformed tokens
    if (error.name === "TokenExpiredError") {
      return res.status(401).json({
        success: false,
        message: "Token expired. Please login again.",
      });
    }
    return res.status(401).json({
      success: false,
      message: "Not authorized. Invalid token.",
    });
  }
};

module.exports = { protect };
