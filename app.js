require('dotenv').config();

const dayjs = require('dayjs');
const express = require('express');
const http = require('http');
const cors = require('cors');
const axios = require('axios');
const xml2js = require('xml2js');
const authRouter = require('./src/api/auth/authController');
const bodyParser = require('body-parser');
const redis = require('redis');
const { channel } = require('diagnostics_channel');
const app = express();
const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
const eventKey = process.env.API_KEY;

app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));
app.use(authRouter);

// app.use(cors());

const redisClient = redis.createClient({
    url: 'redis://localhost:6379'
});

redisClient.connect().then(() => {
    console.log("Connected to Redis");
}).catch((err) => {
    console.error("Redis connection error:", err);
});

app.get('/', (req, res) => {
    console.log("Received a request at /");
});

const PORT = process.env.PORT || 8000; // .env 파일에 PORT가 없으면 8000번 사용

app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});