const { SlashCommandBuilder } = require('discord.js');

module.exports = {
     data: new SlashCommandBuilder()
          .setName("test")
          .setDescription("Testing Command"),
     async execute(interaction) {
          await interaction.reply("Testing in Here");
     }
};