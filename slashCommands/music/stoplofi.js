const { SlashCommandBuilder, MessageFlags } = require('discord.js');
const { getVoiceConnection } = require('@discordjs/voice');
const { removeLofiSession } = require('../utils/lofiStorage');

module.exports = {
     data: new SlashCommandBuilder()
          .setName('stoplofi')
          .setDescription('Stop playing lofi and leave the voice channel'),
     name: 'lofi',
     category: 'music',
     async execute(client, interaction) {
          const guildId = interaction.guild.id;
          const connection = getVoiceConnection(guildId);

          if (!connection) {
               return interaction.reply({ content: '❌ The bot is not in a voice channel.', flags: MessageFlags.Ephemeral });
          }

          // Stop the lofi session
          removeLofiSession(guildId);

          // Disconnect from the voice channel
          connection.destroy();

          await interaction.reply('⛔ Lofi stopped and the bot has left the voice channel.');
     }
};
