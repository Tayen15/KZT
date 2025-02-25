require('dotenv').config();
const { Client, GatewayIntentBits, Collection } = require('discord.js');
const express = require('express');
const path = require('path');

const app = express();
const token = process.env.token;

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

app.use(express.static(path.join(__dirname, 'public')));

app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'views', 'home.html'));
});

app.listen(3000, () => console.log('🌐 Web server running on port 3000'));

// Load Handlers
['commandHandler', 'eventHandler'].forEach(handler => {
    require(`./handlers/${handler}`)(client);
});

client.login(token).catch(() => console.log('❌ Invalid TOKEN!'));
