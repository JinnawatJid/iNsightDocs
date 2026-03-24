const winston = require('winston');
require('winston-daily-rotate-file');
const path = require('path');
const fs = require('fs');

// Determine the persistent log directory
// 1. Prioritize environment variable if set.
// 2. Default to '../../logs' (which resolves to backend/logs when running locally, or persistent outside release)
const logDir = process.env.LOG_DIR || path.join(__dirname, '../../logs');

// Ensure the directory exists
if (!fs.existsSync(logDir)) {
    fs.mkdirSync(logDir, { recursive: true });
}

const { combine, timestamp, printf, json, colorize, errors } = winston.format;

// Format for console (easy to read)
const consoleFormat = combine(
    colorize(),
    timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
    printf(({ level, message, timestamp, stack }) => {
        return `${timestamp} ${level}: ${stack || message}`;
    })
);

// Format for files (structured JSON for log aggregators)
const fileFormat = combine(
    timestamp(),
    errors({ stack: true }), // Ensure stack traces are captured
    json()
);

// Create the logger instance
const logger = winston.createLogger({
    level: process.env.NODE_ENV === 'production' ? 'info' : 'debug',
    format: fileFormat,
    defaultMeta: { service: 'credit-request-backend' },
    transports: [
        //
        // - Write all logs with level `error` and below to `error-%DATE%.log`
        //
        new winston.transports.DailyRotateFile({
            filename: path.join(logDir, 'error-%DATE%.log'),
            datePattern: 'YYYY-MM-DD',
            level: 'error',
            maxSize: '20m',
            maxFiles: '14d',
            zippedArchive: true, // Compress old logs
        }),
        //
        // - Write all logs with level `info` and below to `combined-%DATE%.log`
        //
        new winston.transports.DailyRotateFile({
            filename: path.join(logDir, 'combined-%DATE%.log'),
            datePattern: 'YYYY-MM-DD',
            maxSize: '20m',
            maxFiles: '14d',
            zippedArchive: true,
        }),
    ],
});

//
// If we're not in production then log to the `console` with the custom format
//
if (process.env.NODE_ENV !== 'production') {
    logger.add(new winston.transports.Console({
        format: consoleFormat,
    }));
}

// Create a stream object with a 'write' function that will be used by `morgan`
logger.stream = {
    write: function(message, encoding) {
        // use the 'info' log level so the output will be picked up by both transports
        // Morgan outputs with a trailing newline, so we remove it
        logger.info(message.trim());
    },
};

module.exports = logger;
