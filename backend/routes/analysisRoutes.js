const express = require("express");
const multer = require("multer");

const {
    uploadAndAnalysis,
    getAnalysisHistory,
    getAnalysisById
} = require("../controllers/analysisController");

const authMiddleware = require("../middleware/authMiddleware");

const router = express.Router();

const upload = multer({
    dest: "uploads/"
});

router.post(
    "/upload",
    authMiddleware,
    upload.single("file"),
    uploadAndAnalysis
);

router.get(
    "/history",
    authMiddleware,
    getAnalysisHistory
);

router.get(
    "/:id",
    authMiddleware,
    getAnalysisById
);

module.exports = router;