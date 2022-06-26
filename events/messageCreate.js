const discord = require('discord.js')
const cooldowns = new discord.Collection();

const { prefix } = require('../config');

module.exports = {
    name: "messageCreate",
    once: false,
    execute(message, client) {

        if (!message.content.startsWith(prefix) || message.author.bot) return;

        const args = message.content.slice(prefix.length).trim().split(/ +/g);
        const command = args.shift().toLowerCase();

        const cmd = client.commands.get(command) || client.commands.find((x) => x.aliases && x.aliases(command));

        if (!cmd) return;

        if (!client.cooldowns.has(command.name)) {
            client.cooldowns.set(command.name, new discord.Collection());
        }

        let now = Date.now();
        let timeStamp = client.cooldowns.get(command.name);
        let cool = command.cooldown || 5;
        let userCool = timeStamp.get(message.author.id) || 0;
        let estimated = userCool + cool * 1000 - now;

        if (userCool && estimated > 0) {
            return message.reply(`Please waith ${( estimated / 1000 ).toFixed()}second(s) before reusing the *${command.name}* command.`)
            .then(message => message.delete({ timeout: estimated }));
        }
        
        timeStamp.set(message.author.id, now);
        client.cooldowns.set(command.name, timeStamp);
        try {
            cmd.execute(client, message, args);
            client.CommandsRan++;
        }
        catch (e) {
            console.log(e);
            message.reply('An error occurred while executing the command!');
        } finally {
            console.log(`User: ${message.author.tag} | command: ${command.name}`);
        };
    },
};