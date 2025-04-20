const { SlashCommandBuilder, PermissionFlagsBits, ChannelType, EmbedBuilder, MessageFlags } = require('discord.js');

module.exports = {
     data: new SlashCommandBuilder()
          .setName('clear')
          .setDescription('Deletes a number of messages from the channel.')
          .addIntegerOption(option =>
               option.setName('amount')
                    .setDescription('The number of messages to delete (max 100)')
                    .setRequired(true)
          )
          .addUserOption(option =>
               option.setName('user')
                    .setDescription('(Optional) Only delete messages from this user')
          )
          .addChannelOption(option =>
               option.setName('channel')
                    .setDescription('(Optional) Target channel')
                    .addChannelTypes(ChannelType.GuildText)
          )
          .setDefaultMemberPermissions(PermissionFlagsBits.ManageMessages),

     name: "clear",
     category: "moderation",
     options: [
          { name: 'amount', type: 'INTEGER', required: true, description: 'The number of messages to delete (max 100)' },
          { name: 'user', type: 'USER', required: false, description: '(Optional) Only delete messages from this user' },
          { name: 'channel', type: 'CHANNEL', required: false, description: '(Optional) Target channel' }
     ],
     async execute(client, interaction) {
          const amount = interaction.options.getInteger('amount');
          const user = interaction.options.getUser('user');
          const channel = interaction.options.getChannel('channel') || interaction.channel;

          if (amount < 1 || amount > 100) {
               return interaction.reply({ content: 'The number of messages must be between 1-100.', flags: MessageFlags.Ephemeral });
          }

          await interaction.deferReply({ flags: MessageFlags.Ephemeral });

          try {
               const messages = await channel.messages.fetch({ limit: 100 });
               let filtered = messages;

               if (user) {
                    filtered = messages.filter(msg => msg.author.id === user.id);
               }

               const toDelete = filtered
                    .filter(msg => (Date.now() - msg.createdTimestamp) < 14 * 24 * 60 * 60 * 1000)
                    .first(amount);

               await channel.bulkDelete(toDelete, true);

                  const successEmbed = new EmbedBuilder()
                         .setColor('Green')
                         .setDescription(`🗑 Successfully deleted ${toDelete.length} message(s)${user ? ` from ${user.username}` : ''}${channel.id !== interaction.channel.id ? ` in <#${channel.id}>` : ''}.`);

                  await interaction.editReply({ embeds: [successEmbed] });
          } catch (err) {
               console.error(err);
               await interaction.editReply('❌ Failed to delete messages. Make sure the bot has sufficient permissions.');
          }
     }
};
