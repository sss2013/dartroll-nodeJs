const express = require('express');
const app = express();

const cors = require('cors');
const authRouter = require('./src/api/auth/authController');
const eventRouter = require('./src/api/event/eventRouter');
const { client: redisClient, connectRedis, quitRedis } = require('./src/config/redisClient');

app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(authRouter);
app.use(eventRouter);

async function startServer() {
    try {
        await connectRedis();
        const PORT = process.env.PORT || 3000;
        const server = app.listen(PORT, () => {
            console.log(`Server is running on port ${PORT}`);
        });

        const shutdown = async () => {
            console.log('Shutting down server...');
            server.close(async () => {
                await quitRedis();
                process.exit(0);
            });

            setTimeout(() => {
                console.warn('Forcing shutdown...');
                process.exit(1);
            }, 10000);
        };

        process.on('SIGINT', shutdown);
        process.on('SIGTERM', shutdown);
    } catch (error) {
        console.error('Error starting server:', error);
        process.exit(1);
    }
}
startServer();