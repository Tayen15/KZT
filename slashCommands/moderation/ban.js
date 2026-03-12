const { SlashCommandBuilder, MessageFlags } = require('discord.js');

module.exports = {
     data: new SlashCommandBuilder()
          .setName('ban')
          .setDescription('Ban a user from the server'),
     name: "ban",
     category: "moderation",
     async execute(interaction) {
          await interaction.reply({ content: 'Coming Soon!', flags: MessageFlags.Ephemeral });
     }
}