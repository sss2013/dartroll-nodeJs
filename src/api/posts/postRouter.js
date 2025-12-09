const express = require('express');
const router = express.Router();
const postService = require('./postService');
const authenticateToken = require('../../middleware/authenticateToken');

router.post('/api/post/upload',authenticateToken, async (req, res) => {
    try {
        const user = req.user;
        const title = req.body.title;
        const userId = user.id;
        const area = req.body.area;
        const genre = req.body.genre;
        const content = req.body.content;
        const url = req.body.url;
        const tap = req.body.tap; //review인지 matching인지 구분  
        if (!user || !user.id) return res.status(401).json({ error: 'unauthorized' });  
        if (!title || !area || !genre || !content || !url || !tap) {
            return res.status(400).json({ error: 'Missing required fields' });
        }
        const payload = { title, area, genre, content, url,userId };
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
//댓글 작성
router.post('/api/post/:id/comment',authenticateToken, async (req, res) => {//postId, userId,text,parentId
    try {
        const user = req.user;
        const userId = user.id;
        if (!user || !user.id) return res.status(401).json({ error: 'unauthorized' });
        const postId = req.params.id;
        const text = req.body.text;
        const parentId = req.body.parentId || null; 
        if (!postId ||!userId ||!text) {
            return res.status(400).json({ error: 'Missing required fields' });
        }
        const payload = {postId,userId,text,parentId}
        const result = await postService.createComment(payload);
        res.status(201).json(result);
    } catch (error) {
        console.error('Error creating comment:', error);
        res.status(500).json({ error: 'Error creating comment' });
    }
});
//댓글 가져오기
router.get('/api/post/:id/comment', async (req, res) => {//postId
    try {
        const postId = req.params.id;
        if (!postId) {
            return res.status(400).json({ error: 'Missing required fields' });
        }
        const payload = {postId}
        const result = await postService.getComment(payload);
        res.status(201).json(result);
    } catch (error) {
        console.error('Error get comment:', error);
        res.status(500).json({ error: 'Error get comment' });
    }
});

//view 증가
router.get('/api/post/:id/views', async (req, res) => { //postId tap
    try {
        const postId = req.params.id
        const tap = req.query.tap;
        if (!postId||!tap) {
            return res.status(400).json({ error: 'Missing required query parameters' });
        }
        const result = await postService.updateView(postId, tap);
        res.status(200).json(result);
    } catch (error) {
        console.error('Error get post:', error);
        res.status(500).json({ error: 'Error get post' });
    }
});

//댓글 삭제
router.post('/api/post/:id/commentdelete',authenticateToken, async (req, res) => {//_id(댓글), userId
    try {
        const user = req.user;
        const userId = user.id;
        if (!user || !user.id) return res.status(401).json({ error: 'unauthorized' });
        const id = req.params.id;
        if (!id) {
            return res.status(400).json({ error: 'Missing required fields' });
        }
        const payload = {id,userId}
        const result = await postService.deleteComment(payload);
        res.status(200).json(result);
    } catch (error) {
        console.error('Error deleting comment:', error);
        const status = error.status || 500;
        res.status(status).json({ error: error.message || 'Error deleting comment' });
    }
});
//게시글 삭제
router.post('/api/post/:id/postdelete',authenticateToken, async (req, res) => {//postId, userId
    try {
        const user = req.user;
        const userId = user.id;
        if (!user || !user.id) return res.status(401).json({ error: 'unauthorized' });
        const id = req.params.id;
        const tap = req.body.tap;
        if (!id ||!userId ||!tap) {
            return res.status(400).json({ error: 'Missing required fields' });
        }
        const payload = {id,userId}
        const result = await postService.deletePost(payload,tap);
        res.status(201).json(result);
    } catch (error) {
        console.error('Error deleting post:', error);
        const status = error.status || 500;
        res.status(status).json({ error: error.message || 'Error deleting comment' });
    }
});

//게시글 수정
router.post('/api/post/:id/postmodify',authenticateToken, async (req, res) => {//postId, userId
    try {
        const id = req.params.id;
        const user = req.user;
        const userId = user.id;
        if (!user || !user.id) return res.status(401).json({ error: 'unauthorized' });
        const tap = req.body.tap;
        const content = req.body.content;
        if (!id ||!userId ||!tap||!content) {
            return res.status(400).json({ error: 'Missing required fields' });
        }
        const payload = {id,userId,content}
        const result = await postService.modifyPost(payload,tap);
        res.status(201).json(result);
    } catch (error) {
        console.error('Error modify post:', error);
        const status = error.status || 500;
        res.status(status).json({ error: error.message || 'Error modify post' });
    }
});
//게시글 하나 가져오기
router.get('/api/post/:id', async (req, res) => {//postId
    try {
        const postId = req.params.id;
        const tap = req.query.tap;
        if (!postId||!tap) {
            return res.status(400).json({ error: 'Missing required fields' });
        }
        const payload = {postId}
        const result = await postService.getOne(payload,tap);
        res.status(201).json(result);
    } catch (error) {
        console.error('Error get comment:', error);
        res.status(500).json({ error: 'Error get post' });
    }
});
//게시글 신고
router.post('/api/post/:id/report', authenticateToken,async (req, res) => { //postId, userId, tap
    try {
        const user = req.user;
        const userId = user.id;
        if (!user || !user.id) return res.status(401).json({ error: 'unauthorized' });
        const postId = req.params.id
        const tap = req.body.tap;
        if (!postId||!tap) {
            return res.status(400).json({ error: 'Missing required query parameters' });
        }
        const payload = {userId,postId}
        const result = await postService.reportPost(payload, tap);
        res.status(200).json(result);
    } catch (error) {
        console.error('Error report post:', error);
        res.status(500).json({ error: 'Error report post' });
    }
});
//게시글 좋아요
router.post('/api/post/:id/like', authenticateToken,async (req, res) => { //postId, userId, tap
    try {
        const user = req.user;
        const userId = user.id;
        if (!user || !user.id) return res.status(401).json({ error: 'unauthorized' });
        const postId = req.params.id
        const tap = req.body.tap;
        if (!postId||!tap) {
            return res.status(400).json({ error: 'Missing required query parameters' });
        }
        const payload = {userId,postId}
        const result = await postService.likePost(payload, tap);
        res.status(200).json(result);
    } catch (error) {
        console.error('Error report post:', error);
        res.status(500).json({ error: 'Error report post' });
    }
});
//댓글 신고
router.post('/api/post/:id/commentreport', authenticateToken,async (req, res) => { //postId, userId, tap
    try {
        const user = req.user;
        const userId = user.id;
        if (!user || !user.id) return res.status(401).json({ error: 'unauthorized' });
        const commentId = req.params.id
        if (!commentId) {
            return res.status(400).json({ error: 'Missing required query parameters' });
        }
        const payload = {userId,commentId}
        const result = await postService.reportComment(payload);
        res.status(200).json(result);
    } catch (error) {
        console.error('Error report post:', error);
        res.status(500).json({ error: 'Error report post' });
    }
});
//댓글 좋아요
router.post('/api/post/:id/commentlike', authenticateToken,async (req, res) => { //postId, userId, tap
    try {
        const user = req.user;
        const userId = user.id;
        if (!user || !user.id) return res.status(401).json({ error: 'unauthorized' });
        const commentId = req.params.id
        if (!commentId) {
            return res.status(400).json({ error: 'Missing required query parameters' });
        }
        const payload = {userId,commentId}
        const result = await postService.likeComment(payload);
        res.status(200).json(result);
    } catch (error) {
        console.error('Error report post:', error);
        res.status(500).json({ error: 'Error report post' });
    }
});
//댓글 수정
router.post('/api/post/:id/commentmodify',authenticateToken, async (req, res) => {//댓글Id, userId
    try {
        const id = req.params.id;
        const user = req.user;
        const userId = user.id;
        if (!user || !user.id) return res.status(401).json({ error: 'unauthorized' });
        const text = req.body.text;
        if (!id ||!text) {
            return res.status(400).json({ error: 'Missing required fields' });
        }
        const payload = {id,userId,text}
        const result = await postService.modifyComment(payload);
        res.status(201).json(result);
    } catch (error) {
        console.error('Error modify comment:', error);
        const status = error.status || 500;
        res.status(status).json({ error: error.message || 'Error modify comment' });
    }
});
module.exports = router;