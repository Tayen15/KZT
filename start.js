require('dotenv').config();

// Start web server in child process
require('child_process').spawn('node', ['server.js'], { stdio: 'inherit' });

// Start Discord bot
const bot = require('./index.js');

// Export bot client for use in other modules
module.exports = bot;
