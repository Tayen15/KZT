require('dotenv').config();

// Start Discord bot
const client = require('./index.js');

// Wait for bot to be ready, then connect to web server
client.once('ready', () => {
    console.log('✅ Discord bot is ready');
    
    // Try to connect to web server
    try {
        const app = require('./server.js');
        app.setDiscordClient(client);
    } catch (error) {
        console.log('⚠️ Web server not available yet, will connect when ready');
    }
});

// Start web server after a short delay
setTimeout(() => {
    require('./server.js');
}, 2000);

module.exports = client;
