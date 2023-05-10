const { SlashCommandBuilder } = require('@discordjs/builders');
const { PermissionsBitField } = require('discord.js');

module.exports = {
     data: new SlashCommandBuilder()
     .setName('setactivity')
     .setDescription('Set the bot activity')
     .addStringOption(option =>
          option
          .setName('type')
          .setDescription('The type of activity')
          .setRequired(true)
          .addChoices(
               { name: 'Playing', value: 'PLAYING'},
               { name: 'Streaming', value: 'STREAMING'},
               { name: 'Listening', value: 'LISTENING'},
               { name: 'Watching', value: 'WATCHING'},
               { name: 'Competing', value: 'COMPETING'}
          )
     )
     .addStringOption(option =>
          option
          .setName('name')
          .setDescription('The name of the activity')
          .setRequired(true)
     ),
     name: 'setactivity',
     category: 'dev',

     async execute(interaction) {
          if (!interaction.member.permissions.has(PermissionsBitField.Flags.Administrator)) {
               return interaction.reply('You do not have permission to use this command.');
          }     

          const type = interaction.options.getString('type', true);
          const name = interaction.options.getString('name', true);

          try {
               await interaction.client.user.setActivity(name, { type });
               await interaction.reply({ content: `Activity set to ${type} ${name}.`, ephemeral: true });
          } catch (error) {
               console.error(error);
               await interaction.reply({ content: 'Failed to set activity.', ephemeral: true });
          }
     },
};
