const fs = require('fs');
const path = require('path');
const util = require('util');

const logsDir = path.join(__dirname, '..', 'logs');
if (!fs.existsSync(logsDir)) {
    fs.mkdirSync(logsDir, { recursive: true });
}

global.recentLogs = [];
const MAX_MEMORY_LOGS = 200;

function getLogFilename() {
    const date = new Date().toISOString().split('T')[0];
    return path.join(logsDir, `${date}.log`);
}

function addLog(level, args) {
    const timestamp = new Date().toISOString();
    const msg = util.format(...args);
    const logLine = `[${timestamp}] [${level}] ${msg}`;
    
    // Store in memory for Live Console frontend
    global.recentLogs.push({ timestamp, level, message: msg });
    if (global.recentLogs.length > MAX_MEMORY_LOGS) {
        global.recentLogs.shift();
    }

    // Append into daily file archive
    try {
        fs.appendFileSync(getLogFilename(), logLine + '\n');
    } catch (e) {
        // silent fail on file locked to prevent crashing
    }
}

// Override original consoles
const originalLog = console.log;
const originalError = console.error;
const originalWarn = console.warn;
const originalInfo = console.info;

console.log = function(...args) { 
    addLog('INFO', args); 
    originalLog.apply(console, args); 
};
console.info = function(...args) { 
    addLog('INFO', args); 
    originalInfo.apply(console, args); 
};
console.error = function(...args) { 
    addLog('ERROR', args); 
    originalError.apply(console, args); 
};
console.warn = function(...args) { 
    addLog('WARN', args); 
    originalWarn.apply(console, args); 
};

console.log('✅ Custom Logger initialized natively.');
module.exports = {};
