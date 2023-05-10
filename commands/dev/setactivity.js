const { SlashCommandBuilder } = require('@discordjs/builders');
const { Permissions } = require('discord.js');

module.exports = {
     data: new SlashCommandBuilder()
          .setName('setactivity')
          .setDescription('Set the bot activity')
          .addStringOption(option =>
               option.setName('type')
                    .setDescription('The type of activity')
                    .setRequired(true)
                    .addChoice('Playing', 'PLAYING')
                    .addChoice('Streaming', 'STREAMING')
                    .addChoice('Listening', 'LISTENING')
                    .addChoice('Watching', 'WATCHING')
                    .addChoice('Competing', 'COMPETING')
          )
          .addStringOption(option =>
               option.setName('name')
                   .setDescription('The name of the activity')
                   .setRequired(true)
          ),
     name: 'setactivity',
     description: 'Set activity presence status',
     aliases: [''],
     category: 'dev',

     async execute(interaction) {
          if (!interaction.member.permissions.has(Permissions.FLAGS.ADMINISTRATOR)) {
               return interaction.reply('You do not have permission to use this command.');
          }

          const type = interaction.options.getString('type');
          const name = interaction.options.getString('name');

          try {
               await interaction.client.user.setPresence({
                   activities: [{ name: name, type: type }]
               });
               await interaction.reply({ content: `Activity set to ${type} ${name}.`, ephemeral: true });
          } catch (error) {
               console.error(error);
               await interaction.reply({ content: 'Failed to set activity.', ephemeral: true });
          }
     },
};
