const HTTPLogger = (...streams) => (req, res, next) => {
    if (!streams) throw new TypeError('Streams must exist for logger');

    const start = process.hrtime();
    const timestamp = new Date();

    const log = (err) => {
        const [seconds, nanoseconds] = process.hrtime(start);
        const elapsedTime = (seconds * 1000) + (nanoseconds / 1e6);

        const logEntry = {
            timestamp,
            url: req.url,
            method: req.method,
            status: res.statusCode,
            time: elapsedTime,
            err: req.err || null,
            len: res.getHeader('Content-Length') || 0,
            req,
            res,
        };
        
        streams.map((s, i) => {
            try {
                s(logEntry);
            } catch (error) {
                console.warn('Error writing log to stream ', i, ': ', error);
            }
        });
    }

    res.on('finish', log);

    next();
};

export const defaultHTTPFormat = (log) => {
    return `${log.err ? '[ERROR] ' : ''}[${log.timestamp.toISOString()}] ${log.status} ${log.method} '${log.url}' ${log.time}ms ${log.err || ''}`;
}

export default HTTPLogger;
export * from '../utils/logger.js';