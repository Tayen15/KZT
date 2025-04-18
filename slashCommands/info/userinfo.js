const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');

module.exports = {
     data: new SlashCommandBuilder()
          .setName('userinfo')
          .setDescription('Displays information about a user')
          .addUserOption(option =>
               option.setName('target')
                    .setDescription('Select a user')
                    .setRequired(false)
          ),
     name: 'userinfo',
     category: 'info',
     async execute(client, interaction) {
          const user = interaction.options.getUser('target') || interaction.user;
          const member = await interaction.guild.members.fetch(user.id);

          const createdAt = `<t:${Math.floor(user.createdTimestamp / 1000)}:F>`;
          const joinedAt = `<t:${Math.floor(member.joinedTimestamp / 1000)}:F>`;
          const roles = member.roles.cache
               .filter(role => role.id !== interaction.guild.id)
               .map(role => `<@&${role.id}>`)
               .join(', ') || 'None';

          const embed = new EmbedBuilder()
               .setTitle('👤 User Information')
               .setThumbnail(user.displayAvatarURL({ dynamic: true }))
               .setColor(0x3498DB)
               .addFields(
                    { name: '🆔 User ID', value: user.id, inline: true },
                    { name: '📛 Username', value: `${user.tag}`, inline: true },
                    { name: '📆 Account Created', value: createdAt, inline: false },
                    { name: '📥 Joined Server', value: joinedAt, inline: false },
                    { name: '🎭 Roles', value: roles, inline: false },
                    { name: '🤖 Bot?', value: user.bot ? 'Yes' : 'No', inline: true }
               )
               .setFooter({ text: `Requested by ${interaction.user.tag}`, iconURL: interaction.user.displayAvatarURL() })
               .setTimestamp();

          await interaction.reply({ embeds: [embed] });
     }
};
