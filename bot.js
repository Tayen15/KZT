require('dotenv').config();

// Start Discord bot
const client = require('./index.js');

// Start web server immediately (express listen), then inject Discord client when ready
const app = require('./server.js');

client.once('ready', () => {
    console.log('✅ Discord bot is ready');
    app.setDiscordClient(client);
});

module.exports = client;
