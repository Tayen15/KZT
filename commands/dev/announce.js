const { SlashCommandBuilder } = require('@discordjs/builders');
const { TextChannel } = require('discord.js');

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
     )
     .setDefaultMemberPermissions([
          {
               id: '746598982049988619',
               type: 'USER',
               permission: true
          }
     ]),
     name: 'announce',
     description: 'Send multiple messages to channel ID',
     aliases: ['an'],
     category: 'dev',
     async execute(interaction) {
     const channelIds = interaction.options.getString('channels').split(','); // Mendapatkan list channel ID dari argumen "channels"
     const message = interaction.options.getString('message'); // Mendapatkan pesan dari argumen "message"

     channelIds.forEach(async channelId => {
          const channel = await interaction.client.channels.fetch(channelId);
          if (channel instanceof TextChannel) {
          await channel.send(message);
          } else {
          console.log(`Channel with ID ${channelId} is not a text channel.`);
          }
     });

     await interaction.reply(`Sent the message to ${channelIds.length} channels.`);
     },
};
