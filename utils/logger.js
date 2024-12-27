// utils\logger.js

// Utility to log messages to different log files based on log level

const fs = require('fs');
const path = require('path');

// Create logs directory if it doesn't exist
const logsDir = path.join(__dirname, '../logs');
if (!fs.existsSync(logsDir)) {
    fs.mkdirSync(logsDir);
}

// Create separate log files for different log levels
const errorLog = fs.createWriteStream(path.join(logsDir, 'error.log'), { flags: 'a' });
const accessLog = fs.createWriteStream(path.join(logsDir, 'access.log'), { flags: 'a' });
const warnLog = fs.createWriteStream(path.join(logsDir, 'warn.log'), { flags: 'a' });

// Simple logging levels: info, warn, error
const logger = {
    error: (message, metadata = {}) => {
        const timestamp = new Date().toISOString();
        const logMessage = `${timestamp} ERROR: ${message} ${JSON.stringify(metadata)}\n`;
        errorLog.write(logMessage);
        console.error(logMessage);
    },
    
    warn: (message, metadata = {}) => {
        const timestamp = new Date().toISOString();
        const logMessage = `${timestamp} WARN: ${message} ${JSON.stringify(metadata)}\n`;
        warnLog.write(logMessage);
        console.warn(logMessage);
    },
    
    info: (message) => {
        const timestamp = new Date().toISOString();
        const logMessage = `${timestamp} INFO: ${message}\n`;
        accessLog.write(logMessage);
        console.log(logMessage);
    }
};

module.exports = logger;
