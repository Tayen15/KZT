const { SlashCommandBuilder, PermissionFlagsBits, MessageFlags } = require('discord.js');

module.exports = {
     data: new SlashCommandBuilder()
          .setName('kick')
          .setDescription('Kick a user from the server')
          .addUserOption(option =>
               option.setName('target')
                    .setDescription('The member to kick')
                    .setRequired(true))
          .addStringOption(option =>
               option.setName('reason')
                    .setDescription('The reason for kicking'))
          .setDefaultMemberPermissions(PermissionFlagsBits.KickMembers),
     
     category: "moderation",
     requiredPermissions: [PermissionFlagsBits.KickMembers],
     options: [
          { name: 'target', type: 'USER', required: true, description: 'The member to kick' },
          { name: 'reason', type: 'STRING', required: false, description: 'The reason for kicking' }
     ],
     async execute(client, interaction) {
          const target = interaction.options.getMember('target');
          const reason = interaction.options.getString('reason') ?? 'No reason provided';

          // Check if the target is kickable
          if (!target.kickable) {
               return interaction.reply({ 
                    content: 'I cannot kick this user! They may have higher roles than me.',
                    flags: MessageFlags.Ephemeral 
               });
          }

          try {
               await target.kick(reason);
               await interaction.reply({
                    content: `Successfully kicked ${target.user.tag} for reason: ${reason}`,
                    flags: MessageFlags.Ephemeral
               });
          } catch (error) {
               await interaction.reply({
                    content: 'There was an error while kicking the member!',
                    flags: MessageFlags.Ephemeral
               });
          }
     }
};