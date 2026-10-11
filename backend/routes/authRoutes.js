const express = require("express");

const {
    register,
    login,
    googleAuth
} = require("../controllers/authController");

const router = express.Router();


// Normal registration
router.post("/register", register);


// Normal login
router.post("/login", login);


// Google login / registration
router.post("/google", googleAuth);


module.exports = router;