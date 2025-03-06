const { EmbedBuilder, SlashCommandBuilder } = require('discord.js'); 

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
    async execute(client, interaction) {

        const pingEmbed = new EmbedBuilder()
            .setDescription(`:stopwatch: ${Date.now() - interaction.createdTimestamp}ms\n:satellite: ${Math.round(interaction.client.ws.ping)}ms`)
            .setTimestamp();
        await interaction.reply({ embeds: [pingEmbed] });
    },
};