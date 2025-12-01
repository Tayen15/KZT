const { EmbedBuilder, SlashCommandBuilder, MessageFlags } = require('discord.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName("ping")
        .setDescription("Display the bot latency"),
    name: "ping",
    description: "Display the bot latency.",
    category: "info",
    async execute(interaction) {
        const sent = await interaction.deferReply({ fetchReply: true });

        const pingEmbed = new EmbedBuilder()
            .setColor("Random")
            .setTitle("🏓 Pong!")
            .setDescription([
                `:stopwatch: **Response latency**: \`${sent.createdTimestamp - interaction.createdTimestamp}ms\``,
                `:satellite: **WebSocket ping**: \`${Math.round(interaction.client.ws.ping)}ms\``
            ].join('\n'))
            .setTimestamp();

        await interaction.editReply({ embeds: [pingEmbed], flags: MessageFlags.Ephemeral });
    },
};
