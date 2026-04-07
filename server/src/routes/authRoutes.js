const express = require("express");
const {
  signup,
  login,
  googleLogin,
  getProfile,
} = require("../controllers/authController");
const authenticateToken = require("../middleware/authMiddleware");

const router = express.Router();

router.post("/signup", signup);
router.post("/login", login);
router.post("/google-login", googleLogin);
router.get("/me", authenticateToken, getProfile);

module.exports = router;
