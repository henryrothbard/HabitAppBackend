import dotenv from 'dotenv';
dotenv.config();

import { cleanupLogs } from './middleware/logger.js';

import app from './app.js';

const PORT = process.env.PORT;

app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});

const gracefulShutdown = () => {
    console.log('\nShutting down...');

    cleanupLogs();
    console.log(' - Logs saved...');

    console.log('Done!');

    process.exit(0);
};

process.on('SIGINT', gracefulShutdown);
process.on('SIGTERM', gracefulShutdown);