const { MessageEmbed, SlashCommandBuilder } = require('discord.js')

module.exports = {
    data: new SlashCommandBuilder()
        .setName("reload")
        .setDescription("Reloads a specific file or command"),
    name: 'reload',
    description: 'Reloads a specific file or command',
    aliases: ['r'],
    category: 'dev',
    execute(client, message, args) {
        if(!args[0]) return message.channel.send('Please include the command you want to reload').then(message => message.delete({ timeout:5000 }));
        let commandName = args[0].toLowerCase();

        let directory;
        try {
            delete require.cache[require.resolve(`../info/${commandName}.js`)];
            directory = "info";
        } catch {
            try {
                delete require.cache[require.resolve(`../music/${commandName}.js`)];
                directory = "music";
            } catch {
                try {
                    delete require.cache[require.resolve(`../core/${commandName}.js`)];
                    directory = "core";
                } catch {
                    try {
                        delete require.cache[require.resolve(`../dev/${commandName}.js`)];
                        directory = "dev";
                    } catch {
                        return message.channel.send('The command was not found!');
                    }
                }
            }
        }

        client.commands.delete(commandName);
        const pull = require(`../${directory}/${commandName}.js`);
        client.commands.set(commandName, pull);
        message.channel.send(`Command \**${args[0].toUpperCase()}\** has been reloaded.`);
        console.log(`Command: ${args[0].toUpperCase()} Reload By: ${message.author.id}`);
    }
}