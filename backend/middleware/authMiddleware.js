const jwt = require("jsonwebtoken");
const { User } = require("../models");

async function authenticate(req, res, next) {
  const header = req.headers.authorization;

  if (!header || !header.startsWith("Bearer ")) {
    return res.status(401).json({ message: "No token provided" });
  }

  const token = header.split(" ")[1];

  try {
    const decoded = jwt.verify(token, "SECRET_KEY");

    // Verify user exists in DB (handle deleted users)
    const user = await User.findByPk(decoded.id);
    if (!user) {
      return res.status(401).json({ message: "User account no longer exists" });
    }

    req.user = decoded; // { id, role }
    next();
  } catch (err) {
    return res.status(401).json({ message: "Invalid token" });
  }
}

function authorize(roles) {
  return (req, res, next) => {
    // If roles is a string, wrap in array
    const allowedRoles = Array.isArray(roles) ? roles : [roles];

    if (!allowedRoles.includes(req.user.role)) {
      return res.status(403).json({ message: "Forbidden" });
    }
    next();
  };
}

module.exports = { authenticate, authorize };