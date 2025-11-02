require('dotenv').config();
const express = require('express');
const axios = require('axios');
require('dotenv').config();

const router = express.Router();

//한국문화정보원 분야별 문화정보목록
router.get('/api/festival', async (req, res) => {
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
            });

        }
    } catch (error) {
        console.error('Error fetching event data:', error);
    }
});


//한국관광공사 축제정보
router.get('/api/festival2', async (req, res) => {
    try {
        const url = 'https://apis.data.go.kr/B551011/KorService2/areaBasedList2?';
        // const numOfRows = '100'
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

router.get('/api/redis/items', async (req, res) => {
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