const { SlashCommandBuilder } = require('@discordjs/builders');
const { TextChannel, NewsChannel, DMChannel } = require('discord.js');

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
                    if (channel instanceof TextChannel || channel instanceof NewsChannel || channel instanceof DMChannel) {
                         await channel.send(message);
                    } else {
                         await interaction.followUp(`Channel with ID ${channelId} is not a text, announcement, or DM channel.`);
                    }
               } catch (error) {
                    try {
                         // If channel fetch fails, try to send DM to user
                         const user = await interaction.client.users.fetch(channelId);
                         await user.send(message);
                    } catch (dmError) {
                         await interaction.followUp(`Failed to send message to ${channelId}: ${error.message}`);
                    }
               }
          }

          await interaction.reply(`Sent the message to ${channelIds.length} channels/users.`);
     },
};
