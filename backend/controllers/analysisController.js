const fs = require("fs");
const axios = require("axios");
const FormData = require("form-data");
const { OAuth2Client } = require("google-auth-library");

const googleClient = new OAuth2Client(
    process.env.GOOGLE_CLIENT_ID
);

const db = require("../config/db");


// ======================================================
// UPLOAD CSV AND ANALYZE NETWORK TRAFFIC
// ======================================================

const uploadAndAnalysis = async (req, res) => {

    try {

        // ------------------------------------------------
        // 1. Check whether a file was uploaded
        // ------------------------------------------------

        if (!req.file) {

            return res.status(400).json({
                message: "Please upload a CSV file"
            });

        }


        // ------------------------------------------------
        // 2. Check file extension
        // ------------------------------------------------

        const fileName = req.file.originalname.toLowerCase();

        if (!fileName.endsWith(".csv")) {

            // Delete invalid uploaded file
            fs.unlinkSync(req.file.path);

            return res.status(400).json({
                message: "Only CSV files are allowed"
            });

        }


        // ------------------------------------------------
        // 3. Get logged-in user
        // ------------------------------------------------

        const userId = req.user.id;


        // ------------------------------------------------
        // 4. Create FormData
        // ------------------------------------------------

        const formData = new FormData();

        formData.append(
            "file",
            fs.createReadStream(req.file.path)
        );


        // ------------------------------------------------
        // 5. Send CSV to FastAPI ML service
        // ------------------------------------------------

        const mlResponse = await axios.post(

            "http://127.0.0.1:8000/predict-csv",

            formData,

            {
                headers: {
                    ...formData.getHeaders()
                },

                // Increase this if your CSV is large
                maxContentLength: Infinity,
                maxBodyLength: Infinity
            }

        );


        // ------------------------------------------------
        // 6. Get response from FastAPI
        // ------------------------------------------------

        const result = mlResponse.data;


        console.log("ML Result:", result);


        // ------------------------------------------------
        // 7. Save analysis summary in PostgreSQL
        // ------------------------------------------------

        const analysisQuery = `
            INSERT INTO analyses
            (
                user_id,
                filename,
                total_records,
                normal_count,
                attack_count
            )
            VALUES ($1, $2, $3, $4, $5)
            RETURNING id
        `;


        const analysisResult = await db.query(

            analysisQuery,

            [
                userId,
                req.file.originalname,
                result.total_records,
                result.normal_count,
                result.attack_count
            ]

        );


        const analysisId = analysisResult.rows[0].id;


        // ------------------------------------------------
        // 8. Save individual predictions
        // ------------------------------------------------

        if (
            result.predictions &&
            Array.isArray(result.predictions)
        ) {

            for (const prediction of result.predictions) {

                await db.query(

                    `
                    INSERT INTO predictions
                    (
                        analysis_id,
                        record_number,
                        prediction,
                        attack_type,
                        confidence
                    )
                    VALUES ($1, $2, $3, $4, $5)
                    `,

                    [
                        analysisId,
                        prediction.record_number,
                        prediction.prediction,
                        prediction.attack_type || null,
                        prediction.confidence || null
                    ]

                );

            }

        }


        // ------------------------------------------------
        // 9. Delete temporary CSV
        // ------------------------------------------------

        try {

            fs.unlinkSync(req.file.path);

        } catch (deleteError) {

            console.error(
                "Temporary file deletion error:",
                deleteError
            );

        }


        // ------------------------------------------------
        // 10. Send result to React
        // ------------------------------------------------

        return res.status(200).json({

            message: "Network traffic analysis completed",

            analysis_id: analysisId,

            summary: {

                total_records: result.total_records,

                normal_count: result.normal_count,

                attack_count: result.attack_count,

                attack_rate: result.attack_rate

            },

            predictions: result.predictions || []

        });


    } catch (error) {

        console.error(
            "Analysis Controller Error:",
            error
        );


        // ------------------------------------------------
        // Delete temporary file if an error occurs
        // ------------------------------------------------

        if (req.file) {

            try {

                fs.unlinkSync(req.file.path);

            } catch (deleteError) {

                console.error(
                    "File deletion error:",
                    deleteError
                );

            }

        }


        // ------------------------------------------------
        // FastAPI error
        // ------------------------------------------------

        if (error.response) {

            console.error(
                "FastAPI Error:",
                error.response.data
            );

            return res.status(500).json({

                message: "ML analysis failed",

                error: error.response.data

            });

        }


        return res.status(500).json({

            message: "Failed to analyze network traffic"

        });

    }

};



// ======================================================
// GET ANALYSIS HISTORY
// ======================================================

const getAnalysisHistory = async (req, res) => {

    try {

        // Get logged-in user's ID
        const userId = req.user.id;


        const result = await db.query(

            `
            SELECT
                id,
                filename,
                total_records,
                normal_count,
                attack_count,
                created_at
            FROM analyses
            WHERE user_id = $1
            ORDER BY created_at DESC
            `,

            [userId]

        );


        return res.status(200).json({

            analyses: result.rows

        });


    } catch (error) {

        console.error(
            "History Error:",
            error
        );


        return res.status(500).json({

            message: "Failed to fetch analysis history"

        });

    }

};



// ======================================================
// GET ONE ANALYSIS BY ID
// ======================================================

const getAnalysisById = async (req, res) => {

    try {

        // Get analysis ID from URL
        const analysisId = req.params.id;

        // Get logged-in user's ID
        const userId = req.user.id;


        // ------------------------------------------------
        // 1. Get analysis
        // ------------------------------------------------

        const analysisResult = await db.query(

            `
            SELECT
                id,
                filename,
                total_records,
                normal_count,
                attack_count,
                created_at
            FROM analyses
            WHERE id = $1
            AND user_id = $2
            `,

            [
                analysisId,
                userId
            ]

        );


        // ------------------------------------------------
        // 2. Check analysis exists
        // ------------------------------------------------

        if (analysisResult.rows.length === 0) {

            return res.status(404).json({

                message: "Analysis not found"

            });

        }


        // ------------------------------------------------
        // 3. Get predictions
        // ------------------------------------------------

        const predictionResult = await db.query(

            `
            SELECT
                record_number,
                prediction,
                attack_type,
                confidence,
                created_at
            FROM predictions
            WHERE analysis_id = $1
            ORDER BY record_number
            `,

            [analysisId]

        );


        // ------------------------------------------------
        // 4. Return complete analysis
        // ------------------------------------------------

        return res.status(200).json({

            analysis: analysisResult.rows[0],

            predictions: predictionResult.rows

        });


    } catch (error) {

        console.error(
            "Get Analysis Error:",
            error
        );


        return res.status(500).json({

            message: "Failed to fetch analysis"

        });

    }

};



// ======================================================
// EXPORT CONTROLLERS
// ======================================================

module.exports = {

    uploadAndAnalysis,

    getAnalysisHistory,

    getAnalysisById

};