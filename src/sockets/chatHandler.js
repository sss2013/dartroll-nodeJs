const chatService = require('../api/chat/chatService');

module.exports = (io) => {
    io.on('connection', (socket) => {
        console.log(`Socket connected: ${socket.id}`);


        socket.on('joinRoom', (roomId) => {
            socket.join(roomId);
            console.log(`User ${socket.id} joined room: ${roomId}`);
        });

        // 메시지 수신 및 해당 채팅방에 전송
        socket.on('sendMessage', async (data) => {
            // data: { roomId: '...', message: '...', sender: '...' }
            try {
                const savedMessage = await chatService.saveMessage(data.roomId, data.senderId, data.content);
                io.to(data.roomId).emit('receiveMessage', savedMessage);
            } catch (error) {
                console.error('Error saving or emitting message:', error);
                socket.emit('messageError', { message: '메시지 전송 실패' });
            }
        });

        // 연결 종료 처리
        socket.on('disconnect', () => {
            console.log(`Socket disconnected: ${socket.id}`);
        });

    });
};