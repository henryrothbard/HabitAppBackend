import express from 'express';
import logger, { logToFile, logToConsole, defaultFormat } from './middleware/logger.js';
import sessionMiddleware from './middleware/session.js';
import API from './routes/api.js';

const app = express();

app.use(logger(
    logToConsole(defaultFormat),
    logToFile(defaultFormat, './logs/http.log', { writeSeconds: 60, numLogs: 5 }),
));

app.use(express.json());

app.use(sessionMiddleware());

app.use('/api', API);

app.use((req, res, next) => {
    res.status(404).send();
});

app.use((err, req, res, next) => {
    req.err = '\n - Uncaught Error: ' + err.stack;
    res.status(500).send();
});

export default app;