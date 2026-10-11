const express = require('express');
const dotenv = require('dotenv');
const cors = require('cors');

// Connect to database
const pool = require("./config/db");

dotenv.config();

const app = express();

// Middleware
app.use(cors());
app.use(express.json());

// IMPORT ANALYSIS ROUTES
const analysisRoutes = require('./routes/analysisRoutes');
app.use('/api/analysis', analysisRoutes);

// IMPORT AUTH ROUTES
const authRoutes = require('./routes/authRoutes');
app.use('/api/auth', authRoutes);

//TEST ROUTES
app.get('/', (req, res) => {
    res.send('API is running...');
});

// Start the server
const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});