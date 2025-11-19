const express = require('express');
const router = express.Router();
const postService = require('./postService');

router.post('/api/post/upload', async (req, res) => {
    try {
        const payload = req.body;
        const result = await postService.createPost(payload);
        res.status(201).json(result);
    } catch (error) {
        console.error('Error creating post:', error);
        res.status(500).json({ error: 'Error creating post' });
    }
});

router.get('/api/post/getpost', async (req, res) => { //page limit    요청을 get post 둘 중 어떤 것으로 할지 고민중입니다.
    try {
        const payload = req.query;
        const result = await postService.getPost(payload);
        res.status(201).json(result);
    } catch (error) {
        console.error('Error get post:', error);
        res.status(500).json({ error: 'Error get post' });
    }
});

router.get('/api/post/getFilteredPost', async (req, res) => { //page limit gerne area
    try {
        const payload = req.query;
        const result = await postService.getFilteredPost(payload);
        res.status(201).json(result);
    } catch (error) {
        console.error('Error get post:', error);
        res.status(500).json({ error: 'Error get post' });
    }
});

module.exports = router;