import fs from 'fs'
import path from 'path';
import gzip from '../utils/gzip.js'

const streamsCleanup = [];

const addCleanup = (cleanup) => {
    streamsCleanup.push(cleanup);
}

const cleanupLogs = () => {
    streamsCleanup.map((cleanup, i) => {
        try {
            cleanup();
        } catch (err) {
            console.error('Error cleaning up log stream: ', err);
        }
    });
};

const Logger = (...streams) => {
    if (!streams) throw new TypeError('Streams must exist for logger');

    const log = (log, level='') => {
        const logEntry = {
            timestamp: new Date(),
            log: log,
            level: level,
        };

        streams.map((s, i) => {
            try {
                s(logEntry);
            } catch (error) {
                console.warn('Error writing log to stream ', i, ': ', error);
            }
        });
    };

    return {
        error: (x) => log(x, 'ERROR'),
        warn: (x) => log(x, 'WARN'),
        log,
    }
}

const defaultFormat = (log) => {
    return `${log.level ? `[${log.level}] ` : ''}[${log.timestamp}] ${log.log}`;
}

const logToFile = (formatter, _logPath, {separator='\n', writeSeconds=60, maxSizeMB=10, numLogs=10}) => {
    const logPath = path.resolve(_logPath)
    fs.mkdirSync(path.dirname(logPath), { recursive: true });
    let buffer = '';

    const rotateLog = () => {
        if (!fs.existsSync(logPath)) return;
        if (fs.existsSync(logPath+(numLogs-1)+'.gz')) fs.unlink(logPath+(numLogs-1)+'.gz', ()=>{});
        for (let i = numLogs-2; i >= 0; i--) {
            if (i == 0) gzip(logPath, logPath + (i + 1) + '.gz', true);
            else if (!fs.existsSync(logPath+(i)+'.gz')) continue;
            else fs.renameSync(logPath + i + '.gz', logPath + (i + 1) + '.gz');
        }
    };

    const writeBuffer = () => {
        fs.appendFile(logPath, buffer, err => err && console.warn('Error writing to log: ', err));
        buffer = '';
        fs.existsSync(logPath) && fs.stat(logPath, (err, stats) => {
            if (err) console.warn('Error recieving log file stats: ', err);
            else if (stats.size >= maxSizeMB * 1E6) rotateLog();
        });
    };

    rotateLog();
    addCleanup(() => fs.appendFileSync(logPath, buffer));

    return (log) => {
        if (buffer.length === 0) setTimeout(writeBuffer, writeSeconds * 1000)
        buffer += formatter(log) + separator;
    };
};

const logToConsole = (formatter) => {
    return (log) => {
        if (log.status < 400) console.log(formatter(log));
        else if (log.status < 500) console.warn(formatter(log));
        else console.error(formatter(log));
    };
};

export default Logger;
export { 
    logToFile, 
    logToConsole,
    cleanupLogs, 
    defaultFormat,
    addCleanup,
};