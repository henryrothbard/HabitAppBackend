import express from 'express';
import cookieParser from 'cookie-parser'
import HTTPLogger, { defaultHTTPFormat, logToFile, logToConsole } from './middleware/httpLogger.js';
import sessionMiddleware from './middleware/session.js';
import auth from './routes/auth.js';

const app = express();

app.use(HTTPLogger(
    logToConsole(defaultHTTPFormat),
    logToFile(defaultHTTPFormat, './logs/http.log', { writeSeconds: 60, numLogs: 5 }),
));

app.use(express.json());

app.use(cookieParser())

app.use(sessionMiddleware());

app.get('/test', (req, res) => res.send('Hi there!'))

app.use('/auth', auth);

app.use((req, res, next) => {
    res.status(404).send();
});

app.use((err, req, res, next) => {
    req.err = '\n - Uncaught Error: ' + err.stack;
    res.status(500).send();
});

export default app;