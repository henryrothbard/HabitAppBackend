import { createClient } from "redis";

const redisClient = createClient({
    password: process.env.REDIS_SECRET,
    socket: {
        host: process.env.REDIS_HOST,
        port: process.env.REDIS_PORT,
    }
});

redisClient.on('connect', () => console.log('Connected to Redis'));
redisClient.on('ready', () => console.log('Redis is ready'));
redisClient.on('error', err => console.error('Redis Client Error: ', err));

redisClient.connect();

export default redisClient;