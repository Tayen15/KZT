const { SlashCommandBuilder, PermissionFlagsBits, MessageFlags, EmbedBuilder } = require('discord.js');

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
     async execute(interaction) {
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
               const embed = new EmbedBuilder()
                    .setColor('#FF0000')
                    .setTitle('User Kicked')
                    .setDescription(`Successfully kicked ${target.user.tag}`)
                    .addFields(
                         { name: 'Reason', value: reason, inline: true },
                         { name: 'Kicked by', value: interaction.user.tag, inline: true }
                    )
                    .setTimestamp();
               
               await interaction.reply({ embeds: [embed]});
          } catch (error) {
               await interaction.reply({
                    content: 'There was an error while kicking the member!',
                    flags: MessageFlags.Ephemeral
               });
          }
     }
};