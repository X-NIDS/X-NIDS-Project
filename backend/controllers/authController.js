const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const crypto = require("crypto");
const nodemailer = require("nodemailer");
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
// FORGOT PASSWORD
// ======================================================

const forgotPassword = async (req, res) => {
const genericMessage =
"If an account exists for that email, a password-reset link will be sent.";

try {
    const email = String(req.body.email || "")
        .trim()
        .toLowerCase();

    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
        return res.status(400).json({
            message: "Please enter a valid email address."
        });
    }

    const result = await db.query(
        `SELECT id, email, password_hash
         FROM users
         WHERE email = $1`,
        [email]
    );

    // Do not disclose whether an account exists.
    if (
        result.rows.length === 0 ||
        !result.rows[0].password_hash
    ) {
        return res.status(200).json({
            message: genericMessage
        });
    }

    const user = result.rows[0];

    // Generate a cryptographically secure random token.
    const rawToken = crypto.randomBytes(32).toString("hex");
    const tokenHash = crypto
        .createHash("sha256")
        .update(rawToken)
        .digest("hex");

    // Invalidate any previous unused reset tokens.
    await db.query(
        `UPDATE password_reset_tokens
         SET used_at = NOW()
         WHERE user_id = $1 AND used_at IS NULL`,
        [user.id]
    );

    // Token expires in 15 minutes.
    await db.query(
        `INSERT INTO password_reset_tokens
            (user_id, token_hash, expires_at)
         VALUES ($1, $2, NOW() + INTERVAL '15 minutes')`,
        [user.id, tokenHash]
    );

    const transporter = nodemailer.createTransport({
        host: process.env.SMTP_HOST,
        port: Number(process.env.SMTP_PORT || 465),
        secure: process.env.SMTP_SECURE === "true",
        auth: {
            user: process.env.SMTP_USER,
            pass: process.env.SMTP_PASS
        }
    });

    const resetUrl =
        `${process.env.FRONTEND_URL}/reset-password` +
        `?token=${rawToken}`;

    try {
        await transporter.sendMail({
            from: process.env.SMTP_USER,
            to: user.email,
            subject: "Reset your X-NIDS password",
            text:
                `A password reset was requested for your X-NIDS account.\n\n` +
                `Use this link within 15 minutes:\n${resetUrl}\n\n` +
                `If you did not request this, you can ignore this email.`,
            html: `
                <h2>Reset your X-NIDS password</h2>
                <p>A password reset was requested for your account.</p>
                <p>
                    <a href="${resetUrl}">Reset Password</a>
                </p>
                <p>This link expires in 15 minutes and can only be used once.</p>
                <p>If you did not request this, you can ignore this email.</p>
            `
        });
    } catch (emailError) {
        // Invalidate the token if email delivery fails.
        await db.query(
            `UPDATE password_reset_tokens
             SET used_at = NOW()
             WHERE token_hash = $1 AND used_at IS NULL`,
            [tokenHash]
        );

        throw emailError;
    }

    return res.status(200).json({
        message: genericMessage
    });
} catch (error) {
    console.error("Forgot password error:", error);

    return res.status(500).json({
        message: "Unable to process the password-reset request."
    });
}

};

// ======================================================
// RESET PASSWORD
// ======================================================

const resetPassword = async (req, res) => {
const { token, password } = req.body;

if (
    typeof token !== "string" ||
    typeof password !== "string" ||
    password.length < 8 ||
    password.length > 128
) {
    return res.status(400).json({
        message: "A valid reset token and a password of 8–128 characters are required."
    });
}

const tokenHash = crypto
    .createHash("sha256")
    .update(token)
    .digest("hex");

const client = await db.connect();

try {
    await client.query("BEGIN");

    const result = await client.query(
        `SELECT id, user_id
         FROM password_reset_tokens
         WHERE token_hash = $1
           AND used_at IS NULL
           AND expires_at > NOW()
         FOR UPDATE`,
        [tokenHash]
    );

    if (result.rows.length === 0) {
        await client.query("ROLLBACK");

        return res.status(400).json({
            message: "This reset link is invalid or has expired. Please request a new one."
        });
    }

    const resetRecord = result.rows[0];

    const passwordHash = await bcrypt.hash(password, 10);

    await client.query(
        `UPDATE users
         SET password_hash = $1
         WHERE id = $2`,
        [passwordHash, resetRecord.user_id]
    );

    await client.query(
        `UPDATE password_reset_tokens
         SET used_at = NOW()
         WHERE id = $1`,
        [resetRecord.id]
    );

    // Invalidate all other reset links for this user.
    await client.query(
        `UPDATE password_reset_tokens
         SET used_at = NOW()
         WHERE user_id = $1
           AND used_at IS NULL`,
        [resetRecord.user_id]
    );

    await client.query("COMMIT");

    return res.status(200).json({
        message: "Password reset successful. Please sign in with your new password."
    });
} catch (error) {
    await client.query("ROLLBACK");

    console.error("Reset password error:", error);

    return res.status(500).json({
        message: "Unable to reset your password."
    });
} finally {
    client.release();
}

};

// ======================================================
// EXPORT CONTROLLERS
// ======================================================

module.exports = {
    register,
    login,
    googleAuth,
    forgotPassword,
    resetPassword
};