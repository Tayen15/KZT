const { SlashCommandBuilder, MessageFlags } = require('discord.js');

module.exports = {
     data: new SlashCommandBuilder()
          .setName('ban')
          .setDescription('Ban a user from the server'),
     name: "ban",
     category: "moderation",
     usage: "",
     async execute(client, interaction) {
          await interaction.reply({ content: 'Coming Soon!', flags: MessageFlags.Ephemeral });
     }
}