require('dotenv').config();

const dayjs = require('dayjs');
const express = require('express');
const http = require('http');
const cors = require('cors');
const axios = require('axios');
const xml2js = require('xml2js');
const redis = require('redis');
const { channel } = require('diagnostics_channel');
const app = express();
const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
const eventKey = process.env.API_KEY;

app.use(cors());

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

//한국관광공사 축제정보
app.get('/api/festival2', async (req, res) => {
    try {
        const url = 'https://apis.data.go.kr/B551011/KorService2/areaBasedList2?';
        const numOfRows = '100';
        const totalPages = '12';
        const Items = [];
        const pageNo = '1';

        // for (let pageNo = 1; pageNo <= totalPages; pageNo++) {
        const response = await axios.get(url, {
            params: {
                serviceKey: eventKey,
                numOfRows: numOfRows,
                pageNo: pageNo,
                MobileOS: 'ETC',
                MobileApp: 'AppTest',
                arrange: 'A',
                contentTypeId: '15',
            }
        });

        const xmlData = response.data;
        const parser = new xml2js.Parser({ explicitArray: false });
        parser.parseString(xmlData, (err, result) => {
            if (err) {
                console.error('XML 파싱 오류:', err);
            } else {

                const items = result.response.body.items.item;
                items.forEach((item) => {
                    console.log(item.title);
                });
            }
        });
    }

    catch (error) {
        console.error('Error fetching event data:', error);
    }
});

//한국문화정보원 분야별 문화정보목록
app.get('/api/festival', async (req, res) => {
    try {
        const url = 'https://apis.data.go.kr/B553457/cultureinfo/realm2';
        const numOfRows = '100';
        const totalPages = 134;

        for (let pageNo = 110; pageNo <= totalPages; pageNo++) {
            const response = await axios.get(url, {
                params: {
                    serviceKey: eventKey,
                    numOfRows: numOfRows,
                    pageNo: pageNo.toString(),
                }
            })

        }
    } catch (error) {
        console.error('Error fetching event data:', error);
    }
});

app.get('/api/redis/items', async (req, res) => {
    try {
        const cachedItems = await redisClient.get('festival_items');
        if (cachedItems) {
            res.status(200).json(
                {
                    message: 'Redis에서 데이터를 가져왔습니다.',
                    item: JSON.parse(cachedItems)
                }
            )
        } else {
            res.status(404).json({ message: 'Redis에 데이터가 없습니다.' });
        }
    } catch (error) {
        console.error('Redis에서 데이터를 가져오는 중 오류 발생', error);
        res.status(500).json({ message: 'Redis에서 데이터를 가져오는 중 오류 발생' });
    }
});

const PORT = process.env.PORT || 8000; // .env 파일에 PORT가 없으면 8000번 사용

app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});