const { SlashCommandBuilder } = require('discord.js');
const { ownerOnly } = require('./help');
const wait = require('node:timers/promises').setTimeout;

module.exports = {
     data: new SlashCommandBuilder()
          .setName("test")
          .setDescription("Testing Command"),
     name: "test",
     ownerOnly: true,
     category: "test",
     async execute(interaction) {
          await interaction.reply("Testing in Here");
          await wait(3000);
          await interaction.editReply("Testing 2 edit");
     }
};