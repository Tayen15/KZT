require('dotenv').config();
// Conditional slash command deployment
const shouldDeploy = (process.env.DEPLOY_COMMANDS || 'true').toLowerCase() === 'true';
if (shouldDeploy) {
    try {
        require('./deploy-commands.js');
    } catch (e) {
        console.warn('⚠️  Failed to run deploy-commands.js:', e.message);
    }
} else {
    console.log('⏭️  Skipping slash command deployment (DEPLOY_COMMANDS=false)');
}
const { Client, GatewayIntentBits, Collection } = require('discord.js');

const isDev = process.env.NODE_ENV === 'development';
if (isDev) {
    console.log('🔧 Running in DEVELOPMENT mode');
} else {
    console.log('🚀 Running in PRODUCTION mode');
}

const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.GuildMembers,
        GatewayIntentBits.MessageContent,
        GatewayIntentBits.GuildVoiceStates
    ],
});

client.commands = new Collection();
['slashCommandHandler', 'eventHandler'].forEach(handler => {
    require(`./handlers/${handler}`)(client);
});

client.login(process.env.DISCORD_TOKEN || process.env.token).catch(() => console.log('❌ Invalid TOKEN!'));

// Export client for use in web server
module.exports = client;
