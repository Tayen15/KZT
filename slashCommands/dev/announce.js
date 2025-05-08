const { SlashCommandBuilder } = require('@discordjs/builders');
const { TextChannel, NewsChannel } = require('discord.js');

module.exports = {
     data: new SlashCommandBuilder()
          .setName('announce')
          .setDescription('Send multiple messages to channel ID')
          .addStringOption(option =>
               option.setName('channels')
                    .setDescription('List of channel IDs')
                    .setRequired(true)
          )
          .addStringOption(option =>
               option.setName('message')
                    .setDescription('The message to send')
                    .setRequired(true)
          ),
     name: 'announce',
     aliases: ['an'],
     category: 'dev',
     ownerOnly: true,
     options: [
          { name: 'channels', type: 'STRING', required: true, description: 'List of channel IDs' },
          { name: 'message', type: 'STRING', required: true, description: 'The message to send' }
     ],
     async execute(client, interaction) {
          const channelIds = interaction.options.getString('channels').split(',');
          const message = interaction.options.getString('message');
          
          for (const channelId of channelIds) {
               try {
                    const channel = await interaction.client.channels.fetch(channelId);
                    if (channel instanceof TextChannel || channel instanceof NewsChannel) {
                         await channel.send(message);
                    } else {
                         await interaction.followUp(`Channel with ID ${channelId} is not a text or announcement channel.`);
                    }
               } catch (error) {
                    await interaction.followUp(`Failed to send message to channel ${channelId}: ${error.message}`);
               }
          }

          await interaction.reply(`Sent the message to ${channelIds.length} channels.`);
     },
};
