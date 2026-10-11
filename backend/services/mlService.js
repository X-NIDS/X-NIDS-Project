
const axios = require("axios");

const ML_SERVICE_URL =
  process.env.ML_SERVICE_URL || "http://127.0.0.1:8000";

async function predict(features) {
  const response = await axios.post(
    `${ML_SERVICE_URL}/predict`,
    { features },
    { timeout: 30000 }
  );

  return response.data;
}

module.exports = { predict };
