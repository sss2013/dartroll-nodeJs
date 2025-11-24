const express = require('express');
const router = express.Router();
const postService = require('./postService');

router.post('/api/post/upload', async (req, res) => {
    try {
        const title = req.body.title;
        const area = req.body.area;
        const genre = req.body.genre;
        const content = req.body.content;
        const url = req.body.url;
        const tap = req.body.tap; //review인지 matching인지 구분    
        if (!title || !area || !genre || !content || !url || !tap) {
            return res.status(400).json({ error: 'Missing required fields' });
        }
        const payload = { title, area, genre, content, url };
        const result = await postService.createPost(payload, tap);
        res.status(201).json(result);
    } catch (error) {
        console.error('Error creating post:', error);
        res.status(500).json({ error: 'Error creating post' });
    }
});

//지역구분 없이 요청
router.get('/api/post/getAll', async (req, res) => {
    try {
        const page = req.query.page;
        const limit = req.query.limit;
        const tap = req.query.tap;
        if (!page || !limit || !tap) {
            return res.status(400).json({ error: 'Missing required query parameters' });
        }
        const payload = { page, limit };
        const result = await postService.getPost(payload, tap);
        res.status(201).json(result);
    } catch (error) {
        console.error('Error get post:', error);
        res.status(500).json({ error: 'Error get post' });
    }
});

//지역에 따라 구분
router.get('/api/post/getByArea', async (req, res) => { //page limit gerne area
    try {
        const area = req.query.area;
        const genre = req.query.genre;
        const page = req.query.page;
        const limit = req.query.limit;
        const tap = req.query.tap;

        if (!page || !limit || !tap || !area || !genre) {
            return res.status(400).json({ error: 'Missing required query parameters' });
        }
        const payload = { area, genre, page, limit };
        const result = await postService.getFilteredPost(payload, tap);
        res.status(201).json(result);
    } catch (error) {
        console.error('Error get post:', error);
        res.status(500).json({ error: 'Error get post' });
    }
});
router.post('/api/post/:id/comment', async (req, res) => {//postId, userId,text,tap
    try {
        const postId = req.params.id;
        const userId = req.body.userId;
        const text = req.body.text;
        const tap = req.body.tap; //review인지 matching인지 구분    
        if (!postId ||!tap ||!userId ||!text) {
            return res.status(400).json({ error: 'Missing required fields' });
        }
        payload = {postId,userId,text}
        const result = await postService.updateComment(payload, tap);
        res.status(201).json(result);
    } catch (error) {
        console.error('Error creating post:', error);
        res.status(500).json({ error: 'Error creating post' });
    }
});
router.get('/api/post/:id/views', async (req, res) => { //postId tap
    try {
        const postId = req.params.id
        const tap = req.body.tap;
        if (!postId||!tap) {
            return res.status(400).json({ error: 'Missing required query parameters' });
        }
        const result = await postService.updateView(postId, tap);
        res.status(201).json(result);
    } catch (error) {
        console.error('Error get post:', error);
        res.status(500).json({ error: 'Error get post' });
    }
});
module.exports = router;