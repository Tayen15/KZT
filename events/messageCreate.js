const { prefix, ownerID } = require('../config')

module.exports = {
    name: "messageCreate",
    once: false,
    execute(message, client) {

        if (!message.content.startsWith(prefix) || message.author.bot) return;

        const args = message.content.slice(prefix.length).trim().split(/ +/g);
        const command = args.shift().toLowerCase();

        const cmd = client.commands.get(command) || client.commands.find((x) => x.aliases && x.aliases(command));

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
        catch (e) {
            console.log(e);
            message.reply('An error occurred while executing the command!');
        } finally {
            console.log(`User: ${message.author.tag} | command: ${commandName} | guild: ${message.guild.id}`);
        };
    },
};