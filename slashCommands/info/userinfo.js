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
     async execute(interaction) {
          const user = interaction.options.getUser('target') || interaction.user;
          const member = await interaction.guild.members.fetch(user.id);

          const createdAt = `<t:${Math.floor(user.createdTimestamp / 1000)}:F>`;
          const joinedAt = `<t:${Math.floor(member.joinedTimestamp / 1000)}:F>`;
          const roles = member.roles.cache
               .filter(role => role.id !== interaction.guild.id)
               .map(role => `<@&${role.id}>`)
               .join(', ') || 'None';

          const embed = new EmbedBuilder()
               .setTitle('User Information')
               .setThumbnail(user.displayAvatarURL({ dynamic: true }))
               .setColor(0x3498DB)
               .addFields(
                    { name: 'Details', value: `- User ID: ${user.id}\n- Username: ${user.tag}\n- Display Name: ${member.displayName}\n- Account Created: ${createdAt}\n- Joined Server: ${joinedAt}\n- Roles: ${roles}\n- Bot: ${user.bot ? 'Yes' : 'No'}\n- Avatar URL: [Click Here](${user.displayAvatarURL({ dynamic: true })})`, inline: false }
               )
               .setFooter({ text: `Requested by ${interaction.user.tag}`, iconURL: interaction.user.displayAvatarURL() })
               .setTimestamp();

          await interaction.reply({ embeds: [embed] });
     }
};
