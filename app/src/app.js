import express from 'express';
import logger, { logToFile, logToConsole, defaultFormat } from './middleware/logger.js';
import sessionMiddleware from './middleware/session.js';

const app = express();

app.use(logger(
    logToConsole(defaultFormat),
    logToFile(defaultFormat, './logs/http.log', { writeSeconds: 60, numLogs: 5 }),
));

app.use(sessionMiddleware());

app.get('/api/', (req, res) => res.send('hello'));

app.use((req, res, next) => {
    res.status(404).send();
});

app.use((err, req, res, next) => {
    req.err = '\n - Uncaught Error: ' + err.stack;
    res.status(500).send();
});

export default app;