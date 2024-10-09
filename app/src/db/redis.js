import { createClient } from "redis";

const redisClient = createClient({
    url: `redis${process.env.REDIS_SECURE === 'true' ? 's' : ''}://` + 
        `${process.env.REDIS_HOST}:${process.env.REDIS_PORT || 6379}`,
});

redisClient.on('connect', () => console.log('Connected to Redis'));
redisClient.on('ready', () => console.log('Redis is ready'));
redisClient.on('error', err => console.error('Redis Client Error: ', err));

redisClient.connect();

export default redisClient;