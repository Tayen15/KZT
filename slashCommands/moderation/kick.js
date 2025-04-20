const { SlashCommandBuilder, MessageFlags } = require('discord.js');

module.exports = {
     data: new SlashCommandBuilder()
          .setName('kick')
          .setDescription('Kick a user from the server'),
     name: "kick",
     category: "moderation",
     async execute(client, interaction) {
          await interaction.reply({ content: 'Coming Soon!', flags: MessageFlags.Ephemeral });
     }   
}