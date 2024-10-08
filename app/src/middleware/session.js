import session from "express-session";
import RedisStore from "connect-redis";
import { createClient } from "redis";

const redisClient = createClient({
    url: `redis${process.env.REDIS_SECURE === 'true' ? 's' : ''}://` + 
        `${process.env.REDIS_HOST}:${process.env.REDIS_PORT || 6379}`,
});

redisClient.on('connect', () => console.log('Connected to Redis'));
redisClient.on('ready', () => console.log('Redis is ready'));
redisClient.on('error', err => console.error('Redis Client Error: ', err));

redisClient.connect();

const sessionMiddleware = () => session({
    store: new RedisStore({ client: redisClient }),
    secret: process.env.SESSION_SECRET,
    resave: false,
    saveUninitialized: false,
    rolling: true,
    cookie: {
        secure: (process.env.ENV === 'production'),
        httpOnly: true,
        maxAge: 3 * 60 * 60 * 1000,
    }
});

export default sessionMiddleware;