const { SlashCommandBuilder } = require('discord.js');
const wait = require('node:timers/promises').setTimeout;

module.exports = {
     data: new SlashCommandBuilder()
          .setName("test")
          .setDescription("Testing Command"),
     async execute(interaction) {
          await interaction.reply("Testing in Here");
          await wait(3000);
          await interaction.editReply("Testing 2 edit");
     }
};