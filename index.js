require('./deploy-commands.js');
require('dotenv').config();
const { Client, GatewayIntentBits, Collection } = require('discord.js');

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
