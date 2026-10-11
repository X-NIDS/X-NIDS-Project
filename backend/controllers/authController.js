const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const { OAuth2Client } = require("google-auth-library");

const db = require("../config/db");


// ======================================================
// GOOGLE OAUTH CLIENT
// ======================================================

const googleClient = new OAuth2Client(
    process.env.GOOGLE_CLIENT_ID
);


// ======================================================
// REGISTER WITH EMAIL + PASSWORD
// ======================================================

const register = async (req, res) => {
    try {
        const { name, email, password } = req.body;

        // Validate input
        if (!name || !email || !password) {
            return res.status(400).json({
                message: "Name, email and password are required"
            });
        }

        // Password validation
        if (password.length < 6) {
            return res.status(400).json({
                message: "Password must contain at least 6 characters"
            });
        }

        // Normalize email
        const normalizedEmail = email
            .trim()
            .toLowerCase();

        // Check whether user already exists
        const existingUser = await db.query(
            `
            SELECT
                id,
                email,
                google_id
            FROM users
            WHERE email = $1
            `,
            [normalizedEmail]
        );

        if (existingUser.rows.length > 0) {
            return res.status(409).json({
                message: "An account with this email already exists"
            });
        }

        // Hash password
        const passwordHash = await bcrypt.hash(
            password,
            10
        );

        // Insert user
        const result = await db.query(
            `
            INSERT INTO users
            (
                name,
                email,
                password_hash
            )
            VALUES
            (
                $1,
                $2,
                $3
            )
            RETURNING
                id,
                name,
                email,
                created_at
            `,
            [
                name.trim(),
                normalizedEmail,
                passwordHash
            ]
        );

        const user = result.rows[0];

        // Generate JWT
        const token = jwt.sign(
            {
                id: user.id,
                email: user.email
            },
            process.env.JWT_SECRET,
            {
                expiresIn: "1d"
            }
        );

        return res.status(201).json({
            message: "Registration successful",

            token,

            user: {
                id: user.id,
                name: user.name,
                email: user.email
            }
        });

    } catch (error) {

        console.error(
            "Registration error:",
            error
        );

        return res.status(500).json({
            message: "Server error during registration"
        });
    }
};


// ======================================================
// LOGIN WITH EMAIL + PASSWORD
// ======================================================

const login = async (req, res) => {
    try {
        const { email, password } = req.body;

        // Validate input
        if (!email || !password) {
            return res.status(400).json({
                message: "Email and password are required"
            });
        }

        // Normalize email
        const normalizedEmail = email
            .trim()
            .toLowerCase();

        // Find user
        const result = await db.query(
            `
            SELECT
                id,
                name,
                email,
                password_hash,
                google_id
            FROM users
            WHERE email = $1
            `,
            [normalizedEmail]
        );

        if (result.rows.length === 0) {
            return res.status(401).json({
                message: "Invalid email or password"
            });
        }

        const user = result.rows[0];

        // Google-only account
        if (!user.password_hash) {
            return res.status(401).json({
                message:
                    "This account was created with Google. Please sign in with Google."
            });
        }

        // Compare password
        const passwordMatch = await bcrypt.compare(
            password,
            user.password_hash
        );

        if (!passwordMatch) {
            return res.status(401).json({
                message: "Invalid email or password"
            });
        }

        // Generate JWT
        const token = jwt.sign(
            {
                id: user.id,
                email: user.email
            },
            process.env.JWT_SECRET,
            {
                expiresIn: "1d"
            }
        );

        return res.status(200).json({
            message: "Login successful",

            token,

            user: {
                id: user.id,
                name: user.name,
                email: user.email
            }
        });

    } catch (error) {

        console.error(
            "Login error:",
            error
        );

        return res.status(500).json({
            message: "Server error during login"
        });
    }
};


// ======================================================
// GOOGLE LOGIN / SIGN-UP
// ======================================================

const googleAuth = async (req, res) => {

    try {

        const { credential } = req.body;


        // ------------------------------------------------
        // Check credential
        // ------------------------------------------------

        if (!credential) {
            return res.status(400).json({
                message: "Google credential is required"
            });
        }


        // ------------------------------------------------
        // Verify Google ID token
        // ------------------------------------------------

        const ticket =
            await googleClient.verifyIdToken({
                idToken: credential,
                audience: process.env.GOOGLE_CLIENT_ID
            });


        const payload =
            ticket.getPayload();


        // ------------------------------------------------
        // Extract Google account information
        // ------------------------------------------------

        const googleId = payload.sub;

        const email = payload.email;

        const name =
            payload.name ||
            email.split("@")[0];


        // ------------------------------------------------
        // Verify email
        // ------------------------------------------------

        if (!payload.email_verified) {

            return res.status(401).json({
                message:
                    "Google email is not verified"
            });
        }


        if (!googleId || !email) {

            return res.status(400).json({
                message:
                    "Invalid Google account information"
            });
        }


        const normalizedEmail =
            email
                .trim()
                .toLowerCase();


        // ------------------------------------------------
        // Find existing user
        // ------------------------------------------------

        const existingUser =
            await db.query(
                `
                SELECT
                    id,
                    name,
                    email,
                    password_hash,
                    google_id
                FROM users
                WHERE email = $1
                   OR google_id = $2
                `,
                [
                    normalizedEmail,
                    googleId
                ]
            );


        let user;


        // =================================================
        // EXISTING USER
        // =================================================

        if (existingUser.rows.length > 0) {

            user = existingUser.rows[0];


            // ---------------------------------------------
            // Link Google account if not already linked
            // ---------------------------------------------

            if (!user.google_id) {

                const updatedUser =
                    await db.query(
                        `
                        UPDATE users
                        SET google_id = $1
                        WHERE id = $2
                        RETURNING
                            id,
                            name,
                            email,
                            google_id
                        `,
                        [
                            googleId,
                            user.id
                        ]
                    );


                user =
                    updatedUser.rows[0];
            }

        }


        // =================================================
        // NEW GOOGLE USER
        // =================================================

        else {

            const newUser =
                await db.query(
                    `
                    INSERT INTO users
                    (
                        name,
                        email,
                        password_hash,
                        google_id
                    )
                    VALUES
                    (
                        $1,
                        $2,
                        $3,
                        $4
                    )
                    RETURNING
                        id,
                        name,
                        email,
                        google_id
                    `,
                    [
                        name,
                        normalizedEmail,
                        null,
                        googleId
                    ]
                );


            user =
                newUser.rows[0];
        }


        // ------------------------------------------------
        // Generate X-NIDS JWT
        // ------------------------------------------------

        const token =
            jwt.sign(
                {
                    id: user.id,
                    email: user.email
                },
                process.env.JWT_SECRET,
                {
                    expiresIn: "1d"
                }
            );


        // ------------------------------------------------
        // Send response
        // ------------------------------------------------

        return res.status(200).json({

            message:
                "Google authentication successful",

            token,

            user: {
                id: user.id,
                name: user.name,
                email: user.email
            }

        });

    } catch (error) {

        console.error(
            "Google authentication error:",
            error
        );

        return res.status(401).json({
            message:
                "Google authentication failed"
        });
    }
};


// ======================================================
// EXPORT CONTROLLERS
// ======================================================

module.exports = {
    register,
    login,
    googleAuth
};