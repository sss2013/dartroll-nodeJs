const express = require('express');
const router = express.Router();
const eventService = require('./eventService');

//한국문화정보원 분야별 문화정보목록
router.get('/api/storeEvent1/', async (req, res) => {
    const idxName = req.query.idxName; // 'performance', 'festival', 'experience'
    const firstPages = req.query.first;
    const totalPages = req.query.pages;

    try {
        const result = await eventService.getItems(idxName, firstPages, totalPages);
        res.status(200).json(result);
    } catch (error) {
        console.error('Error in /api/storeEvent1:', error);
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

router.post('/api/getEvent', async (req, res) => {
    const idxName = req.body.idxName;
    const area = req.body.area;
    let genre = req.body.genre;
    genre = eventService.filterGenre(genre);

    const tagQuery = eventService.createTagQuery(idxName, area, genre, 'simple');
    const returnFields = ['area', 'startDate', 'endDate', 'title', 'place', 'thumbnail', 'sigungu'];

    try {
        const result = await eventService.fetchItems(idxName, tagQuery, returnFields, 10);
        res.status(200).json(result);
    } catch (error) {
        console.error('Error in /api/getEventWithArea:', error);
    }
});

router.post('/api/getEventDetail', async (req, res) => {
    const idxName = req.body.idxName;
    const contentId = req.body.contentId;

    try {
        const result = await eventService.fetchItemsDetail(idxName, contentId);
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

router.post('/api/getSimple', async (req, res) => {
    const idxName = req.body.idxName;
    const area = req.body.area;
    let genre = req.body.genre;

    genre = eventService.filterGenre(genre);

    const returnFields = ['title'];
    const tagQuery = eventService.createTagQuery(idxName, area, genre, 'simple');
    try {
        const result = await eventService.fetchItems(idxName, tagQuery, returnFields, 1000);
        res.json(result);
    } catch (error) {
        res.json({ error: 'Error fetching simple items' });
    }
})


router.get('/api/getAllfromDB', async (req, res) => {
    const result = await eventService.getAllItemsfromRedis();
    res.json(result);
});

router.get('/api/getFilteredFestival', async (req, res) => {
    const result = await eventService.filterItemsWithDate();
    console.log(result);
});

module.exports = router;