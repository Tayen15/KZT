const { SlashCommandBuilder, MessageFlags, EmbedBuilder } = require('discord.js');
const { getVoiceConnection } = require('@discordjs/voice');
const { removeLofiSession } = require('../../utils/lofiStorage');

module.exports = {
     data: new SlashCommandBuilder()
          .setName('stoplofi')
          .setDescription('Stop playing lofi and leave the voice channel'),
     name: 'stoplofi',
     category: 'music',
     async execute(interaction) {
          const guildId = interaction.guild.id;
          const connection = getVoiceConnection(guildId);

          if (!connection) {
               return interaction.reply({ content: '❌ The bot is not in a voice channel.', flags: MessageFlags.Ephemeral });
          }

          // Stop the lofi session
          removeLofiSession(guildId);

          // Disconnect from the voice channel
          connection.destroy();

            const embed = new EmbedBuilder()
                  .setColor(0xff0000)
                  .setTitle('Lofi Stopped')
                  .setDescription('⛔ Lofi stopped and the bot has left the voice channel.');

            await interaction.reply({ embeds: [embed] });
     }
};
