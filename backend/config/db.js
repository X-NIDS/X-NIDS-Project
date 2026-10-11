const { Pool } = require("pg");
require("dotenv").config();

const db = new Pool({
    user: process.env.DB_USER,
    host: process.env.DB_HOST,
    database: process.env.DB_NAME,
    password: process.env.DB_PASSWORD,
    port: process.env.DB_PORT || 5432
});

// Test PostgreSQL connection
db.query("SELECT NOW()")
    .then(() => {
        console.log("PostgreSQL connected successfully");
    })
    .catch((error) => {
        console.error("PostgreSQL connection failed:");
        console.error(error.message);
    });

module.exports = db;