const express = require('express');
const dotenv = require('dotenv');
const cors = require('cors');

// 1. 초기화 및 설정
dotenv.config();
const app = express();

// 2. 라우터 import
const authRouter = require('./src/api/auth/authController');
const eventRouter = require('./src/api/event/eventRouter');
const postRouter = require('./src/api/posts/postRouter'); // 위치 이동
const userRouter = require('./src/api/user/userController');
const syncRoutes = require('./src/api/sync/syncRoute');

// 3. DB 및 클라이언트 연결 함수 import
const { connectMongo } = require('./src/config/mongoClient');
const { connectRedis, quitRedis } = require('./src/config/redisClient');

// 4. 미들웨어 설정
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// 5. 라우터 등록 (한 곳에서 모두 등록)
app.use(authRouter);
app.use(eventRouter);
app.use(userRouter);
app.use('/api/sync', syncRoutes);
app.use(postRouter); // 다른 라우터들과 함께 등록

// 6. 서버 시작 로직
async function startServer() {
    try {
        // --- 연결 우선 ---
        // 모든 DB 연결이 완료될 때까지 기다립니다.
        // Promise.all을 사용해 두 연결을 병렬로 시도하여 약간의 시간 절약 가능.
        await Promise.all([
            connectMongo(),
            connectRedis()
        ]);
        console.log('Successfully connected to MongoDB and Redis!');

        // --- 서버 시작 ---
        // 모든 연결이 성공한 후에만 서버를 시작합니다.
        const PORT = process.env.PORT || 3000;
        const server = app.listen(PORT, () => {
            console.log(`Server is running on port ${PORT}`);
        });

        // --- 정상 종료(Graceful Shutdown) 설정 ---
        const shutdown = async () => {
            console.log('Shutting down server...');
            server.close(() => {
                // Redis 연결만 종료합니다. Mongoose는 보통 명시적으로 닫지 않아도 됩니다.
                quitRedis().then(() => {
                    console.log('Redis connection closed.');
                    process.exit(0);
                });
            });

            // 강제 종료 타임아웃
            setTimeout(() => {
                console.warn('Forcing shutdown...');
                process.exit(1);
            }, 10000);
        };

        process.on('SIGINT', shutdown); // Ctrl+C
        process.on('SIGTERM', shutdown); // Render 등 플랫폼의 종료 신호

    } catch (error) {
        console.error('Failed to start server:', error);
        process.exit(1); // 시작 중 에러 발생 시 프로세스 종료
    }
}

// 서버 시작!
startServer();