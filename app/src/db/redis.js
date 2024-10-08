import redis from 'redis';

const client = redis.createClient({
    url: `redis${process.env.REDIS_SECURE === 'true' ? 's' : ''}://
        ${process.env.REDIS_USER}:${process.env.REDIS_SECRET}@
        ${process.env.REDIS_HOST}:${process.env.REDIS_PORT}`
});

client.on('connect', () => console.log('Connected to Redis'));
client.on('ready', () => console.log('Redis is ready'));
client.on('error', err => console.error('Redis Client Error', err));

client.connect();

export default client;