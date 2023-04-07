const { Client, GatewayIntentBits, Collection, Events } = require('discord.js')
const fs = require('fs')

const { Player } = require('discord-player')

const express = require('express');

const app = express();

app.get('/views/home.html', (req, res) => {
    
});

app.listen(300, () => {
    console.log('server started')
});

require('dotenv').config()
const token = process.env.DISCORD_TOKEN;

const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.GuildMembers,
        GatewayIntentBits.MessageContent,
        GatewayIntentBits.GuildVoiceStates
    ],
});

const player = new Player(client)

client.player = player;
client.commands = new Collection();


fs.readdirSync('./commands').forEach(dirs => {
    const commands = fs.readdirSync(`./commands/${dirs}`).filter((files) => files.endsWith('.js'));

    for (const file of commands) {
        const command = require(`./commands/${dirs}/${file}`);
        if ('data' in command && 'execute' in command) {
            client.commands.set(command.data.name, command);
            if (command.data.name) {
                console.log(`Command: ${command.data.name} - ${command.category} Category Load.`);
            } else {
                console.log(`${file} - is missing a help.name, or content.`);
            }
        } else {
            console.log(`[WARNING] The command at ${dirs} is missing a required "data" or "execute" property.`);
        }
    };
});

const events = fs.readdirSync(`./events`).filter((file) => file.endsWith('.js'));

for (const file of events) {
    const event = require(`./events/${file}`);
    if (event.once) {
        client.once(event.name, (args) => event.execute(args, client));
    } else {
        client.on(event.name, (args) => event.execute(args, client));
    }
};

client.login(token).catch(() => { console.log('Invalid TOKEN!') });