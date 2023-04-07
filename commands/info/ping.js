const { MessageEmbed, SlashCommandBuilder } = require('discord.js'); 

module.exports = {
    data: new SlashCommandBuilder()
        .setName("ping")
        .setDescription("Display the bot latency"),
    name: "ping",
    description: "Display the bot latency.",
    aliases: [],
    category: "info",
    usage: "{prefix}ping",
    cooldown: 5,
    async execute(client, message, interaction) {

        const embed = {
            description: `:stopwatch: ${Date.now() - message.createdTimestamp}ms\n:satellite: ${Math.round(client.ws.ping)}ms`,
            timestamp: new Date(),
        };
        message.channel.send({ embeds: [embed]} ); 
    },
};