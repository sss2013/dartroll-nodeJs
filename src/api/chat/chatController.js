const chatService = require('./chatService');
const express = require('express');
const router = express.Router();
const authenticateToken = require('../../middleware/authenticateToken');

//특정 사용자와의 채팅방 생성 또는 기존 채팅방 조회
router.post('/',authenticateToken, async (req, res,next) => {
    try{
        const currentUserId = req.user.id;
        const {otherUserId} = req.body;
        if (!otherUserId) {
            return res.status(400).json({ error: '상대방 아이디가 필요합니다.' });
        }  
        const room = await chatService.findOrCreateRoom([currentUserId, otherUserId]);
        return res.status(200).json(room);
    } catch(error){
        next(error);
    }
});

// 내 채팅방 목록 가져오기
router.get('/', authenticateToken, async (req, res, next) => {
    try {
        const userId = req.user.id;
        const rooms = await chatService.getRoomsForUser(userId);
        return res.status(200).json(rooms);
    } catch (error) {
        next(error);
    }
});

// 특정 채팅방의 메시지 내역 가져오기
router.get('/:roomId/messages', authenticateToken, async (req, res, next) => {
    try {
        const { roomId } = req.params;
        const page = parseInt(req.query.page || '0', 10);
        const limit = parseInt(req.query.limit || '50', 10);

        // TODO: 사용자가 이 채팅방의 참여자인지 확인하는 로직 추가

        const messages = await chatService.getMessagesForRoom(roomId, { page, limit });
        res.status(200).json(messages.reverse()); // 오래된 메시지부터 보여주기 위해 배열 뒤집기
    } catch (error) {
        next(error);
    }
});

module.exports =   router;