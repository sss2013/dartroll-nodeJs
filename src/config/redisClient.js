const redis = require('redis');
const dotenv = require('dotenv');
dotenv.config();

const redisClient = redis.createClient({
    url: `redis://${process.env.REDIS_USERNAME}:${process.env.REDIS_PASSWORD}@${process.env.REDIS_HOST}:${process.env.REDIS_PORT}/0`,
    legacyMode: false
});

redisClient.on('connect', () => {
    console.log('Redis client connected!');
});

redisClient.on('error', (err) => {
    console.error('Redis Client Error', err);
});

async function connectRedis() {
    if (!redisClient.isOpen) {
        await redisClient.connect();
        console.log('Connected to Redis');
    }
}

// 안전하게 종료
async function quitRedis() {
    try {
        if (redisClient.isOpen) {
            await redisClient.quit();
            console.log('Redis connection closed');
        }
    } catch (err) {
        console.error('Error while quitting Redis', err);
    }
}

redisClient.connect().catch(err => console.error('Redis connect error', err));
// 불필요한 .v4 사용 제거 — client(=redisClient)를 직접 사용하세요
const redisCli = redisClient;
module.exports = {
    redisClient,
    connectRedis,
    quitRedis
};