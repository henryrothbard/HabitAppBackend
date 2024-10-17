import session from "express-session";
import RedisStore from "connect-redis";
import redisClient from "../db/redis.js";

const sessionMiddleware = () => session({
    store: new RedisStore({ client: redisClient }),
    secret: process.env.SESSION_SECRET,
    resave: false,
    saveUninitialized: false,
    rolling: true,
    cookie: {
        httpOnly: true,
        secure: true,
        sameSite: 'Strict',
        maxAge: 3 * 60 * 60 * 1000,
    }
});

export default sessionMiddleware;