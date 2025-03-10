const { SlashCommandBuilder, MessageFlags } = require('discord.js');

module.exports = {
     data: new SlashCommandBuilder()
          .setName('clear')
          .setDescription('Clear messages from a channel'),
     name: "clear",
     category: "moderation",
     usage: "",
     async execute(client, interaction) {
          await interaction.reply({ content: 'Coming Soon!', flags: MessageFlags.Ephemeral });
     }
}