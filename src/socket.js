module.exports = (io) => {
    io.on('connection', (socket) => {
        console.log(`Socket connected: ${socket.id}`);

        // 사용자가 특정 채팅방에 참여
        socket.on('joinRoom', (roomName) => {
            socket.join(roomName);
            console.log(`User ${socket.id} joined room: ${roomName}`);
        });

        // 메시지 수신 및 해당 채팅방에 전송
        socket.on('sendMessage', (data) => {
            // data: { roomName: '...', message: '...', sender: '...' }
            io.to(data.roomName).emit('receiveMessage', data);
        });

        // 연결 종료 처리
        socket.on('disconnect', () => {
            console.log(`Socket disconnected: ${socket.id}`);
        });

        // 기타 필요한 채팅 관련 이벤트들...
        // ex) socket.on('typing', (data) => { ... });
    });
};