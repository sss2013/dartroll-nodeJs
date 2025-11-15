const express = require('express');
const router = express.Router();
const eventService = require('./eventService');

//한국문화정보원 분야별 문화정보목록
router.get('/api/storeEvent1/', async (req, res) => {
    const servieTp = req.query.search; // '공연/전시', '행사/축제', '교육/체험'
    const firstPages = req.query.first;
    const totalPages = req.query.pages;

    try {
        const result = await eventService.callItems(servieTp, firstPages, totalPages);
        res.status(200).json(result);
    } catch (error) {
        console.error('Error in /api/storeEvent1:', error);
    }
});

router.post('/api/getEventByArea', async (req, res) => {
    const idxName = req.body.idxName;
    const area = req.body.area;
    try {
        const result = await eventService.getItemsByArea(idxName, area);
        res.status(200).json(result);
    } catch (error) {
        console.error('Error in /api/getEventWithArea:', error);
    }
});

router.post('/api/getEventDetail', async (req, res) => {
    const idxName = req.body.idxName;
    const contentId = req.body.contentId;

    try {
        const result = await eventService.getItemsDetail(idxName, contentId);
        res.status(200).json(result);
    } catch (error) {
        res.status(500).json({ error: 'Error fetching event detail' });
    }
});

router.get('/api/filterFestival', async (req, res) => {
    try {
        await eventService.filterItemsWithDate();
        res.status(200).send('Filter completed');
    } catch (error) {
        console.error('Error filtering items:', error);
        res.status(500).send('Error filtering items');
    }
});

router.get('/api/storeDetailInfo', async (req, res) => {
    const idxName = req.query.idxName;
    try {
        const result = await eventService.storeDetailInfo(idxName);
        res.status(200).json(result);
    } catch (error) {
        res.json({ error: 'Error storing detail info' });
    }
});

router.get('/api/getAllfromDB', async (req, res) => {
    const result = await eventService.getAllItemsfromRedis();
    res.json(result);
});

router.get('/api/getFilteredFestival', async (req, res) => {
    const result = await eventService.filterItemsWithDate();
    console.log(result);
});

module.exports = router;