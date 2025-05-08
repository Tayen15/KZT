const { SlashCommandBuilder } = require('@discordjs/builders');
const { MessageFlags } = require('discord.js');

module.exports = {
     data: new SlashCommandBuilder()
          .setName('dm')
          .setDescription('Send a DM to a user by ID')
          .addStringOption(option =>
               option.setName('user_id')
                    .setDescription('The ID of the user to DM')
                    .setRequired(true)
          )
          .addStringOption(option =>
               option.setName('message')
                    .setDescription('The message to send')
                    .setRequired(true)
          ),
     name: 'dm',
     aliases: ['directmessage'],
     category: 'dev',
     ownerOnly: true,
     options: [
          { name: 'user_id', type: 'STRING', required: true, description: 'The ID of the user to DM' },
          { name: 'message', type: 'STRING', required: true, description: 'The message to send' }
     ],
     async execute(client, interaction) {
          const userIds = interaction.options.getString('user_id').split(',').map(id => id.trim());
          const message = interaction.options.getString('message');
          let successCount = 0;
          let failCount = 0;

          for (const userId of userIds) {
               try {
                    const user = await client.users.fetch(userId);
                    await user.send(message);
                    successCount++;
               } catch (error) {
                    failCount++;
                    await interaction.followUp({
                         content: `Failed to send DM to user ${userId}: ${error.message}`,
                         flags: MessageFlags.Ephemeral
                    });
               }
          }

          await interaction.reply({
               content: `DM sending completed. Successfully sent to ${successCount} users. Failed to send to ${failCount} users.`,
               ephemeral: true
          });
     },
};