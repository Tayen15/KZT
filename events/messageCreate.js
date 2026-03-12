const { prefix } = require('../config');
const ownerID = process.env.OWNER_ID;
const { Events } = require('discord.js');

module.exports = {
    name: Events.MessageCreate,
    once: false,
    execute(message, client) {

        if (!message.content.startsWith(prefix) || message.author.bot) return;

        const args = message.content.slice(prefix.length).trim().split(/ +/g);
        const command = args.shift().toLowerCase();

        const cmd = client.commands.get(command) || client.commands.find((cmd) => cmd.aliases && cmd.aliases.includes(command));

        if (!cmd) return;

        const commandName = cmd.name.toLowerCase();

        if (cmd.ownerOnly) {
            if (message.author.id !== ownerID) return
            message.channel.send("You dont have permissions to use this command!");
        }

        try {
            cmd.execute(client, message, args);
            client.CommandsRan++;
        }
        catch (err) {
            console.log(err);
            message.reply('An error occurred while executing the command!');
        } finally {
            console.log(`User: ${message.author.tag} | command: ${commandName} | guild: ${message.guild.id}`);
        };
    },
};