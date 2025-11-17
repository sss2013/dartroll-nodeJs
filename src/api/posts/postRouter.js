const express = require('express');
const router = express.Router();
const postService = require('./postService');

router.post('/api/post/test', async (req, res) => {
    try {
        const payload = req.body;
        const result = await postService.createPost(payload);
        res.status(201).json(result);
    } catch (error) {
        console.error('Error creating post:', error);
        res.status(500).json({ error: 'Error creating post' });
    }
});

module.exports = router;