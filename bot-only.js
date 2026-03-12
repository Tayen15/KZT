require('dotenv').config();
const { Client, Collection, GatewayIntentBits, Partials } = require('discord.js');

console.log('🤖 Starting ByteBot (Bot Only Mode)...');

// Create Discord client
const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent,
        GatewayIntentBits.GuildMembers,
        GatewayIntentBits.GuildVoiceStates,
        GatewayIntentBits.DirectMessages
    ],
    partials: [Partials.Channel, Partials.Message]
});

// Initialize commands collection
client.commands = new Collection();

// Load handlers
require('./handlers/eventHandler')(client);
require('./handlers/slashCommandHandler')(client);

// Initialize other handlers
const prayerTime = require('./handlers/prayerTime');
const monitorServer = require('./handlers/monitorServer');
const lofiReconnect = require('./handlers/lofiReconnect');

// Login to Discord
client.login(process.env.DISCORD_TOKEN)
    .then(() => {
        console.log('✅ Bot logged in successfully!');
    })
    .catch(err => {
        console.error('❌ Failed to login:', err);
        process.exit(1);
    });

// When bot is ready, start handlers
client.once('ready', async () => {
    console.log('🚀 Bot is ready!');
    
    // Start prayer time monitoring
    try {
        await prayerTime.initializePrayerMonitoring(client);
        console.log('✅ Prayer time monitoring initialized');
    } catch (error) {
        console.error('❌ Failed to initialize prayer monitoring:', error);
    }
    
    // Start server monitoring
    try {
        await monitorServer.initializeServerMonitoring(client);
        console.log('✅ Server monitoring initialized');
    } catch (error) {
        console.error('❌ Failed to initialize server monitoring:', error);
    }
    
    // Start lofi reconnect handler
    try {
        await lofiReconnect.initializeLofiReconnect(client);
        console.log('✅ Lofi reconnect handler initialized');
    } catch (error) {
        console.error('❌ Failed to initialize lofi reconnect:', error);
    }
});

// Global error handlers
process.on('unhandledRejection', error => {
    console.error('❌ Unhandled promise rejection:', error);
});

process.on('uncaughtException', error => {
    console.error('❌ Uncaught exception:', error);
    process.exit(1);
});

// Graceful shutdown
process.on('SIGINT', async () => {
    console.log('⚠️  SIGINT received, shutting down gracefully...');
    await client.destroy();
    process.exit(0);
});

process.on('SIGTERM', async () => {
    console.log('⚠️  SIGTERM received, shutting down gracefully...');
    await client.destroy();
    process.exit(0);
});

module.exports = client;
