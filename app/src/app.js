import express from 'express';
import cookieParser from 'cookie-parser'
import HTTPLogger, { defaultHTTPFormat, logToFile, logToConsole } from './middleware/httpLogger.js';
import sessionMiddleware from './middleware/session.js';
import auth from './routes/auth.js';
import habits from './routes/habits.js';

const app = express();

app.set('trust proxy', 1);

app.use(HTTPLogger(
    logToConsole(defaultHTTPFormat),
    logToFile(defaultHTTPFormat, './logs/http.log', { writeSeconds: 60, numLogs: 5 }),
));

app.use(express.json());

app.use(cookieParser())

app.use(sessionMiddleware());

app.use('/auth', auth);
app.use('/habits', habits);

app.use((req, res, next) => {
    res.status(404).send();
});

app.use((err, req, res, next) => {
    req.err = '\n - Uncaught Error: ' + err.stack;
    res.status(500).send();
});

export default app;