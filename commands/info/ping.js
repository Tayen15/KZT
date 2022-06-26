const { MessageEmbed } = require('discord.js'); 

module.exports = {
    name: "ping",
    description: "Display the bot latency.",
    aliases: [],
    category: "info",
    usage: "{prefix}ping",
    execute(client, message) {

        const embed = {
            description: `:stopwatch: ${Date.now() - message.createdTimestamp}ms\n:satellite: ${Math.round(client.ws.ping)}ms`,
            timestamp: new Date(),
        };
        message.channel.send({ embeds: [embed] });
    },
};