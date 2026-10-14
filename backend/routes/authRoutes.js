const express = require("express");

const {
    register,
    login,
    googleAuth,
    forgotPassword,
    resetPassword
} = require("../controllers/authController");

const router = express.Router();

// Normal registration
router.post("/register", register);

// Normal login
router.post("/login", login);

// Google login / registration
router.post("/google", googleAuth);

// Request a password-reset email
router.post("/forgot-password", forgotPassword);

// Set a new password using the reset token
router.post("/reset-password", resetPassword);

module.exports = router;